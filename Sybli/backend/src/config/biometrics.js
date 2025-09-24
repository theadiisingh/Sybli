/**
 * Biometrics Configuration
 * Biometric processing and analysis settings
 */

module.exports = {
  // Biometric processing settings
  processing: {
    maxDataSize: 1024 * 1024, // 1MB
    supportedFormats: ['json', 'binary', 'base64'],
    timeout: 30000, // 30 seconds
    qualityThreshold: 0.8
  },

  // Pattern analysis settings
  analysis: {
    minPatternLength: 10,
    maxPatternLength: 1000,
    confidenceThreshold: 0.85,
    algorithm: 'advanced', // 'basic' | 'advanced' | 'neural'
    features: ['fingerprint', 'facial', 'iris', 'voice']
  },

  // Storage settings
  storage: {
    tempDirectory: './public/uploads/temp',
    archiveDirectory: './public/uploads/archive',
    retentionDays: 30,
    encryption: true,
    compression: true
  },

  // Security settings
  security: {
    encryptionAlgorithm: 'AES-256-GCM',
    keyRotationDays: 90,
    accessControl: 'strict', // 'strict' | 'moderate' | 'permissive'
    auditLogging: true
  },

  // Performance settings
  performance: {
    maxConcurrentProcesses: 5,
    memoryLimit: '512MB',
    cpuThreshold: 80,
    enableCaching: true,
    cacheTTL: 3600 // 1 hour
  },

  // Validation rules
  validation: {
    minQualityScore: 0.7,
    maxProcessingTime: 10000, // 10 seconds
    requiredFields: ['timestamp', 'userId', 'biometricType', 'data'],
    allowedBiometricTypes: ['fingerprint', 'facial', 'iris', 'voice', 'palm']
  },

  // Error handling
  errorHandling: {
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    fallbackMode: true,
    errorThreshold: 5
  }
};
