/**
 * Hashing Service
 * Handles cryptographic hashing operations for passwords, biometrics, and data integrity
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

class HashingService {
  /**
   * Hash data using SHA-256
   */
  async hashData(data) {
    try {
      const hash = crypto.createHash('sha256');
      hash.update(data);
      return hash.digest('hex');
    } catch (error) {
      logger.error('Hashing failed:', error);
      throw new Error('Hashing failed: ' + error.message);
    }
  }

  /**
   * Verify data against hash
   */
  async verifyHash(data, hash) {
    try {
      const calculatedHash = await this.hashData(data);
      return calculatedHash === hash;
    } catch (error) {
      logger.error('Hash verification failed:', error);
      throw new Error('Hash verification failed: ' + error.message);
    }
  }

  /**
   * Generate cryptographic salt
   */
  async generateSalt(length = 16) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      logger.error('Salt generation failed:', error);
      throw new Error('Salt generation failed: ' + error.message);
    }
  }

  /**
   * Hash password with salt using PBKDF2
   */
  async hashPassword(password, salt = null) {
    try {
      const saltValue = salt || await this.generateSalt(32);
      const hash = crypto.pbkdf2Sync(password, saltValue, 100000, 64, 'sha256');
      return {
        hash: hash.toString('hex'),
        salt: saltValue
      };
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Password hashing failed: ' + error.message);
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password, hash, salt) {
    try {
      const hashedPassword = await this.hashPassword(password, salt);
      return hashedPassword.hash === hash;
    } catch (error) {
      logger.error('Password verification failed:', error);
      throw new Error('Password verification failed: ' + error.message);
    }
  }

  /**
   * Generate unique biometric hash for identity verification
   */
  async generateBiometricHash(biometricData, userId, deviceInfo) {
    try {
      // Create a unique hash combining biometric data, user ID, and device info
      const hashInput = {
        biometricData: JSON.stringify(biometricData),
        userId: userId,
        deviceFingerprint: this.generateDeviceFingerprint(deviceInfo),
        timestamp: Date.now(),
        nonce: await this.generateSalt(8)
      };

      // Use multiple hashing rounds for security
      let hash = JSON.stringify(hashInput);
      for (let i = 0; i < 3; i++) {
        hash = crypto.createHash('sha256').update(hash).digest('hex');
      }

      // Add HMAC for additional security
      const hmacKey = process.env.BIOMETRIC_HMAC_KEY || 'default-biometric-key-change-in-production';
      const finalHash = crypto.createHmac('sha256', hmacKey).update(hash).digest('hex');

      logger.info('Biometric hash generated successfully', { userId });

      return finalHash;

    } catch (error) {
      logger.error('Biometric hash generation failed:', error);
      throw new Error('Biometric hash generation failed: ' + error.message);
    }
  }

  /**
   * Generate device fingerprint for biometric hash uniqueness
   */
  generateDeviceFingerprint(deviceInfo) {
    try {
      const fingerprintData = {
        userAgent: deviceInfo?.userAgent || '',
        platform: deviceInfo?.platform || '',
        deviceType: deviceInfo?.deviceType || '',
        screenResolution: deviceInfo?.screenResolution || '',
        timezone: deviceInfo?.timezone || '',
        language: deviceInfo?.language || ''
      };

      return crypto.createHash('md5').update(JSON.stringify(fingerprintData)).digest('hex');

    } catch (error) {
      logger.error('Device fingerprint generation failed:', error);
      return 'default-fingerprint';
    }
  }

  /**
   * Generate secure random token
   */
  async generateSecureToken(length = 32) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      logger.error('Secure token generation failed:', error);
      throw new Error('Secure token generation failed: ' + error.message);
    }
  }

  /**
   * Hash sensitive data for storage (one-way)
   */
  async hashSensitiveData(data) {
    try {
      // Add salt for additional security
      const salt = await this.generateSalt(16);
      const saltedData = salt + data;

      return crypto.createHash('sha256').update(saltedData).digest('hex');

    } catch (error) {
      logger.error('Sensitive data hashing failed:', error);
      throw new Error('Sensitive data hashing failed: ' + error.message);
    }
  }

  /**
   * Generate API key hash
   */
  async hashApiKey(apiKey) {
    try {
      // Use scrypt for API key hashing (more secure than PBKDF2)
      const salt = await this.generateSalt(32);
      const hash = crypto.scryptSync(apiKey, salt, 64, {
        N: 16384,
        r: 8,
        p: 1
      });

      return {
        hash: hash.toString('hex'),
        salt: salt
      };

    } catch (error) {
      logger.error('API key hashing failed:', error);
      throw new Error('API key hashing failed: ' + error.message);
    }
  }

  /**
   * Verify API key
   */
  async verifyApiKey(apiKey, storedHash, salt) {
    try {
      const hash = crypto.scryptSync(apiKey, salt, 64, {
        N: 16384,
        r: 8,
        p: 1
      });

      return hash.toString('hex') === storedHash;

    } catch (error) {
      logger.error('API key verification failed:', error);
      throw new Error('API key verification failed: ' + error.message);
    }
  }

  /**
   * Generate file hash for integrity checking
   */
  async generateFileHash(fileBuffer) {
    try {
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      logger.error('File hash generation failed:', error);
      throw new Error('File hash generation failed: ' + error.message);
    }
  }

  /**
   * Generate blockchain-compatible hash (keccak256)
   */
  async generateBlockchainHash(data) {
    try {
      // Use keccak256 for Ethereum compatibility
      const keccak256 = require('keccak256');
      return '0x' + keccak256(Buffer.from(data)).toString('hex');
    } catch (error) {
      // Fallback to sha256 if keccak256 is not available
      logger.warn('Keccak256 not available, using SHA256 fallback');
      return '0x' + crypto.createHash('sha256').update(data).digest('hex');
    }
  }
}

module.exports = new HashingService();
