/**
 * Crypto Utils
 * Utility functions for cryptographic operations
 */

const crypto = require('crypto');

class CryptoUtils {
  async hashPassword(password, salt) {
    try {
      // Hash password with salt
      const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512');
      return hash.toString('hex');
    } catch (error) {
      throw new Error('Password hashing failed: ' + error.message);
    }
  }

  async generateRandomToken(length = 32) {
    try {
      // Generate random token
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      throw new Error('Token generation failed: ' + error.message);
    }
  }

  async encryptData(data, key) {
    try {
      // Encrypt data using AES
      const cipher = crypto.createCipher('aes-256-cbc', key);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      throw new Error('Data encryption failed: ' + error.message);
    }
  }

  async decryptData(encryptedData, key) {
    try {
      // Decrypt data using AES
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('Data decryption failed: ' + error.message);
    }
  }
}

module.exports = new CryptoUtils();
