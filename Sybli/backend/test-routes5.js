try {
  const biometricRoutes = require('./src/routes/biometricRoutes_test');
  console.log('biometricRoutes_test loaded successfully');
} catch(e) {
  console.error('Error loading biometricRoutes_test:', e.message);
  console.error(e.stack);
}
