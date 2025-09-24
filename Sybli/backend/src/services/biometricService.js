/**
 * Biometric Service
 * Handles biometric data processing, pattern analysis, and hash management
 */

const BiometricHash = require('../../database/models/BiometricHash');
const biometricUtils = require('../utils/biometricUtils');
const logger = require('../utils/logger');
const crypto = require('crypto');

class BiometricService {
  /**
   * Process biometric data for initial verification
   */
  async processBiometricData(biometricData, deviceInfo) {
    try {
      logger.info('Processing biometric data', { deviceType: deviceInfo?.deviceType });

      // Use biometricUtils for processing
      const processed = await biometricUtils.processData(biometricData);

      // Generate processing metadata
      const metadata = {
        qualityScore: processed.qualityScore,
        featuresExtracted: processed.features.length,
        processingTimestamp: new Date(),
        deviceInfo: {
          type: deviceInfo?.deviceType,
          platform: deviceInfo?.platform,
          userAgent: deviceInfo?.userAgent
        },
        modalities: processed.modalities,
        metadata: processed.metadata
      };

      logger.info('Biometric data processed successfully', {
        qualityScore: processed.qualityScore,
        featuresCount: processed.features.length,
        modalities: processed.modalities
      });

      return {
        success: true,
        metadata,
        features: processed.features
      };

    } catch (error) {
      logger.error('Error processing biometric data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze biometric pattern for authentication
   */
  async analyzeBiometricPattern(biometricData, storedBiometric, verificationType = 'login') {
    try {
      logger.info('Analyzing biometric pattern', { verificationType });

      // Get stored features
      const storedFeatures = storedBiometric.features || storedBiometric.metadata?.features;

      // Use biometricUtils for analysis
      const analysisResult = await biometricUtils.analyzePattern(biometricData, storedFeatures);

      if (!analysisResult.success) {
        return {
          success: false,
          confidence: 0,
          error: analysisResult.error,
          qualityScore: analysisResult.qualityScore
        };
      }

      // Determine confidence based on verification type
      const confidenceThreshold = this.getConfidenceThreshold(verificationType);
      const isMatch = analysisResult.confidence >= confidenceThreshold;

      const result = {
        success: isMatch,
        confidence: analysisResult.confidence,
        threshold: confidenceThreshold,
        verificationType,
        metadata: {
          featuresCompared: analysisResult.featuresExtracted,
          analysisTimestamp: new Date(),
          algorithm: 'cosine_similarity',
          modalities: analysisResult.metadata?.modalities,
          similarityScore: analysisResult.metadata?.similarityScore
        }
      };

      logger.info('Biometric pattern analysis completed', {
        isMatch,
        confidence: analysisResult.confidence,
        threshold: confidenceThreshold
      });

      return result;

    } catch (error) {
      logger.error('Error analyzing biometric pattern:', error);
      return {
        success: false,
        error: error.message,
        confidence: 0
      };
    }
  }

  /**
   * Store biometric hash record
   */
  async storeBiometricHash(biometricData) {
    try {
      const biometricRecord = new BiometricHash({
        userId: biometricData.userId,
        bioHash: biometricData.bioHash,
        deviceInfo: biometricData.deviceInfo,
        metadata: biometricData.metadata,
        consentGiven: biometricData.consentGiven,
        createdAt: biometricData.createdAt
      });

      await biometricRecord.save();

      logger.info('Biometric hash stored successfully', { userId: biometricData.userId });

      return biometricRecord;

    } catch (error) {
      logger.error('Error storing biometric hash:', error);
      throw new Error('Failed to store biometric data');
    }
  }

  /**
   * Get user's biometric data
   */
  async getUserBiometricData(userId) {
    try {
      const biometricData = await BiometricHash.findOne({ userId }).sort({ createdAt: -1 });

      if (!biometricData) {
        return null;
      }

      return biometricData.toObject();

    } catch (error) {
      logger.error('Error fetching user biometric data:', error);
      throw new Error('Failed to fetch biometric data');
    }
  }

  /**
   * Find biometric hash (for uniqueness checking)
   */
  async findByHash(bioHash) {
    try {
      const record = await BiometricHash.findOne({ bioHash });
      return record;
    } catch (error) {
      logger.error('Error finding biometric hash:', error);
      throw new Error('Failed to check hash uniqueness');
    }
  }

  /**
   * Update biometric consent
   */
  async updateBiometricConsent(userId, consentGiven) {
    try {
      const result = await BiometricHash.updateMany(
        { userId },
        {
          consentGiven,
          updatedAt: new Date()
        }
      );

      return result.modifiedCount > 0;

    } catch (error) {
      logger.error('Error updating biometric consent:', error);
      throw new Error('Failed to update consent');
    }
  }

  /**
   * Delete user's biometric data
   */
  async deleteUserBiometricData(userId) {
    try {
      const result = await BiometricHash.deleteMany({ userId });

      logger.warn('Biometric data deleted', { userId, recordsDeleted: result.deletedCount });

      return result.deletedCount;

    } catch (error) {
      logger.error('Error deleting biometric data:', error);
      throw new Error('Failed to delete biometric data');
    }
  }

  /**
   * Get biometric verification statistics
   */
  async getBiometricStats() {
    try {
      const totalRecords = await BiometricHash.countDocuments();
      const verifiedUsers = await BiometricHash.distinct('userId').then(ids => ids.length);
      const recentVerifications = await BiometricHash.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      });

      const deviceStats = await BiometricHash.aggregate([
        {
          $group: {
            _id: '$deviceInfo.type',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        totalBiometricRecords: totalRecords,
        verifiedUsers,
        recentVerifications,
        deviceBreakdown: deviceStats,
        averageQualityScore: await this.getAverageQualityScore()
      };

    } catch (error) {
      logger.error('Error fetching biometric stats:', error);
      throw new Error('Failed to fetch statistics');
    }
  }

  /**
   * Validate biometric data structure
   */
  validateBiometricData(data) {
    return biometricUtils.validateBiometricData(data);
  }

  /**
   * Extract biometric features
   */
  async extractBiometricFeatures(data) {
    return await biometricUtils.extractBiometricFeatures(data);
  }

  /**
   * Assess biometric quality
   */
  assessBiometricQuality(features, deviceInfo) {
    return biometricUtils.assessBiometricQuality(features, deviceInfo);
  }

  /**
   * Calculate similarity score between feature sets
   */
  calculateSimilarityScore(features1, features2) {
    return biometricUtils.calculateSimilarityScore(features1, features2);
  }

  /**
   * Get confidence threshold based on verification type
   */
  getConfidenceThreshold(verificationType) {
    const thresholds = {
      login: 0.85,
      transaction: 0.90,
      high_security: 0.95,
      default: 0.80
    };

    return thresholds[verificationType] || thresholds.default;
  }

  /**
   * Get average quality score
   */
  async getAverageQualityScore() {
    try {
      const result = await BiometricHash.aggregate([
        {
          $group: {
            _id: null,
            avgQuality: { $avg: '$metadata.qualityScore' }
          }
        }
      ]);

      return result.length > 0 ? result[0].avgQuality : 0;

    } catch (error) {
      logger.error('Error calculating average quality score:', error);
      return 0;
    }
  }
}

module.exports = new BiometricService();
