const express = require('express');
const router = express.Router();
const biometricController = require('../controllers/biometricController');

router.post('/process', biometricController.processBiometricPattern);
router.post('/verify', biometricController.verifyBiometricPattern);
router.get('/status/:walletAddress', biometricController.getBiometricStatus);
router.put('/update', biometricController.updateBiometricPattern);
router.delete('/remove', biometricController.removeBiometricPattern);

module.exports = router;