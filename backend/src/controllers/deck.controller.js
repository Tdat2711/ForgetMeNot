// backend/src/controllers/deck.controller.js
const deckService = require('../services/deck.service');

class DeckController {
  async getAllDecks(req, res, next) {
    try {
      const { page = 1, limit = 20, search, sortBy, order } = req.query;
      const result = await deckService.getAllDecks(req.userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        sortBy,
        order
      });
      res.json({
        success: true,
        data: result.decks,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getFavoriteDecks(req, res, next) {
    try {
      const decks = await deckService.getFavoriteDecks(req.userId);
      res.json({
        success: true,
        data: decks
      });
    } catch (error) {
      next(error);
    }
  }

  async getDeckById(req, res, next) {
    try {
      const deck = await deckService.getDeckById(req.params.id, req.userId);
      res.json({
        success: true,
        data: deck
      });
    } catch (error) {
      next(error);
    }
  }

  async createDeck(req, res, next) {
    try {
      const deck = await deckService.createDeck(req.userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo bộ thẻ thành công!',
        data: deck
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDeck(req, res, next) {
    try {
      const deck = await deckService.updateDeck(req.params.id, req.userId, req.body);
      res.json({
        success: true,
        message: 'Cập nhật bộ thẻ thành công!',
        data: deck
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteDeck(req, res, next) {
    try {
      await deckService.deleteDeck(req.params.id, req.userId);
      res.json({
        success: true,
        message: 'Xóa bộ thẻ thành công!'
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleFavorite(req, res, next) {
    try {
      const deck = await deckService.toggleFavorite(req.params.id, req.userId);
      res.json({
        success: true,
        message: deck.isFavorite ? 'Đã thêm vào yêu thích!' : 'Đã bỏ yêu thích!',
        data: deck
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleArchive(req, res, next) {
    try {
      const deck = await deckService.toggleArchive(req.params.id, req.userId);
      res.json({
        success: true,
        message: deck.isArchived ? 'Đã lưu trữ bộ thẻ!' : 'Đã khôi phục bộ thẻ!',
        data: deck
      });
    } catch (error) {
      next(error);
    }
  }

  async getDeckFlashcards(req, res, next) {
    try {
      const flashcards = await deckService.getDeckFlashcards(req.params.deckId, req.userId);
      res.json({
        success: true,
        data: flashcards
      });
    } catch (error) {
      next(error);
    }
  }

  async createFlashcard(req, res, next) {
    try {
      const flashcard = await deckService.createFlashcard(req.params.deckId, req.userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Thêm thẻ mới thành công!',
        data: flashcard
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DeckController();