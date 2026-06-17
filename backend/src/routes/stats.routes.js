// backend/src/routes/stats.routes.js
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware.authenticate);

router.get('/dashboard', statsController.getDashboardStats);
router.get('/weekly', statsController.getWeeklyStats);
router.get('/monthly', statsController.getMonthlyStats);
router.get('/performance', statsController.getDeckPerformance);
router.get('/streak', statsController.getStreakInfo);
router.get('/activity', statsController.getActivityLog);

module.exports = router;