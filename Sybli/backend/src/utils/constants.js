/**
 * Constants
 * Application constants and configuration values
 */

module.exports = {
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
  },

  // User Roles
  USER_ROLES: {
    ADMIN: 'admin',
    USER: 'user',
    MODERATOR: 'moderator'
  },

  // NFT Types
  NFT_TYPES: {
    BIOMETRIC: 'biometric',
    ARTWORK: 'artwork',
    COLLECTIBLE: 'collectible'
  },

  // Transaction Types
  TRANSACTION_TYPES: {
    MINT: 'mint',
    TRANSFER: 'transfer',
    BURN: 'burn'
  },

  // Email Templates
  EMAIL_TEMPLATES: {
    WELCOME: 'welcome',
    NOTIFICATION: 'notification',
    PASSWORD_RESET: 'password_reset'
  },

  // File Upload Limits
  UPLOAD_LIMITS: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif']
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },

  // Blockchain
  BLOCKCHAIN: {
    DEFAULT_GAS_LIMIT: 300000,
    DEFAULT_GAS_PRICE: '20000000000' // 20 gwei
  },

  // Validation Rules
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_USERNAME_LENGTH: 50,
    MAX_EMAIL_LENGTH: 100
  }
};
