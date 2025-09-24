try {
  const biometricRoutes = require('./src/routes/biometricRoutes');
  console.log('biometricRoutes loaded successfully');
} catch(e) {
  console.error('Error loading biometricRoutes:', e.message);
  console.error(e.stack);
}
