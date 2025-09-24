try {
  const biometricController = require('./src/controllers/biometricController');
  console.log('biometricController loaded successfully');
  console.log('verifyBiometricHash:', typeof biometricController.verifyBiometricHash);
  console.log('verifyBiometricHash exists:', !!biometricController.verifyBiometricHash);

  const biometricRoutes = require('./src/routes/biometricRoutes');
  console.log('biometricRoutes loaded successfully');
} catch(e) {
  console.error('Error:', e.message);
  console.error(e.stack);
}
