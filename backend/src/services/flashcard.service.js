// backend/src/services/flashcard.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class FlashcardService {
  async getFlashcardById(cardId, userId) {
    const card = await prisma.flashcard.findFirst({
      where: { id: cardId },
      include: {
        deck: {
          select: {
            userId: true,
            name: true
          }
        }
      }
    });

    if (!card) {
      throw new AppError('Không tìm thấy thẻ', 404);
    }

    if (card.deck.userId !== userId) {
      throw new AppError('Không có quyền truy cập thẻ này', 403);
    }

    return card;
  }

  async updateFlashcard(cardId, userId, data) {
    await this.verifyOwnership(cardId, userId);

    const { frontText, backText, hint } = data;
    
    return prisma.flashcard.update({
      where: { id: cardId },
      data: {
        ...(frontText && { frontText }),
        ...(backText && { backText }),
        ...(hint !== undefined && { hint })
      }
    });
  }

  async deleteFlashcard(cardId, userId) {
    const card = await this.verifyOwnership(cardId, userId);
    
    await prisma.$transaction([
      prisma.flashcard.delete({ where: { id: cardId } }),
      prisma.deck.update({
        where: { id: card.deckId },
        data: { cardCount: { decrement: 1 } }
      })
    ]);
  }

  async updateDifficulty(cardId, userId, difficulty) {
    await this.verifyOwnership(cardId, userId);
    
    if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      throw new AppError('Độ khó không hợp lệ', 400);
    }

    return prisma.flashcard.update({
      where: { id: cardId },
      data: { difficulty }
    });
  }

  async verifyOwnership(cardId, userId) {
    const card = await prisma.flashcard.findFirst({
      where: { id: cardId },
      include: {
        deck: {
          select: { userId: true }
        }
      }
    });

    if (!card) {
      throw new AppError('Không tìm thấy thẻ', 404);
    }

    if (card.deck.userId !== userId) {
      throw new AppError('Không có quyền truy cập', 403);
    }

    return card;
  }
}

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = new FlashcardService();