/**
 * Constants
 * Application constants and configuration values for NeuroCredit
 */

module.exports = {
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  // User Roles
  USER_ROLES: {
    ADMIN: 'admin',
    USER: 'user',
    MODERATOR: 'moderator',
    VERIFIED_HUMAN: 'verified_human'
  },

  // NFT Types
  NFT_TYPES: {
    BIOMETRIC: 'biometric',
    HUMANITY: 'humanity',
    ARTWORK: 'artwork',
    COLLECTIBLE: 'collectible',
    SOULBOUND: 'soulbound'
  },

  // Transaction Types
  TRANSACTION_TYPES: {
    MINT: 'mint',
    TRANSFER: 'transfer',
    BURN: 'burn',
    APPROVE: 'approve',
    VERIFY: 'verify'
  },

  // Email Templates
  EMAIL_TEMPLATES: {
    WELCOME: 'welcome',
    NOTIFICATION: 'notification',
    PASSWORD_RESET: 'password_reset',
    BIOMETRIC_VERIFICATION: 'biometric_verification',
    NFT_MINTED: 'nft_minted'
  },

  // File Upload Limits
  UPLOAD_LIMITS: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: [
      'image/jpeg', 
      'image/png', 
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'application/json'
    ]
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
    DEFAULT_GAS_PRICE: '20000000000', // 20 gwei
    CONFIRMATIONS_REQUIRED: 2,
    CHAIN_IDS: {
      MAINNET: 1,
      SEPOLIA: 11155111,
      LOCAL: 31337
    }
  },

  // Validation Rules
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_USERNAME_LENGTH: 50,
    MAX_EMAIL_LENGTH: 100,
    ETH_ADDRESS_LENGTH: 42,
    WALLET_SIGNATURE_LENGTH: 132
  },

  // Biometric Constants
  BIOMETRIC: {
    TYPES: {
      FACIAL: 'facial',
      BEHAVIORAL: 'behavioral',
      VOICE: 'voice'
    },
    THRESHOLDS: {
      MINIMUM_QUALITY: 0.6,
      GOOD_QUALITY: 0.8,
      EXCELLENT_QUALITY: 0.9
    },
    PATTERN_SIZES: {
      FACIAL_LANDMARKS: 68, // Standard facial landmarks
      BEHAVIORAL_FEATURES: 20 // Behavioral pattern features
    }
  },

  // Authentication Constants
  AUTH: {
    NONCE_EXPIRY_MINUTES: 15,
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_TIMEOUT_MINUTES: 15,
    SESSION_TIMEOUT_HOURS: 24
  },

  // API Response Messages
  API_RESPONSES: {
    // Success Messages
    SUCCESS: 'Operation completed successfully',
    USER_CREATED: 'User created successfully',
    USER_UPDATED: 'User updated successfully',
    USER_DELETED: 'User deleted successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    TOKEN_REFRESHED: 'Token refreshed successfully',
    BIOMETRIC_REGISTERED: 'Biometric data registered successfully',
    BIOMETRIC_VERIFIED: 'Biometric verification successful',
    NFT_MINTED: 'NFT minted successfully',
    NFT_TRANSFERRED: 'NFT transferred successfully',
    VERIFICATION_COMPLETE: 'Verification process completed',

    // Error Messages
    INTERNAL_SERVER_ERROR: 'Internal server error',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation failed',
    INVALID_CREDENTIALS: 'Invalid credentials',
    USER_EXISTS: 'User already exists',
    USER_NOT_FOUND: 'User not found',
    INVALID_TOKEN: 'Invalid token',
    EXPIRED_TOKEN: 'Token has expired',
    RATE_LIMITED: 'Too many requests, please try again later',
    INVALID_ETH_ADDRESS: 'Invalid Ethereum address',
    INVALID_SIGNATURE: 'Invalid signature',
    INSUFFICIENT_FUNDS: 'Insufficient funds for transaction',
    CONTRACT_ERROR: 'Smart contract error',
    BIOMETRIC_ERROR: 'Biometric processing error',
    NFT_ERROR: 'NFT operation failed'
  },

  // Error Codes
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    CONTRACT_ERROR: 'CONTRACT_ERROR',
    BIOMETRIC_ERROR: 'BIOMETRIC_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  },

  // DAO Constants
  DAO: {
    PROPOSAL_TYPES: {
      FUNDING: 'funding',
      GOVERNANCE: 'governance',
      TECHNICAL: 'technical',
      COMMUNITY: 'community'
    },
    VOTE_TYPES: {
      FOR: 1,
      AGAINST: 0,
      ABSTAIN: 2
    },
    VOTING_PERIOD_DAYS: 7,
    QUORUM_PERCENTAGE: 4, // 4% of total supply
    THRESHOLD_PERCENTAGE: 51 // 51% majority
  },

  // Cache Constants
  CACHE: {
    TTL: {
      SHORT: 300, // 5 minutes
      MEDIUM: 1800, // 30 minutes
      LONG: 3600 // 1 hour
    },
    KEYS: {
      USER_PROFILE: 'user_profile',
      NFT_METADATA: 'nft_metadata',
      CONTRACT_DATA: 'contract_data',
      BIOMETRIC_STATUS: 'biometric_status'
    }
  },

  // Logging Constants
  LOGGING: {
    LEVELS: {
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug'
    },
    CATEGORIES: {
      AUTH: 'auth',
      BIOMETRIC: 'biometric',
      NFT: 'nft',
      BLOCKCHAIN: 'blockchain',
      DATABASE: 'database',
      API: 'api'
    }
  },

  // Security Constants
  SECURITY: {
    PASSWORD_STRENGTH: {
      MIN_LENGTH: 8,
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBERS: true,
      REQUIRE_SYMBOLS: true
    },
    RATE_LIMITING: {
      WINDOW_MS: 900000, // 15 minutes
      MAX_REQUESTS: 100
    },
    CORS: {
      ALLOWED_ORIGINS: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://neurocredit.xyz'
      ]
    }
  }
};