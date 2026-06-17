// backend/src/routes/deck.routes.js
const express = require('express');
const router = express.Router();
const deckController = require('../controllers/deck.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validator.middleware');
const { createDeckSchema, updateDeckSchema } = require('../utils/validators');

router.use(authMiddleware.authenticate);

router.get('/', deckController.getAllDecks);
router.get('/favorites', deckController.getFavoriteDecks);
router.get('/:id', deckController.getDeckById);
router.post('/', validate(createDeckSchema), deckController.createDeck);
router.put('/:id', validate(updateDeckSchema), deckController.updateDeck);
router.delete('/:id', deckController.deleteDeck);
router.patch('/:id/favorite', deckController.toggleFavorite);
router.patch('/:id/archive', deckController.toggleArchive);

// Flashcard routes nested under deck
router.get('/:deckId/flashcards', deckController.getDeckFlashcards);
router.post('/:deckId/flashcards', deckController.createFlashcard);

module.exports = router;