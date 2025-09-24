const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/nonce', authController.generateNonce);
router.post('/verify', authController.verifySignature);
router.post('/biometric/register', authController.registerBiometric);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

module.exports = router;