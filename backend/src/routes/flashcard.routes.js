// backend/src/routes/flashcard.routes.js
const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcard.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validator.middleware');
const { createFlashcardSchema, updateFlashcardSchema } = require('../utils/validators');

router.use(authMiddleware.authenticate);

router.get('/:id', flashcardController.getFlashcard);
router.put('/:id', validate(updateFlashcardSchema), flashcardController.updateFlashcard);
router.delete('/:id', flashcardController.deleteFlashcard);
router.patch('/:id/difficulty', flashcardController.updateDifficulty);

module.exports = router;