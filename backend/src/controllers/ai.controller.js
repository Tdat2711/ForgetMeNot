// backend/src/controllers/ai.controller.js
const geminiService = require('../services/gemini.service');

class AIController {
  async generateFromFile(req, res, next) {
    try {
      const { deckId } = req.params;
      const file = req.file;
      const options = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng tải lên file tài liệu'
        });
      }

      // Extract text from file
      const text = await geminiService.extractTextFromFile(
        file.path, 
        file.mimetype
      );

      // Generate flashcards
      const flashcards = await geminiService.generateFlashcards(text, {
        maxCards: options.maxCards || 20,
        includeHints: options.includeHints !== 'false',
        difficulty: options.difficulty || 'mixed',
        language: options.language || 'vi',
        subject: options.subject || null,
      });

      // Validate quality
      const quality = geminiService.validateQuality(flashcards);

      res.json({
        success: true,
        data: {
          flashcards,
          quality,
          totalGenerated: flashcards.length,
          preview: flashcards.slice(0, 5)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async generateFromText(req, res, next) {
    try {
      const { text, options = {} } = req.body;

      if (!text || text.length < 50) {
        return res.status(400).json({
          success: false,
          message: 'Văn bản quá ngắn. Cần ít nhất 50 ký tự.'
        });
      }

      const flashcards = await geminiService.generateFlashcards(text, options);
      const quality = geminiService.validateQuality(flashcards);

      res.json({
        success: true,
        data: {
          flashcards,
          quality,
          totalGenerated: flashcards.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async saveGeneratedCards(req, res, next) {
    try {
      const { deckId } = req.params;
      const { flashcards } = req.body;

      if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có flashcard để lưu'
        });
      }

      const savedCards = await studyService.saveFlashcards(deckId, req.userId, flashcards);

      res.status(201).json({
        success: true,
        message: `Đã tạo ${savedCards.length} thẻ thành công!`,
        data: {
          count: savedCards.length,
          cards: savedCards.slice(0, 3) // Preview first 3
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async enhanceFlashcards(req, res, next) {
    try {
      const { flashcards } = req.body;

      if (!flashcards || !Array.isArray(flashcards)) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ'
        });
      }

      const enhanced = await geminiService.enhanceFlashcards(flashcards);

      res.json({
        success: true,
        data: enhanced
      });
    } catch (error) {
      next(error);
    }
  }

  async checkQuality(req, res, next) {
    try {
      const { deckId } = req.params;
      const cards = await studyService.getDeckCards(deckId, req.userId);
      
      const quality = geminiService.validateQuality(cards);

      res.json({
        success: true,
        data: quality
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AIController();