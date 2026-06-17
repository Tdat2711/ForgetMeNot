// backend/src/routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const deckRoutes = require('./deck.routes');
const flashcardRoutes = require('./flashcard.routes');
const studyRoutes = require('./study.routes');
const statsRoutes = require('./stats.routes');
const aiRoutes = require('./ai.routes');

router.use('/auth', authRoutes);
router.use('/decks', deckRoutes);
router.use('/flashcards', flashcardRoutes);
router.use('/study', studyRoutes);
router.use('/stats', statsRoutes);
router.use('/ai', aiRoutes);

module.exports = router;