/**
 * Biometric Routes - Simple version for testing
 */

const express = require('express');
const router = express.Router();
const biometricController = require('../controllers/biometricController');

// Simple test route without middleware
router.post('/verify-hash', biometricController.verifyBiometricHash);

module.exports = router;
