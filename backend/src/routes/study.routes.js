// backend/src/routes/study.routes.js
const express = require('express');
const router = express.Router();
const studyController = require('../controllers/study.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware.authenticate);

router.get('/start/:deckId', studyController.startSession);
router.post('/review/:cardId', studyController.reviewCard);
router.get('/stats', studyController.getStudyStats);
router.get('/progress/:deckId', studyController.getDeckProgress);
router.get('/due-cards', studyController.getDueCards);

module.exports = router;