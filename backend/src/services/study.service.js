// backend/src/services/study.service.js
const { PrismaClient } = require('@prisma/client');
const srsService = require('./srs.service');

const prisma = new PrismaClient();

class StudyService {
  async startStudySession(userId, deckId) {
    const deck = await prisma.deck.findFirst({
      where: { id: deckId, userId, isArchived: false },
      include: { _count: { select: { flashcards: true } } }
    });

    if (!deck) throw new AppError('Không tìm thấy bộ thẻ', 404);

    const now = new Date();
    const isCramMode = deck.examDate && 
      Math.ceil((new Date(deck.examDate) - now) / (1000 * 60 * 60 * 24)) <= 7;

    const cards = await prisma.flashcard.findMany({
      where: {
        deckId,
        OR: [
          { nextReview: { lte: now } },
          { repetitions: 0 }
        ]
      },
      orderBy: [{ nextReview: 'asc' }, { easeFactor: 'asc' }]
    });

    return {
      deck: {
        id: deck.id,
        name: deck.name,
        color: deck.color,
        isCramMode,
        examDate: deck.examDate
      },
      cards,
      session: {
        totalCards: cards.length,
        newCards: cards.filter(c => c.repetitions === 0).length,
        dueCards: cards.filter(c => c.nextReview <= now).length
      }
    };
  }

  async reviewCard(userId, cardId, quality) {
    if (![0, 1, 3, 5].includes(quality)) {
      throw new AppError('Đánh giá không hợp lệ', 400);
    }

    const card = await prisma.flashcard.findUnique({
      where: { id: cardId },
      include: { deck: true }
    });

    if (!card) throw new AppError('Không tìm thấy thẻ', 404);
    if (card.deck.userId !== userId) throw new AppError('Không có quyền', 403);

    const isCramMode = card.deck.examDate && 
      Math.ceil((new Date(card.deck.examDate) - new Date()) / (1000 * 60 * 60 * 24)) <= 7;

    const newState = srsService.calculate(card, quality, { isCramMode });

    const [updatedCard] = await prisma.$transaction([
      prisma.flashcard.update({
        where: { id: cardId },
        data: {
          easeFactor: newState.easeFactor,
          interval: newState.interval,
          repetitions: newState.repetitions,
          nextReview: newState.nextReview,
          lastReview: new Date(),
          difficulty: quality <= 1 ? 'HARD' : quality === 3 ? 'MEDIUM' : 'EASY',
          totalReviews: { increment: 1 },
          correctCount: quality >= 3 ? { increment: 1 } : undefined,
          incorrectCount: quality < 3 ? { increment: 1 } : undefined,
        }
      }),
      prisma.review.create({
        data: {
          userId,
          cardId,
          quality,
          easeFactor: newState.easeFactor,
          interval: newState.interval,
          nextReview: newState.nextReview,
          reviewedAt: new Date(),
        }
      }),
      prisma.deck.update({
        where: { id: card.deckId },
        data: { lastStudied: new Date() }
      })
    ]);

    await this.updateDailyStats(userId, quality);
    await this.updateStreak(userId);

    return {
      card: updatedCard,
      nextReview: newState.nextReview,
      message: this.getFeedback(quality)
    };
  }

