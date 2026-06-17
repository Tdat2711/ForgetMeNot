// backend/src/services/stats.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class StatsService {
  async getDashboardStats(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      todayStats,
      totalCards,
      totalDecks,
      streak,
      dueCards,
      weeklyStats
    ] = await Promise.all([
      // Hôm nay
      prisma.dailyStats.findUnique({
        where: { userId_date: { userId, date: today } }
      }),
      
      // Tổng số thẻ
      prisma.flashcard.count({
        where: { deck: { userId } }
      }),
      
      // Tổng số bộ thẻ
      prisma.deck.count({
        where: { userId, isArchived: false }
      }),
      
      // Chuỗi ngày học
      prisma.studyProgress.findFirst({
        where: { userId },
        select: {
          currentStreak: true,
          longestStreak: true
        }
      }),
      
      // Thẻ đến hạn
      prisma.flashcard.count({
        where: {
          deck: { userId },
          nextReview: { lte: new Date() }
        }
      }),
      
      // Thống kê 7 ngày
      prisma.dailyStats.findMany({
        where: {
          userId,
          date: { gte: weekStart }
        },
        orderBy: { date: 'asc' }
      })
    ]);

    return {
      today: {
        cardsStudied: todayStats?.cardsStudied || 0,
        cardsLearned: todayStats?.cardsLearned || 0,
        reviewsCompleted: todayStats?.reviewsCompleted || 0,
        studyTime: todayStats?.studyTimeMinutes || 0
      },
      totals: {
        cards: totalCards,
        decks: totalDecks,
        dueCards
      },
      streak: {
        current: streak?.currentStreak || 0,
        longest: streak?.longestStreak || 0
      },
      weekly: weeklyStats,
      motivation: this.getMotivationMessage(streak?.currentStreak || 0)
    };
  }

  async getWeeklyStats(userId) {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const stats = await prisma.dailyStats.findMany({
      where: {
        userId,
        date: { gte: weekStart }
      },
      orderBy: { date: 'asc' }
    });

    // Fill missing days with zero
    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      
      const existing = stats.find(s => 
        s.date.toDateString() === date.toDateString()
      );

      result.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
        cardsStudied: existing?.cardsStudied || 0,
        cardsLearned: existing?.cardsLearned || 0,
        reviewsCompleted: existing?.reviewsCompleted || 0
      });
    }

    return result;
  }

  async getMonthlyStats(userId) {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const stats = await prisma.review.aggregate({
      where: {
        userId,
        reviewedAt: { gte: monthStart }
      },
      _count: true,
      _avg: { quality: true }
    });

    const dailyStats = await prisma.dailyStats.findMany({
      where: {
        userId,
        date: { gte: monthStart }
      },
      orderBy: { date: 'asc' }
    });

    return {
      totalReviews: stats._count,
      averageQuality: Math.round((stats._avg.quality || 0) * 10) / 10,
      totalCardsLearned: dailyStats.reduce((sum, d) => sum + d.cardsLearned, 0),
      dailyBreakdown: dailyStats
    };
  }

  async getDeckPerformance(userId) {
    const decks = await prisma.deck.findMany({
      where: {
        userId,
        isArchived: false
      },
      include: {
        _count: {
          select: { flashcards: true }
        },
        flashcards: {
          select: {
            totalReviews: true,
            correctCount: true,
            incorrectCount: true,
            easeFactor: true
          }
        }
      }
    });

    return decks.map(deck => {
      const totalReviews = deck.flashcards.reduce((sum, f) => sum + f.totalReviews, 0);
      const correctReviews = deck.flashcards.reduce((sum, f) => sum + f.correctCount, 0);
      const avgEase = deck.flashcards.length > 0
        ? deck.flashcards.reduce((sum, f) => sum + f.easeFactor, 0) / deck.flashcards.length
        : 2.5;

      return {
        id: deck.id,
        name: deck.name,
        color: deck.color,
        cardCount: deck._count.flashcards,
        totalReviews,
        retentionRate: totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0,
        averageEase: Math.round(avgEase * 100) / 100,
        lastStudied: deck.lastStudied,
        examDate: deck.examDate
      };
    }).sort((a, b) => b.totalReviews - a.totalReviews);
  }

  async getStreakInfo(userId) {
    const progress = await prisma.studyProgress.findMany({
      where: { userId },
      select: {
        deckId: true,
        currentStreak: true,
        longestStreak: true,
        lastStudyDate: true
      }
    });

    const maxStreak = Math.max(...progress.map(p => p.currentStreak || 0));
    const maxLongestStreak = Math.max(...progress.map(p => p.longestStreak || 0));

    return {
      currentStreak: maxStreak,
      longestStreak: maxLongestStreak,
      decksWithStreak: progress.filter(p => p.currentStreak > 0).length,
      nextMilestone: this.getNextMilestone(maxStreak)
    };
  }

  async getActivityLog(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const reviews = await prisma.review.findMany({
      where: {
        userId,
        reviewedAt: { gte: startDate }
      },
      orderBy: { reviewedAt: 'desc' },
      take: 50,
      include: {
        card: {
          select: {
            frontText: true,
            deck: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return reviews.map(review => ({
      id: review.id,
      date: review.reviewedAt,
      cardPreview: review.card.frontText.substring(0, 50) + '...',
      deckName: review.card.deck.name,
      quality: review.quality,
      qualityLabel: this.getQualityLabel(review.quality),
      timeSpent: review.timeSpent
    }));
  }

  getQualityLabel(quality) {
    const labels = {
      0: 'Quên',
      1: 'Khó',
      3: 'Tốt',
      5: 'Dễ'
    };
    return labels[quality] || 'Không xác định';
  }

  getMotivationMessage(streak) {
    if (streak >= 30) return 'Bạn là huyền thoại học tập! 🏆';
    if (streak >= 14) return 'Duy trì phong độ xuất sắc! ⭐';
    if (streak >= 7) return 'Một tuần liên tục! Tuyệt vời! 🔥';
    if (streak >= 3) return 'Bắt đầu có đà rồi đấy! 💪';
    if (streak >= 1) return 'Khởi đầu tốt! Tiếp tục nhé! 🌟';
    return 'Bắt đầu học ngay hôm nay! 📚';
  }

  getNextMilestone(streak) {
    const milestones = [3, 7, 14, 30, 60, 90, 180, 365];
    const next = milestones.find(m => m > streak);
    return next ? {
      target: next,
      remaining: next - streak,
      label: next === 3 ? '3 ngày' : next === 7 ? '1 tuần' : 
             next === 14 ? '2 tuần' : next === 30 ? '1 tháng' :
             next === 60 ? '2 tháng' : next === 90 ? '3 tháng' :
             next === 180 ? '6 tháng' : '1 năm'
    } : null;
  }
}

module.exports = new StatsService();