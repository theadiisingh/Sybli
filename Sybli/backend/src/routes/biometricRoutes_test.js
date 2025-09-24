/**
 * Biometric Routes - Test version
 */

const express = require('express');
const router = express.Router();
const biometricController = require('../controllers/biometricController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Import middleware but don't use them yet
console.log('authMiddleware.authenticate:', typeof authMiddleware.authenticate);
console.log('validationMiddleware.validateBiometricData:', typeof validationMiddleware.validateBiometricData);

// Simple test route without middleware
router.post('/verify-hash', biometricController.verifyBiometricHash);

module.exports = router;
