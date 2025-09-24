/**
 * Biometric Utils
 * Utility functions for biometric pattern extraction and processing
 */

const crypto = require('crypto');
const logger = require('./logger');

class BiometricUtils {
  /**
   * Process and validate biometric data
   */
  async processData(biometricData) {
    try {
      if (!this.validateBiometricData(biometricData)) {
        throw new Error('Invalid biometric data structure');
      }

      // Extract features from different biometric modalities
      const features = await this.extractBiometricFeatures(biometricData);

      // Perform quality assessment
      const qualityScore = this.assessBiometricQuality(features);

      // Generate processing metadata
      const processed = {
        features,
        qualityScore,
        processed: true,
        timestamp: new Date().toISOString(),
        modalities: this.detectModalities(biometricData),
        metadata: {
          featureCount: features.length,
          qualityScore,
          processingTime: Date.now()
        }
      };

      logger.debug('Biometric data processed successfully', {
        modalities: processed.modalities,
        qualityScore: processed.qualityScore
      });

      return processed;
    } catch (error) {
      logger.error('Biometric data processing failed:', error);
      throw new Error('Biometric data processing failed: ' + error.message);
    }
  }

  /**
   * Analyze biometric patterns for verification
   */
  async analyzePattern(biometricData, storedFeatures = null) {
    try {
      const features = await this.extractBiometricFeatures(biometricData);
      const qualityScore = this.assessBiometricQuality(features);

      if (qualityScore < 0.6) {
        return {
          success: false,
          confidence: 0,
          error: 'Biometric data quality too low for analysis',
          qualityScore
        };
      }

      let confidence = 0.8; // Base confidence for good quality data

      // If we have stored features for comparison
      if (storedFeatures && Array.isArray(storedFeatures)) {
        const similarity = this.calculateSimilarityScore(features, storedFeatures);
        confidence = Math.min(similarity * 1.2, 0.95); // Boost confidence based on similarity
      }

      // Adjust confidence based on quality
      confidence *= qualityScore;

      const analysis = {
        success: true,
        confidence: Math.round(confidence * 100) / 100,
        qualityScore,
        featuresExtracted: features.length,
        timestamp: new Date().toISOString(),
        metadata: {
          similarityScore: storedFeatures ? this.calculateSimilarityScore(features, storedFeatures) : null,
          modalities: this.detectModalities(biometricData)
        }
      };

      logger.debug('Biometric pattern analysis completed', {
        confidence: analysis.confidence,
        qualityScore: analysis.qualityScore
      });

      return analysis;
    } catch (error) {
      logger.error('Pattern analysis failed:', error);
      throw new Error('Pattern analysis failed: ' + error.message);
    }
  }

  /**
   * Validate biometric data structure
   */
  validateBiometricData(data) {
    try {
      if (!data || typeof data !== 'object') {
        return false;
      }

      // Check for at least one biometric modality
      const hasValidModality = (
        (data.fingerprint && Array.isArray(data.fingerprint)) ||
        (data.facial && typeof data.facial === 'object') ||
        (data.behavioral && Array.isArray(data.behavioral)) ||
        (data.voice && Array.isArray(data.voice))
      );

      if (!hasValidModality) {
        return false;
      }

      // Validate data ranges and formats
      if (data.fingerprint && !this.validateFingerprintData(data.fingerprint)) {
        return false;
      }

      if (data.facial && !this.validateFacialData(data.facial)) {
        return false;
      }

      if (data.behavioral && !this.validateBehavioralData(data.behavioral)) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Biometric data validation failed:', error);
      return false;
    }
  }

