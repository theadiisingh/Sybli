/**
 * Validation Utils
 * Utility functions for data validation
 */

class ValidationUtils {
  validateEmail(email) {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    } catch (error) {
      throw new Error('Email validation failed: ' + error.message);
    }
  }

  validatePassword(password) {
    try {
      // Password must be at least 8 characters with uppercase, lowercase, and number
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
      return passwordRegex.test(password);
    } catch (error) {
      throw new Error('Password validation failed: ' + error.message);
    }
  }

  validateAddress(address) {
    try {
      // Basic blockchain address validation
      return address && address.length >= 20;
    } catch (error) {
      throw new Error('Address validation failed: ' + error.message);
    }
  }

  sanitizeInput(input) {
    try {
      // Basic input sanitization
      if (typeof input === 'string') {
        return input.trim().replace(/[<>]/g, '');
      }
      return input;
    } catch (error) {
      throw new Error('Input sanitization failed: ' + error.message);
    }
  }

  validateRequiredFields(data, requiredFields) {
    try {
      for (const field of requiredFields) {
        if (!data[field]) {
          throw new Error(`Required field '${field}' is missing`);
        }
      }
      return true;
    } catch (error) {
      throw new Error('Required fields validation failed: ' + error.message);
    }
  }
}

module.exports = new ValidationUtils();
