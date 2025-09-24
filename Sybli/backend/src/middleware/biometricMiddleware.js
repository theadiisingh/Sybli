/**
 * Biometric Middleware
 * Handles biometric data validation and preprocessing
 */

const biometricMiddleware = (req, res, next) => {
  try {
    // Validate biometric data format
    if (!req.body.biometricData) {
      return res.status(400).json({ error: 'Biometric data is required' });
    }

    // Additional validation logic here
    next();
  } catch (error) {
    res.status(500).json({ error: 'Biometric validation failed' });
  }
};

module.exports = biometricMiddleware;
