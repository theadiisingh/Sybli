/**
 * Biometric Routes
 * Defines all biometric-related API endpoints
 */

const express = require('express');
const router = express.Router();
const biometricController = require('../controllers/biometricController');
const biometricMiddleware = require('../middleware/biometricMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// All biometric routes require authentication
router.use(authMiddleware.authenticate);

// Biometric data processing and verification
router.post('/process',
  validationMiddleware.validationRules.validateBiometricData,
  validationMiddleware.handleValidationErrors,
  biometricController.processBiometricData
);

router.post('/analyze',
  validationMiddleware.validationRules.validateBiometricAnalysis,
  validationMiddleware.handleValidationErrors,
  biometricController.analyzePattern
);

// Biometric status and management
router.get('/status', biometricController.getBiometricStatus);

router.put('/consent',
  validationMiddleware.validationRules.validateConsentUpdate,
  validationMiddleware.handleValidationErrors,
  biometricController.updateBiometricConsent
);

router.delete('/data',
  validationMiddleware.validationRules.validateDataDeletion,
  validationMiddleware.handleValidationErrors,
  biometricController.deleteBiometricData
);

// Admin routes
router.get('/stats', biometricController.getBiometricStats);

router.post('/verify-hash', biometricController.verifyBiometricHash);

module.exports = router;
