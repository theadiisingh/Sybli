/**
 * Authentication Routes
 * Defines all authentication-related API endpoints
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Public routes
router.post('/register',
  validationMiddleware.validateRegistration,
  validationMiddleware.handleValidationErrors,
  authController.register
);

router.post('/login',
  validationMiddleware.validateLogin,
  validationMiddleware.handleValidationErrors,
  authController.login
);

router.post('/refresh',
  validationMiddleware.validateRefreshToken,
  validationMiddleware.handleValidationErrors,
  authController.refreshToken
);

router.post('/forgot-password',
  validationMiddleware.validateForgotPassword,
  validationMiddleware.handleValidationErrors,
  authController.forgotPassword
);

router.post('/reset-password',
  validationMiddleware.validateResetPassword,
  validationMiddleware.handleValidationErrors,
  authController.resetPassword
);

// Protected routes
router.post('/logout', authMiddleware.authenticate, authController.logout);

router.get('/verify', authMiddleware.authenticate, authController.verifyToken);

router.get('/me', authMiddleware.authenticate, authController.getCurrentUser);

module.exports = router;
