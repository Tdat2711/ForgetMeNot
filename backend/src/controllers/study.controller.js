// backend/src/controllers/study.controller.js
const studyService = require('../services/study.service');
const srsService = require('../services/srs.service');

class StudyController {
  async startSession(req, res, next) {
    try {
      const { deckId } = req.params;
      const result = await studyService.startStudySession(req.userId, deckId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async reviewCard(req, res, next) {
    try {
      const { cardId } = req.params;
      const { quality } = req.body;
      
      const result = await studyService.reviewCard(req.userId, cardId, quality);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getStudyStats(req, res, next) {
    try {
      const stats = await studyService.getStudyStats(req.userId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async getDeckProgress(req, res, next) {
    try {
      const { deckId } = req.params;
      const progress = await studyService.getDeckProgress(req.userId, deckId);
      
      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      next(error);
    }
  }

  async getDueCards(req, res, next) {
    try {
      const dueCards = await studyService.getDueCards(req.userId);
      
      res.json({
        success: true,
        data: {
          cards: dueCards,
          total: dueCards.length,
          urgent: dueCards.filter(c => {
            const hoursSinceDue = (new Date() - new Date(c.nextReview)) / (1000 * 60 * 60);
            return hoursSinceDue > 24;
          }).length
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StudyController();