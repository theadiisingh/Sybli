try {
  const biometricRoutes = require('./src/routes/biometricRoutes_simple');
  console.log('biometricRoutes_simple loaded successfully');
} catch(e) {
  console.error('Error loading biometricRoutes_simple:', e.message);
  console.error(e.stack);
}
