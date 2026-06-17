// backend/src/controllers/flashcard.controller.js
const flashcardService = require('../services/flashcard.service');

class FlashcardController {
  async getFlashcard(req, res, next) {
    try {
      const flashcard = await flashcardService.getFlashcardById(req.params.id, req.userId);
      res.json({
        success: true,
        data: flashcard
      });
    } catch (error) {
      next(error);
    }
  }

  async updateFlashcard(req, res, next) {
    try {
      const flashcard = await flashcardService.updateFlashcard(req.params.id, req.userId, req.body);
      res.json({
        success: true,
        message: 'Cập nhật thẻ thành công!',
        data: flashcard
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFlashcard(req, res, next) {
    try {
      await flashcardService.deleteFlashcard(req.params.id, req.userId);
      res.json({
        success: true,
        message: 'Xóa thẻ thành công!'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDifficulty(req, res, next) {
    try {
      const flashcard = await flashcardService.updateDifficulty(req.params.id, req.userId, req.body.difficulty);
      res.json({
        success: true,
        message: 'Cập nhật độ khó thành công!',
        data: flashcard
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FlashcardController();