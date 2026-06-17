// backend/src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validator.middleware');
const { registerSchema, loginSchema, changePasswordSchema, updateProfileSchema } = require('../utils/validators');

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.use(authMiddleware.authenticate);
router.get('/me', authController.getMe);
router.put('/profile', validate(updateProfileSchema), authController.updateProfile);
router.post('/change-password', validate(changePasswordSchema), authController.changePassword);
router.post('/logout', authController.logout);
router.post('/logout-all', authController.logoutAll);
router.get('/sessions', authController.getSessions);
router.delete('/sessions/:sessionId', authController.revokeSession);

module.exports = router;