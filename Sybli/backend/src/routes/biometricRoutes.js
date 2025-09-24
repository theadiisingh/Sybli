/**
 * Biometric Routes
 * Defines all biometric-related API endpoints
 */

const express = require('express');
const router = express.Router();
const biometricController = require('../controllers/biometricController');
const biometricMiddleware = require('../middleware/biometricMiddleware');

// Protected routes
router.post('/process', biometricMiddleware, biometricController.processBiometricData);
router.post('/analyze', biometricMiddleware, biometricController.analyzePattern);

module.exports = router;
