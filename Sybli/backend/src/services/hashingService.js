/**
 * Hashing Service
 * Handles cryptographic hashing operations for NeuroCredit
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/server');
const CryptoUtils = require('../utils/cryptoUtils');
const { API_RESPONSES } = require('../utils/constants');

class HashingService {
    /**
     * Hash data using multiple algorithms with fallback
     */
    async hashData(data, algorithm = 'sha256') {
        try {
            if (typeof data !== 'string') {
                data = JSON.stringify(data);
            }
            
            return CryptoUtils.hashData(data, algorithm);
        } catch (error) {
            throw new Error(`Hashing failed: ${error.message}`);
        }
    }

    /**
     * Verify data against hash with timing-safe comparison
     */
    async verifyHash(data, hash, algorithm = 'sha256') {
        try {
            return CryptoUtils.verifyHMAC(data, hash, algorithm);
        } catch (error) {
            throw new Error(`Hash verification failed: ${error.message}`);
        }
    }

    /**
     * Generate cryptographic salt using enhanced method
     */
    async generateSalt(bytes = 16) {
        try {
            return CryptoUtils.generateSalt(bytes);
        } catch (error) {
            throw new Error(`Salt generation failed: ${error.message}`);
        }
    }

    /**
     * Hash password using bcrypt with enhanced security
     */
    async hashPassword(password) {
        try {
            const validation = this.validatePasswordStrength(password);
            if (!validation.isValid) {
                throw new Error(`Password validation failed: ${validation.issues.join(', ')}`);
            }
            
            const saltRounds = config.security.bcryptRounds || 12;
            return await bcrypt.hash(password, saltRounds);
        } catch (error) {
            throw new Error(`Password hashing failed: ${error.message}`);
        }
    }

    /**
     * Verify password against hash with timing-safe comparison
     */
    async verifyPassword(password, hash) {
        try {
            if (!password || !hash) {
                return false;
            }
            return await bcrypt.compare(password, hash);
        } catch (error) {
            throw new Error(`Password verification failed: ${error.message}`);
        }
    }

    /**
     * Hash biometric data securely with enhanced features
     */
    async hashBiometricData(biometricData) {
        try {
            if (!biometricData || typeof biometricData !== 'object') {
                throw new Error(API_RESPONSES.INVALID_BIOMETRIC_DATA);
            }
            
            // Create a normalized version for consistent hashing
            const normalizedData = this.normalizeBiometricData(biometricData);
            const dataString = JSON.stringify(normalizedData);
            
            const saltRounds = config.biometric.hashSaltRounds || 12;
            return await bcrypt.hash(dataString, saltRounds);
        } catch (error) {
            throw new Error(`Biometric data hashing failed: ${error.message}`);
        }
    }

    /**
     * Verify biometric data against hash with enhanced validation
     */
    async verifyBiometricData(biometricData, hash) {
        try {
            if (!biometricData || !hash) {
                return false;
            }
            
            const normalizedData = this.normalizeBiometricData(biometricData);
            const dataString = JSON.stringify(normalizedData);
            return await bcrypt.compare(dataString, hash);
        } catch (error) {
            throw new Error(`Biometric data verification failed: ${error.message}`);
        }
    }

    /**
     * Generate JWT tokens with enhanced security features
     */
    generateAuthTokens(payload, additionalClaims = {}) {
        try {
            if (!payload || typeof payload !== 'object') {
                throw new Error('Invalid token payload');
            }

            // Add enhanced claims
            const enhancedPayload = {
                ...payload,
                ...additionalClaims,
                iss: 'neurocredit-backend',
                iat: Math.floor(Date.now() / 1000),
                jti: CryptoUtils.generateSecureToken(16)
            };

            const accessToken = jwt.sign(
                enhancedPayload,
                config.jwt.accessSecret,
                { 
                    expiresIn: config.jwt.accessExpiry,
                    algorithm: 'HS256'
                }
            );

            const refreshToken = jwt.sign(
                { 
                    ...enhancedPayload, 
                    isRefresh: true,
                    tokenFamily: CryptoUtils.generateSecureToken(8)
                },
                config.jwt.refreshSecret,
                { 
                    expiresIn: config.jwt.refreshExpiry,
                    algorithm: 'HS256'
                }
            );

            return {
                accessToken,
                refreshToken,
                expiresIn: this.getTokenExpiry(config.jwt.accessExpiry),
                tokenType: 'Bearer'
            };
        } catch (error) {
            throw new Error(`Token generation failed: ${error.message}`);
        }
    }

    /**
     * Verify JWT token with enhanced security checks
     */
    verifyToken(token, isRefresh = false) {
        try {
            if (!token) {
                throw new Error('Token is required');
            }

            const secret = isRefresh ? config.jwt.refreshSecret : config.jwt.accessSecret;
            const options = {
                algorithms: ['HS256'],
                issuer: 'neurocredit-backend'
            };

            const decoded = jwt.verify(token, secret, options);
            
            // Additional security checks
            if (isRefresh && !decoded.isRefresh) {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token has expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            } else if (error.name === 'NotBeforeError') {
                throw new Error('Token not yet active');
            } else {
                throw new Error(`Token verification failed: ${error.message}`);
            }
        }
    }

    /**
     * Generate biometric session token with enhanced security
     */
    generateBiometricToken() {
        try {
            return CryptoUtils.generateSecureToken(32);
        } catch (error) {
            throw new Error(`Biometric token generation failed: ${error.message}`);
        }
    }

    /**
     * Generate unique nonce for wallet authentication with enhanced format
     */
    generateNonce(purpose = 'authentication') {
        try {
            const randomPart = CryptoUtils.generateRandomString(16);
            const timestamp = Date.now();
            const purposeHash = CryptoUtils.hashData(purpose).substring(0, 8);
            
            return `neurocredit_${purpose}_${timestamp}_${randomPart}_${purposeHash}`;
        } catch (error) {
            throw new Error(`Nonce generation failed: ${error.message}`);
        }
    }

    /**
     * Generate encryption key with enhanced randomness
     */
    generateEncryptionKey(length = 32) {
        try {
            return CryptoUtils.generateRandomString(length);
        } catch (error) {
            throw new Error(`Encryption key generation failed: ${error.message}`);
        }
    }

    /**
     * Encrypt data using AES-256-GCM with enhanced security
     */
    encryptData(data, key) {
        try {
            return CryptoUtils.encryptAES(data, key);
        } catch (error) {
            throw new Error(`Data encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt data using AES-256-GCM with enhanced validation
     */
    decryptData(encryptedData, key) {
        try {
            return CryptoUtils.decryptAES(encryptedData, key);
        } catch (error) {
            throw new Error(`Data decryption failed: ${error.message}`);
        }
    }

    /**
     * Generate hash for file content with enhanced streaming support
     */
    async hashFileContent(fileBuffer, algorithm = 'sha256') {
        try {
            const hash = crypto.createHash(algorithm);
            hash.update(fileBuffer);
            return hash.digest('hex');
        } catch (error) {
            throw new Error(`File content hashing failed: ${error.message}`);
        }
    }

    /**
     * Generate unique ID for transactions with enhanced format
     */
    generateTransactionId(prefix = 'tx') {
        try {
            const timestamp = Date.now().toString(36);
            const random = CryptoUtils.generateRandomString(8);
            const sequence = this.getNextSequenceNumber();
            
            return `${prefix}_${timestamp}_${random}_${sequence}`;
        } catch (error) {
            throw new Error(`Transaction ID generation failed: ${error.message}`);
        }
    }

    /**
     * Calculate token expiry timestamp with enhanced parsing
     */
    getTokenExpiry(expiryString) {
        try {
            const unit = expiryString.slice(-1);
            const value = parseInt(expiryString.slice(0, -1));
            
            const multipliers = {
                s: 1000,        // seconds
                m: 60 * 1000,   // minutes
                h: 60 * 60 * 1000, // hours
                d: 24 * 60 * 60 * 1000 // days
            };
            
            if (!multipliers[unit]) {
                throw new Error('Invalid time unit');
            }
            
            return Date.now() + (value * multipliers[unit]);
        } catch (error) {
            // Default to 15 minutes if parsing fails
            return Date.now() + (15 * 60 * 1000);
        }
    }

    /**
     * Enhanced password strength validation
     */
    validatePasswordStrength(password) {
        const issues = [];
        
        if (!password) {
            issues.push('Password is required');
            return { isValid: false, issues };
        }
        
        if (password.length < 8) {
            issues.push('Password must be at least 8 characters long');
        }
        
        if (password.length > 128) {
            issues.push('Password must be less than 128 characters long');
        }
        
        if (!/(?=.*[a-z])/.test(password)) {
            issues.push('Password must contain at least one lowercase letter');
        }
        
        if (!/(?=.*[A-Z])/.test(password)) {
            issues.push('Password must contain at least one uppercase letter');
        }
        
        if (!/(?=.*\d)/.test(password)) {
            issues.push('Password must contain at least one number');
        }
        
        if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
            issues.push('Password must contain at least one special character');
        }
        
        // Check for common passwords
        const commonPasswords = ['password', '123456', 'qwerty', 'letmein'];
        if (commonPasswords.includes(password.toLowerCase())) {
            issues.push('Password is too common');
        }
        
        // Check for sequential characters
        if (/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
            issues.push('Password contains sequential characters');
        }
        
        // Calculate strength score
        let strengthScore = 0;
        if (password.length >= 12) strengthScore += 2;
        if (/[a-z]/.test(password)) strengthScore += 1;
        if (/[A-Z]/.test(password)) strengthScore += 1;
        if (/\d/.test(password)) strengthScore += 1;
        if (/[^a-zA-Z0-9]/.test(password)) strengthScore += 1;
        
        return {
            isValid: issues.length === 0,
            issues,
            strengthScore: Math.min(strengthScore, 5),
            strengthLevel: this.getStrengthLevel(strengthScore)
        };
    }

    /**
     * Generate recovery codes with enhanced security
     */
    generateRecoveryCodes(count = 6, codeLength = 8) {
        try {
            return CryptoUtils.generateRecoveryCodes(count, codeLength);
        } catch (error) {
            throw new Error(`Recovery code generation failed: ${error.message}`);
        }
    }

    /**
     * Create digital signature for data
     */
    createSignature(data, privateKey) {
        try {
            return CryptoUtils.createSignature(data, privateKey);
        } catch (error) {
            throw new Error(`Signature creation failed: ${error.message}`);
        }
    }

    /**
     * Verify digital signature
     */
    verifySignature(data, signature, publicKey) {
        try {
            return CryptoUtils.verifySignature(data, signature, publicKey);
        } catch (error) {
            throw new Error(`Signature verification failed: ${error.message}`);
        }
    }

    // ==================== PRIVATE HELPER METHODS ====================

    /**
     * Normalize biometric data for consistent hashing
     */
    normalizeBiometricData(biometricData) {
        const normalized = JSON.parse(JSON.stringify(biometricData));
        
        // Remove metadata that shouldn't affect the hash
        if (normalized.metadata) {
            delete normalized.metadata.timestamp;
            delete normalized.metadata.source;
        }
        
        // Sort object keys for consistent ordering
        return this.sortObjectKeys(normalized);
    }

    /**
     * Recursively sort object keys
     */
    sortObjectKeys(obj) {
        if (typeof obj !== 'object' || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(this.sortObjectKeys.bind(this));
        
        const sorted = {};
        Object.keys(obj).sort().forEach(key => {
            sorted[key] = this.sortObjectKeys(obj[key]);
        });
        return sorted;
    }

    /**
     * Get password strength level
     */
    getStrengthLevel(score) {
        if (score >= 5) return 'very-strong';
        if (score >= 4) return 'strong';
        if (score >= 3) return 'good';
        if (score >= 2) return 'weak';
        return 'very-weak';
    }

    /**
     * Get next sequence number for transaction IDs
     */
    getNextSequenceNumber() {
        if (!this.sequenceCounter) {
            this.sequenceCounter = 0;
        }
        this.sequenceCounter = (this.sequenceCounter + 1) % 1000;
        return this.sequenceCounter.toString().padStart(3, '0');
    }
}

module.exports = new HashingService();