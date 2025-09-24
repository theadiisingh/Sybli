try {
  const biometricController = require('./src/controllers/biometricController');
  console.log('biometricController loaded successfully');
  console.log('processBiometricData:', typeof biometricController.processBiometricData);
  console.log('analyzePattern:', typeof biometricController.analyzePattern);
  console.log('getBiometricStatus:', typeof biometricController.getBiometricStatus);
  console.log('updateBiometricConsent:', typeof biometricController.updateBiometricConsent);
  console.log('deleteBiometricData:', typeof biometricController.deleteBiometricData);
  console.log('getBiometricStats:', typeof biometricController.getBiometricStats);
  console.log('verifyBiometricHash:', typeof biometricController.verifyBiometricHash);
} catch(e) {
  console.error('Error loading biometricController:', e.message);
  console.error(e.stack);
}
