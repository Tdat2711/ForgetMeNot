// backend/src/controllers/stats.controller.js
const statsService = require('../services/stats.service');

class StatsController {
  async getDashboardStats(req, res, next) {
    try {
      const stats = await statsService.getDashboardStats(req.userId);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async getWeeklyStats(req, res, next) {
    try {
      const stats = await statsService.getWeeklyStats(req.userId);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyStats(req, res, next) {
    try {
      const stats = await statsService.getMonthlyStats(req.userId);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async getDeckPerformance(req, res, next) {
    try {
      const performance = await statsService.getDeckPerformance(req.userId);
      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      next(error);
    }
  }

  async getStreakInfo(req, res, next) {
    try {
      const streak = await statsService.getStreakInfo(req.userId);
      res.json({
        success: true,
        data: streak
      });
    } catch (error) {
      next(error);
    }
  }

  async getActivityLog(req, res, next) {
    try {
      const { days = 30 } = req.query;
      const activity = await statsService.getActivityLog(req.userId, parseInt(days));
      res.json({
        success: true,
        data: activity
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StatsController();