  async updateDailyStats(userId, quality) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyStats.upsert({
      where: { userId_date: { userId, date: today } },
      create: {
        userId,
        date: today,
        cardsStudied: 1,
        cardsLearned: quality >= 3 ? 1 : 0,
        reviewsCompleted: 1,
        retentionRate: quality >= 3 ? 100 : 0
      },
      update: {
        cardsStudied: { increment: 1 },
        cardsLearned: quality >= 3 ? { increment: 1 } : undefined,
        reviewsCompleted: { increment: 1 },
        retentionRate: {
          set: await this.calculateRetention(userId, today)
        }
      }
    });
  }

  async calculateRetention(userId, date) {
    const stats = await prisma.dailyStats.findUnique({
      where: { userId_date: { userId, date } }
    });
    if (!stats || stats.cardsStudied === 0) return 0;
    return Math.round((stats.cardsLearned / stats.cardsStudied) * 100);
  }

  async updateStreak(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayStats = await prisma.dailyStats.findUnique({
      where: { userId_date: { userId, date: yesterday } }
    });

    const progress = await prisma.studyProgress.findFirst({ where: { userId } });
    let streak = yesterdayStats ? (progress?.currentStreak || 0) + 1 : 1;

    await prisma.studyProgress.upsert({
      where: { userId_deckId: { userId, deckId: 'global' } },
      create: {
        userId,
        deckId: 'global',
        currentStreak: streak,
        longestStreak: streak,
        lastStudyDate: new Date()
      },
      update: {
        currentStreak: streak,
        longestStreak: Math.max(streak, progress?.longestStreak || 0),
        lastStudyDate: new Date()
      }
    });
  }

  async getStudyStats(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const [todayStats, weeklyStats, progress, dueCards, allTime] = await Promise.all([
      prisma.dailyStats.findUnique({ where: { userId_date: { userId, date: today } } }),
      prisma.dailyStats.findMany({
        where: { userId, date: { gte: weekStart } },
        orderBy: { date: 'asc' }
      }),
      prisma.studyProgress.findFirst({ where: { userId } }),
      prisma.flashcard.count({
        where: { deck: { userId }, nextReview: { lte: new Date() } }
      }),
      prisma.review.aggregate({
        where: { userId },
        _count: true,
        _avg: { quality: true }
      })
    ]);

    return {
      today: todayStats || { cardsStudied: 0, cardsLearned: 0, reviewsCompleted: 0 },
      weekly: weeklyStats,
      streak: {
        current: progress?.currentStreak || 0,
        longest: progress?.longestStreak || 0
      },
      dueCards,
      allTime: {
        totalReviews: allTime._count,
        averageQuality: Math.round((allTime._avg.quality || 0) * 10) / 10
      }
    };
  }

  async getDeckProgress(userId, deckId) {
    const progress = await prisma.studyProgress.findUnique({
      where: { userId_deckId: { userId, deckId } }
    });
    const cards = await prisma.flashcard.findMany({ where: { deckId } });
    return {
      progress: progress || { cardsStudied: 0, cardsLearned: 0 },
      cards: {
        total: cards.length,
        new: cards.filter(c => c.repetitions === 0).length,
        learning: cards.filter(c => c.repetitions > 0 && c.interval < 21).length,
        mastered: cards.filter(c => c.interval >= 21).length
      }
    };
  }

  async getDueCards(userId) {
    return prisma.flashcard.findMany({
      where: { deck: { userId }, nextReview: { lte: new Date() } },
      include: { deck: { select: { name: true, color: true } } },
      orderBy: { nextReview: 'asc' }
    });
  }

  async saveFlashcards(deckId, userId, flashcards) {
    const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
    if (!deck) throw new AppError('Không tìm thấy bộ thẻ', 404);

    const created = await prisma.$transaction(
      flashcards.map(card =>
        prisma.flashcard.create({
          data: {
            deckId,
            frontText: card.frontText || card.question,
            backText: card.backText || card.answer,
            hint: card.hint || '',
            difficulty: card.difficulty || 'MEDIUM',
            isAiGenerated: true,
            nextReview: new Date()
          }
        })
      )
    );

    await prisma.deck.update({
      where: { id: deckId },
      data: { cardCount: { increment: created.length } }
    });

    return created;
  }

  async getDeckCards(deckId, userId) {
    const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
    if (!deck) throw new AppError('Không tìm thấy bộ thẻ', 404);
    return prisma.flashcard.findMany({ where: { deckId } });
  }

  getFeedback(quality) {
    const messages = {
      0: 'Đừng lo, lần sau sẽ tốt hơn! 💪',
      1: 'Cố gắng lên, bạn sắp nhớ được rồi! 📚',
      3: 'Tốt lắm! Tiếp tục phát huy nhé! ⭐',
      5: 'Xuất sắc! Bạn đang tiến bộ rất nhanh! 🚀'
    };
    return messages[quality] || 'Cảm ơn bạn đã ôn tập!';
  }
}

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = new StudyService();