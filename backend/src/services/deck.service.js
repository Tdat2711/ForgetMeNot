// backend/src/services/deck.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class DeckService {
  async getAllDecks(userId, options = {}) {
    const { page = 1, limit = 20, search, sortBy = 'updatedAt', order = 'desc' } = options;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      isArchived: false,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } }
        ]
      })
    };

    const [decks, total] = await Promise.all([
      prisma.deck.findMany({
        where,
        include: {
          _count: {
            select: { flashcards: true }
          }
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit
      }),
      prisma.deck.count({ where })
    ]);

    return {
      decks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    };
  }

  async getFavoriteDecks(userId) {
    return prisma.deck.findMany({
      where: {
        userId,
        isFavorite: true,
        isArchived: false
      },
      include: {
        _count: {
          select: { flashcards: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getDeckById(deckId, userId) {
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId,
        isArchived: false
      },
      include: {
        _count: {
          select: { flashcards: true }
        },
        flashcards: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!deck) {
      throw new AppError('Không tìm thấy bộ thẻ', 404);
    }

    return deck;
  }

  async createDeck(userId, data) {
    const { name, description, color, icon, examDate } = data;

    return prisma.deck.create({
      data: {
        userId,
        name,
        description: description || '',
        color: color || '#3B82F6',
        icon: icon || '📚',
        examDate: examDate ? new Date(examDate) : null
      }
    });
  }

  async updateDeck(deckId, userId, data) {
    await this.checkDeckOwnership(deckId, userId);

    const allowedFields = ['name', 'description', 'color', 'icon', 'examDate', 'isPublic'];
    const updateData = {};
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = field === 'examDate' ? new Date(data[field]) : data[field];
      }
    }

    return prisma.deck.update({
      where: { id: deckId },
      data: updateData
    });
  }

  async deleteDeck(deckId, userId) {
    await this.checkDeckOwnership(deckId, userId);
    return prisma.deck.delete({ where: { id: deckId } });
  }

  async toggleFavorite(deckId, userId) {
    const deck = await this.checkDeckOwnership(deckId, userId);
    
    return prisma.deck.update({
      where: { id: deckId },
      data: { isFavorite: !deck.isFavorite }
    });
  }

  async toggleArchive(deckId, userId) {
    const deck = await this.checkDeckOwnership(deckId, userId);
    
    return prisma.deck.update({
      where: { id: deckId },
      data: { isArchived: !deck.isArchived }
    });
  }

  async getDeckFlashcards(deckId, userId) {
    await this.checkDeckOwnership(deckId, userId);
    
    return prisma.flashcard.findMany({
      where: { deckId },
      orderBy: [
        { nextReview: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async createFlashcard(deckId, userId, data) {
    await this.checkDeckOwnership(deckId, userId);
    
    const { frontText, backText, hint, difficulty } = data;

    const flashcard = await prisma.flashcard.create({
      data: {
        deckId,
        frontText,
        backText,
        hint: hint || '',
        difficulty: difficulty || 'MEDIUM',
        nextReview: new Date()
      }
    });

    // Update deck card count
    await prisma.deck.update({
      where: { id: deckId },
      data: { cardCount: { increment: 1 } }
    });

    return flashcard;
  }

  async checkDeckOwnership(deckId, userId) {
    const deck = await prisma.deck.findFirst({
      where: { id: deckId, userId }
    });
    
    if (!deck) {
      throw new AppError('Không tìm thấy bộ thẻ hoặc không có quyền truy cập', 404);
    }
    
    return deck;
  }
}

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = new DeckService();