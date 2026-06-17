// backend/src/routes/ai.routes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');

router.use(authMiddleware.authenticate);

router.post('/generate/:deckId', uploadMiddleware.single('file'), aiController.generateFromFile);
router.post('/generate-text/:deckId', aiController.generateFromText);
router.post('/save/:deckId', aiController.saveGeneratedCards);
router.post('/enhance', aiController.enhanceFlashcards);
router.get('/quality/:deckId', aiController.checkQuality);

module.exports = router;