  /**
   * Extract biometric features from raw data
   */
  async extractBiometricFeatures(data) {
    try {
      const features = [];

      // Extract fingerprint features
      if (data.fingerprint && Array.isArray(data.fingerprint)) {
        const fingerprintFeatures = this.extractFingerprintFeatures(data.fingerprint);
        features.push(...fingerprintFeatures);
      }

      // Extract facial features
      if (data.facial && typeof data.facial === 'object') {
        const facialFeatures = this.extractFacialFeatures(data.facial);
        features.push(...facialFeatures);
      }

      // Extract behavioral features
      if (data.behavioral && Array.isArray(data.behavioral)) {
        const behavioralFeatures = this.extractBehavioralFeatures(data.behavioral);
        features.push(...behavioralFeatures);
      }

      // Extract voice features
      if (data.voice && Array.isArray(data.voice)) {
        const voiceFeatures = this.extractVoiceFeatures(data.voice);
        features.push(...voiceFeatures);
      }

      // Normalize features to 0-1 range
      return features.map(feature => Math.max(0, Math.min(1, feature)));
    } catch (error) {
      logger.error('Feature extraction failed:', error);
      throw new Error('Feature extraction failed: ' + error.message);
    }
  }

  /**
   * Assess biometric data quality
   */
  assessBiometricQuality(features, deviceInfo = {}) {
    try {
      if (!features || features.length === 0) {
        return 0;
      }

      let baseScore = 0.8; // Base quality score

      // Assess feature diversity and consistency
      const mean = features.reduce((sum, f) => sum + f, 0) / features.length;
      const variance = features.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / features.length;
      const stdDev = Math.sqrt(variance);

      // Penalize low variance (too similar features)
      if (stdDev < 0.1) {
        baseScore *= 0.7;
      } else if (stdDev > 0.5) {
        baseScore *= 0.9; // Slight penalty for too much variance
      }

      // Adjust based on device quality
      if (deviceInfo.deviceType === 'high-end') {
        baseScore *= 1.1;
      } else if (deviceInfo.deviceType === 'low-end') {
        baseScore *= 0.9;
      }

      // Adjust based on number of features
      if (features.length < 10) {
        baseScore *= 0.8;
      } else if (features.length > 50) {
        baseScore *= 1.05;
      }

      return Math.min(baseScore, 1);
    } catch (error) {
      logger.error('Quality assessment failed:', error);
      return 0.5; // Default medium quality
    }
  }

