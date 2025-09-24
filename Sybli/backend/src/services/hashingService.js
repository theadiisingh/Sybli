/**
 * Hashing Service
 * Handles cryptographic hashing operations
 */

const crypto = require('crypto');
const cryptoUtils = require('../utils/cryptoUtils');

class HashingService {
  async hashData(data) {
    try {
      // Hash data using cryptographic functions
      const hash = crypto.createHash('sha256');
      hash.update(data);
      return hash.digest('hex');
    } catch (error) {
      throw new Error('Hashing failed: ' + error.message);
    }
  }

  async verifyHash(data, hash) {
    try {
      // Verify data against hash
      const calculatedHash = await this.hashData(data);
      return calculatedHash === hash;
    } catch (error) {
      throw new Error('Hash verification failed: ' + error.message);
    }
  }

  async generateSalt() {
    try {
      // Generate cryptographic salt
      return crypto.randomBytes(16).toString('hex');
    } catch (error) {
      throw new Error('Salt generation failed: ' + error.message);
    }
  }
}

module.exports = new HashingService();
