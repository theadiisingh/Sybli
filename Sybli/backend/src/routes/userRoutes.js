/**
 * User Routes
 * Defines all user-related API endpoints
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Protected routes - Profile management
router.get('/profile', authMiddleware.authenticate, userController.getProfile);
router.put('/profile',
  authMiddleware.authenticate,
  validationMiddleware.validateProfileUpdate,
  userController.updateProfile
);

// Biometric status
router.get('/biometric-status', authMiddleware.authenticate, userController.getBiometricStatus);

// DAO activity
router.get('/dao-activity', authMiddleware.authenticate, userController.getDAOActivity);

// User timeline
router.get('/timeline', authMiddleware.authenticate, userController.getUserTimeline);

// Account management
router.delete('/account',
  authMiddleware.authenticate,
  validationMiddleware.validateAccountDeletion,
  userController.deleteAccount
);

// Public routes
router.get('/check-username/:username', userController.checkUsernameAvailability);
router.get('/public/:walletAddress', userController.getPublicProfile);

// Admin routes (require admin middleware)
router.get('/admin/all',
  authMiddleware.authenticate,
  validationMiddleware.validateAdminAccess,
  userController.getAllUsers
);

module.exports = router;