  /**
   * Calculate similarity score between feature sets
   */
  calculateSimilarityScore(features1, features2) {
    if (!features1 || !features2 || features1.length === 0 || features2.length === 0) {
      return 0;
    }

    // Cosine similarity implementation
    const dotProduct = features1.reduce((sum, feature, i) => {
      return sum + (feature * (features2[i] || 0));
    }, 0);

    const magnitude1 = Math.sqrt(features1.reduce((sum, feature) => sum + feature * feature, 0));
    const magnitude2 = Math.sqrt(features2.reduce((sum, feature) => sum + feature * feature, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Detect available biometric modalities
   */
  detectModalities(data) {
    const modalities = [];

    if (data.fingerprint && Array.isArray(data.fingerprint)) {
      modalities.push('fingerprint');
    }

    if (data.facial && typeof data.facial === 'object') {
      modalities.push('facial');
    }

    if (data.behavioral && Array.isArray(data.behavioral)) {
      modalities.push('behavioral');
    }

    if (data.voice && Array.isArray(data.voice)) {
      modalities.push('voice');
    }

    return modalities;
  }

  // Feature extraction methods for different modalities

  extractFingerprintFeatures(fingerprintData) {
    // Implement fingerprint feature extraction
    // This would typically involve minutiae extraction, ridge patterns, etc.
    const features = [];

    // Simulate feature extraction from fingerprint data
    for (let i = 0; i < Math.min(fingerprintData.length, 20); i++) {
      const hash = crypto.createHash('md5').update(fingerprintData[i].toString()).digest('hex');
      features.push(parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF);
    }

    return features;
  }

  extractFacialFeatures(facialData) {
    // Implement facial feature extraction
    // This would typically use facial landmark detection
    const features = [];

    if (facialData.landmarks && Array.isArray(facialData.landmarks)) {
      // Extract distance ratios between facial landmarks
      for (let i = 0; i < facialData.landmarks.length - 1; i++) {
        for (let j = i + 1; j < facialData.landmarks.length; j++) {
          const point1 = facialData.landmarks[i];
          const point2 = facialData.landmarks[j];
          const distance = Math.sqrt(
            Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
          );
          features.push(distance / 100); // Normalize
        }
      }
    }

    // Add texture features if available
    if (facialData.texture && Array.isArray(facialData.texture)) {
      features.push(...facialData.texture.slice(0, 10));
    }

    return features.slice(0, 30); // Limit features
  }

  extractBehavioralFeatures(behavioralData) {
    // Implement behavioral biometrics (keystroke dynamics, mouse movements, etc.)
    const features = [];

    if (Array.isArray(behavioralData)) {
      // Extract timing patterns, pressure, speed, etc.
      behavioralData.forEach(event => {
        if (event.pressure !== undefined) {
          features.push(event.pressure / 100);
        }
        if (event.duration !== undefined) {
          features.push(Math.min(event.duration / 1000, 1)); // Normalize to seconds
        }
        if (event.speed !== undefined) {
          features.push(Math.min(event.speed / 1000, 1)); // Normalize speed
        }
      });
    }

    return features.slice(0, 25); // Limit features
  }

  extractVoiceFeatures(voiceData) {
    // Implement voice feature extraction (MFCCs, pitch, etc.)
    const features = [];

    if (Array.isArray(voiceData)) {
      // Extract MFCC-like features from voice data
      voiceData.forEach(frame => {
        if (Array.isArray(frame)) {
          features.push(...frame.slice(0, 13)); // Typical MFCC count
        }
      });
    }

    return features.slice(0, 39); // Limit features (3 frames * 13 MFCCs)
  }

  // Validation methods for different modalities

  validateFingerprintData(data) {
    return Array.isArray(data) && data.length > 0 && data.every(point => typeof point === 'number');
  }

  validateFacialData(data) {
    return data && typeof data === 'object' &&
           ((data.landmarks && Array.isArray(data.landmarks)) ||
            (data.texture && Array.isArray(data.texture)));
  }

  validateBehavioralData(data) {
    return Array.isArray(data) && data.length > 0 &&
           data.every(event => typeof event === 'object' && (event.pressure || event.duration || event.speed));
  }

  validateVoiceData(data) {
    return Array.isArray(data) && data.length > 0 &&
           data.every(frame => Array.isArray(frame) && frame.every(coeff => typeof coeff === 'number'));
  }

  /**
   * Generate biometric template hash for storage
   */
  generateBiometricTemplate(features) {
    try {
      const templateString = features.map(f => f.toFixed(6)).join(',');
      return crypto.createHash('sha256').update(templateString).digest('hex');
    } catch (error) {
      logger.error('Template generation failed:', error);
      throw new Error('Template generation failed: ' + error.message);
    }
  }

  /**
   * Compare biometric templates
   */
  compareBiometricTemplates(template1, template2) {
    try {
      // Simple Hamming distance for binary templates
      // In a real implementation, this would use more sophisticated matching
      const distance = this.calculateHammingDistance(template1, template2);
      const maxLength = Math.max(template1.length, template2.length);
      const similarity = 1 - (distance / maxLength);

      return Math.max(0, Math.min(1, similarity));
    } catch (error) {
      logger.error('Template comparison failed:', error);
      return 0;
    }
  }

  /**
   * Calculate Hamming distance between two strings
   */
  calculateHammingDistance(str1, str2) {
    let distance = 0;
    const maxLength = Math.max(str1.length, str2.length);

    for (let i = 0; i < maxLength; i++) {
      if (str1[i] !== str2[i]) {
        distance++;
      }
    }

    return distance;
  }
}

module.exports = new BiometricUtils();
