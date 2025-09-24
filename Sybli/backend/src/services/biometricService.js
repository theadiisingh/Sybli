/**
 * Biometric Service
 * Handles biometric pattern analysis and processing
 */

const biometricUtils = require('../utils/biometricUtils');

class BiometricService {
  async processBiometricData(data) {
    try {
      // Process biometric data using utility functions
      const processedData = await biometricUtils.processData(data);
      return processedData;
    } catch (error) {
      throw new Error('Biometric processing failed: ' + error.message);
    }
  }

  async analyzePattern(data) {
    try {
      // Analyze biometric patterns
      const analysis = await biometricUtils.analyzePattern(data);
      return analysis;
    } catch (error) {
      throw new Error('Pattern analysis failed: ' + error.message);
    }
  }
}

module.exports = new BiometricService();
