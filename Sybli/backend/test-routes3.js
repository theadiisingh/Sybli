try {
  const biometricRoutes = require('./src/routes/biometricRoutes_new');
  console.log('biometricRoutes_new loaded successfully');
} catch(e) {
  console.error('Error loading biometricRoutes_new:', e.message);
  console.error(e.stack);
}
