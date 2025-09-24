/**
 * Biometric Service
 * Handles biometric pattern analysis, verification, and storage
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Web3 } = require('web3');
const BiometricHash = require('../../database/models/BiometricHash');
const User = require('../../database/models/User');
const { API_RESPONSES, BIOMETRIC_TYPES, PATTERN_THRESHOLDS } = require('../utils/constants');
const BiometricUtils = require('../utils/biometricUtils');
const ValidationUtils = require('../utils/validationUtils');
const { logBiometricActivity, logSecurityEvent } = require('../utils/logger');
const CryptoUtils = require('../utils/cryptoUtils');

class BiometricService {
    constructor() {
        this.web3 = new Web3();
        this.patternCache = new Map(); // Temporary storage for pattern processing
        this.verificationAttempts = new Map(); // Track verification attempts
    }

    /**
     * Process and extract biometric patterns from input data
     */
    async processBiometricPattern(walletAddress, biometricData, patternType, signature) {
        try {
            // Validate inputs
            if (!ValidationUtils.validateEthAddress(walletAddress) || !ValidationUtils.validateSignature(signature)) {
                throw new Error(API_RESPONSES.INVALID_INPUT);
            }

            if (!ValidationUtils.validateBiometricData(biometricData, patternType)) {
                throw new Error(API_RESPONSES.INVALID_BIOMETRIC_DATA);
            }

            // Verify signature
            await this.verifyBiometricSignature(walletAddress, signature, 'processing');

            const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
            if (!user) {
                throw new Error(API_RESPONSES.USER_NOT_FOUND);
            }

            // Extract pattern based on type using BiometricUtils
            let extractedPattern;
            let qualityScore;

            switch (patternType) {
                case BIOMETRIC_TYPES.FACIAL:
                    const facialResult = BiometricUtils.extractFacialPattern(biometricData);
                    extractedPattern = facialResult.pattern;
                    qualityScore = facialResult.quality;
                    break;

                case BIOMETRIC_TYPES.BEHAVIORAL:
                    const behavioralResult = BiometricUtils.extractBehavioralPattern(biometricData);
                    extractedPattern = behavioralResult.pattern;
                    qualityScore = behavioralResult.quality;
                    break;

                default:
                    throw new Error(API_RESPONSES.INVALID_PATTERN_TYPE);
            }

            // Validate pattern quality using BiometricUtils
            const qualityValidation = BiometricUtils.validatePatternQuality(extractedPattern, patternType);
            if (!qualityValidation.isValid) {
                throw new Error(`${API_RESPONSES.PATTERN_QUALITY_LOW}: ${qualityValidation.issues.join(', ')}`);
            }

            // Generate session ID for temporary storage using CryptoUtils
            const sessionId = CryptoUtils.generateSecureToken(32);
            this.patternCache.set(sessionId, {
                pattern: extractedPattern,
                patternType,
                walletAddress: walletAddress.toLowerCase(),
                userId: user._id,
                timestamp: Date.now(),
                qualityScore,
                fingerprint: BiometricUtils.generatePatternFingerprint(extractedPattern)
            });

            // Set expiration (10 minutes)
            setTimeout(() => {
                this.patternCache.delete(sessionId);
            }, 10 * 60 * 1000);

            logBiometricActivity(walletAddress, 'pattern_processed', {
                patternType,
                qualityScore,
                sessionId,
                features: extractedPattern ? Object.keys(extractedPattern).length : 0
            });

            return {
                success: true,
                sessionId,
                patternType,
                qualityScore,
                qualityValidation,
                message: API_RESPONSES.PATTERN_PROCESSED_SUCCESS
            };

        } catch (error) {
            logSecurityEvent(walletAddress, 'biometric_processing_error', { 
                error: error.message,
                patternType 
            });
            throw error;
        }
    }

    /**
     * Verify biometric pattern against stored data or register new pattern
     */
    async verifyBiometricPattern(sessionId, action, signature) {
        try {
            if (!sessionId || !ValidationUtils.validateSignature(signature)) {
                throw new Error(API_RESPONSES.INVALID_INPUT);
            }

            // Retrieve stored pattern
            const storedData = this.patternCache.get(sessionId);
            if (!storedData) {
                throw new Error(API_RESPONSES.INVALID_OR_EXPIRED_SESSION);
            }

            // Clean up cache
            this.patternCache.delete(sessionId);

            const { pattern, patternType, walletAddress, userId, qualityScore, fingerprint } = storedData;

            // Verify signature
            await this.verifyBiometricSignature(walletAddress, signature, 'verification');

            const user = await User.findById(userId);
            if (!user) {
                throw new Error(API_RESPONSES.USER_NOT_FOUND);
            }

            if (action === 'register') {
                return await this.registerBiometricPattern(user, pattern, patternType, qualityScore, fingerprint);
            } else if (action === 'verify') {
                return await this.verifyAgainstStoredPattern(user, pattern, patternType, fingerprint);
            } else {
                throw new Error(API_RESPONSES.INVALID_VERIFICATION_ACTION);
            }

        } catch (error) {
            logSecurityEvent('unknown', 'biometric_verification_error', { 
                error: error.message,
                sessionId 
            });
            throw error;
        }
    }

    /**
     * Register a new biometric pattern for a user
     */
    async registerBiometricPattern(user, pattern, patternType, qualityScore, fingerprint) {
        try {
            // Check if pattern type already exists
            const existingPattern = await BiometricHash.findOne({
                userId: user._id,
                patternType,
                isActive: true
            });

            if (existingPattern) {
                throw new Error(API_RESPONSES.BIOMETRIC_ALREADY_REGISTERED);
            }

            // Generate secure hash using enhanced method
            const patternHash = await this.hashBiometricPattern(pattern);

            // Create biometric record with enhanced metadata
            const biometricRecord = new BiometricHash({
                userId: user._id,
                hash: patternHash,
                patternType,
                qualityScore,
                fingerprint: fingerprint,
                metadata: {
                    patternSize: BiometricUtils.calculatePatternSize(pattern),
                    features: BiometricUtils.extractFeatureCount(pattern),
                    complexity: BiometricUtils.calculatePatternComplexity(pattern),
                    algorithmVersion: '1.0',
                    extractionMethod: 'neural_network'
                },
                isActive: true,
                registeredAt: new Date()
            });

            await biometricRecord.save();

            // Update user biometric status
            user.hasBiometric = true;
            user.isVerified = true;
            user.lastBiometricUpdate = new Date();
            user.biometricTypes = user.biometricTypes || [];
            if (!user.biometricTypes.includes(patternType)) {
                user.biometricTypes.push(patternType);
            }
            await user.save();

            logBiometricActivity(user.walletAddress, 'biometric_registered', {
                patternType,
                qualityScore,
                recordId: biometricRecord._id,
                features: fingerprint.featureCount
            });

            return {
                success: true,
                message: API_RESPONSES.BIOMETRIC_REGISTERED_SUCCESS,
                patternType,
                qualityScore,
                registeredAt: biometricRecord.registeredAt,
                recordId: biometricRecord._id
            };

        } catch (error) {
            logSecurityEvent(user.walletAddress, 'biometric_registration_error', {
                error: error.message,
                patternType
            });
            throw error;
        }
    }

    /**
     * Verify input pattern against stored pattern
     */
    async verifyAgainstStoredPattern(user, inputPattern, patternType, inputFingerprint) {
        try {
            // Get stored pattern
            const storedRecord = await BiometricHash.findOne({
                userId: user._id,
                patternType,
                isActive: true
            });

            if (!storedRecord) {
                throw new Error(API_RESPONSES.BIOMETRIC_NOT_REGISTERED);
            }

            // Check rate limiting
            if (this.isVerificationRateLimited(user.walletAddress)) {
                throw new Error(API_RESPONSES.RATE_LIMITED);
            }

            // Quick fingerprint comparison first
            const fingerprintSimilarity = this.compareFingerprints(inputFingerprint, storedRecord.fingerprint);
            if (fingerprintSimilarity < 0.7) {
                this.recordFailedVerification(user.walletAddress);
                throw new Error(API_RESPONSES.BIOMETRIC_VERIFICATION_FAILED);
            }

            // Full pattern verification
            const isMatch = await this.compareBiometricPatterns(inputPattern, storedRecord.hash);
            const similarityScore = await this.calculateSimilarityScore(inputPattern, storedRecord.hash);

            if (!isMatch || similarityScore < PATTERN_THRESHOLDS.MINIMUM_QUALITY) {
                this.recordFailedVerification(user.walletAddress);
                logSecurityEvent(user.walletAddress, 'biometric_verification_failed', {
                    patternType,
                    similarityScore,
                    fingerprintSimilarity
                });

                throw new Error(API_RESPONSES.BIOMETRIC_VERIFICATION_FAILED);
            }

            // Update verification stats
            storedRecord.verificationCount = (storedRecord.verificationCount || 0) + 1;
            storedRecord.lastVerifiedAt = new Date();
            storedRecord.successfulVerifications = (storedRecord.successfulVerifications || 0) + 1;
            storedRecord.lastSimilarityScore = similarityScore;
            await storedRecord.save();

            user.lastBiometricVerification = new Date();
            user.verificationScore = this.calculateVerificationScore(user, storedRecord);
            user.totalVerifications = (user.totalVerifications || 0) + 1;
            await user.save();

            this.clearVerificationAttempts(user.walletAddress);
            logBiometricActivity(user.walletAddress, 'biometric_verified', {
                patternType,
                similarityScore,
                verificationCount: storedRecord.verificationCount,
                fingerprintSimilarity
            });

            return {
                success: true,
                message: API_RESPONSES.BIOMETRIC_VERIFICATION_SUCCESS,
                similarityScore,
                fingerprintSimilarity,
                verificationCount: storedRecord.verificationCount,
                isVerified: true,
                verificationScore: user.verificationScore
            };

        } catch (error) {
            logSecurityEvent(user.walletAddress, 'biometric_verification_error', {
                error: error.message,
                patternType
            });
            throw error;
        }
    }

    /**
     * Get user's biometric status and records
     */
    async getBiometricStatus(walletAddress) {
        try {
            const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
            if (!user) {
                throw new Error(API_RESPONSES.USER_NOT_FOUND);
            }

            const biometricRecords = await BiometricHash.find({
                userId: user._id,
                isActive: true
            }).select('patternType qualityScore registeredAt verificationCount lastVerifiedAt metadata fingerprint');

            const status = {
                hasBiometric: user.hasBiometric,
                isVerified: user.isVerified,
                verificationScore: user.verificationScore || 0,
                lastVerification: user.lastBiometricVerification,
                biometricTypes: user.biometricTypes || [],
                totalVerifications: user.totalVerifications || 0,
                biometricRecords,
                stats: {
                    totalVerifications: biometricRecords.reduce((sum, record) => 
                        sum + (record.verificationCount || 0), 0),
                    successfulVerifications: biometricRecords.reduce((sum, record) => 
                        sum + (record.successfulVerifications || 0), 0),
                    averageQuality: biometricRecords.length > 0 ? 
                        biometricRecords.reduce((sum, record) => sum + record.qualityScore, 0) / biometricRecords.length : 0,
                    successRate: biometricRecords.reduce((sum, record) => {
                        const rate = record.verificationCount > 0 ? 
                            (record.successfulVerifications || 0) / record.verificationCount : 0;
                        return sum + rate;
                    }, 0) / (biometricRecords.length || 1)
                }
            };

            return {
                success: true,
                status,
                message: API_RESPONSES.BIOMETRIC_STATUS_RETRIEVED
            };

        } catch (error) {
            logSecurityEvent(walletAddress, 'biometric_status_error', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Update existing biometric pattern
     */
    async updateBiometricPattern(userId, patternType, newPattern, signature) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error(API_RESPONSES.USER_NOT_FOUND);
            }

            // Verify signature
            await this.verifyBiometricSignature(user.walletAddress, signature, 'update');

            // Extract and validate new pattern using BiometricUtils
            let extractedPattern, qualityScore;
            
            if (patternType === BIOMETRIC_TYPES.FACIAL) {
                const result = BiometricUtils.extractFacialPattern(newPattern);
                extractedPattern = result.pattern;
                qualityScore = result.quality;
            } else {
                const result = BiometricUtils.extractBehavioralPattern(newPattern);
                extractedPattern = result.pattern;
                qualityScore = result.quality;
            }

            const qualityValidation = BiometricUtils.validatePatternQuality(extractedPattern, patternType);
            if (!qualityValidation.isValid) {
                throw new Error(API_RESPONSES.PATTERN_QUALITY_LOW);
            }

            // Deactivate old pattern
            await BiometricHash.updateMany(
                { userId, patternType, isActive: true },
                { 
                    isActive: false, 
                    deactivatedAt: new Date(),
                    deactivationReason: 'pattern_update'
                }
            );

            // Register new pattern with fingerprint
            const fingerprint = BiometricUtils.generatePatternFingerprint(extractedPattern);
            return await this.registerBiometricPattern(user, extractedPattern, patternType, qualityScore, fingerprint);

        } catch (error) {
            logSecurityEvent(user.walletAddress, 'biometric_update_error', {
                error: error.message,
                patternType
            });
            throw error;
        }
    }

    /**
     * Remove biometric pattern
     */
    async removeBiometricPattern(userId, patternType, signature) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error(API_RESPONSES.USER_NOT_FOUND);
            }

            await this.verifyBiometricSignature(user.walletAddress, signature, 'removal');

            const result = await BiometricHash.updateMany(
                { userId, patternType, isActive: true },
                { 
                    isActive: false, 
                    deactivatedAt: new Date(),
                    deactivationReason: 'user_requested'
                }
            );

            if (result.modifiedCount === 0) {
                throw new Error(API_RESPONSES.BIOMETRIC_NOT_FOUND);
            }

            // Update user's biometric types
            user.biometricTypes = user.biometricTypes?.filter(type => type !== patternType) || [];

            // Check if user has any active biometrics left
            const activeBiometrics = await BiometricHash.countDocuments({
                userId,
                isActive: true
            });

            if (activeBiometrics === 0) {
                user.hasBiometric = false;
                user.isVerified = false;
            }
            await user.save();

            logBiometricActivity(user.walletAddress, 'biometric_removed', { 
                patternType,
                remainingBiometrics: activeBiometrics 
            });

            return {
                success: true,
                message: API_RESPONSES.BIOMETRIC_REMOVED_SUCCESS,
                patternType,
                remainingBiometrics: activeBiometrics,
                remainingTypes: user.biometricTypes
            };

        } catch (error) {
            logSecurityEvent(user.walletAddress, 'biometric_removal_error', {
                error: error.message,
                patternType
            });
            throw error;
        }
    }

    // ==================== ENHANCED UTILITY METHODS ====================

    /**
     * Verify biometric-related signatures using CryptoUtils
     */
    async verifyBiometricSignature(walletAddress, signature, action) {
        const message = `NeuroCredit Biometric ${action}: ${walletAddress}`;
        const signerAddress = this.web3.eth.accounts.recover(message, signature);
        
        if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            throw new Error(API_RESPONSES.INVALID_SIGNATURE);
        }
        return true;
    }

    /**
     * Hash biometric pattern securely with enhanced security
     */
    async hashBiometricPattern(pattern) {
        try {
            // Normalize pattern first
            const normalizedPattern = BiometricUtils.normalizePattern(pattern, pattern.patternType);
            const patternString = JSON.stringify(normalizedPattern);
            
            // Use configured salt rounds or default
            const saltRounds = parseInt(process.env.BIOMETRIC_HASH_SALT_ROUNDS) || 12;
            return await bcrypt.hash(patternString, saltRounds);
        } catch (error) {
            throw new Error(`Biometric pattern hashing failed: ${error.message}`);
        }
    }

    /**
     * Compare biometric patterns with enhanced validation
     */
    async compareBiometricPatterns(inputPattern, storedHash) {
        try {
            const inputString = JSON.stringify(inputPattern);
            return await bcrypt.compare(inputString, storedHash);
        } catch (error) {
            throw new Error(`Pattern comparison failed: ${error.message}`);
        }
    }

    /**
     * Calculate enhanced similarity score between patterns
     */
    async calculateSimilarityScore(inputPattern, storedHash) {
        try {
            // First check exact match
            const isExactMatch = await this.compareBiometricPatterns(inputPattern, storedHash);
            if (isExactMatch) return 1.0;

            // For non-exact matches, use advanced similarity calculation
            // This would integrate with proper pattern matching algorithms in production
            return BiometricUtils.calculatePatternSimilarity(inputPattern, JSON.parse(storedHash), inputPattern.patternType);
        } catch (error) {
            return 0.0;
        }
    }

    /**
     * Compare pattern fingerprints for quick verification
     */
    compareFingerprints(fingerprint1, fingerprint2) {
        if (!fingerprint1 || !fingerprint2) return 0.0;
        
        let similarity = 0;
        const totalFeatures = Object.keys(fingerprint1).length;
        
        for (const key in fingerprint1) {
            if (fingerprint2[key] !== undefined) {
                if (typeof fingerprint1[key] === 'number' && typeof fingerprint2[key] === 'number') {
                    similarity += 1 - Math.abs(fingerprint1[key] - fingerprint2[key]);
                } else if (fingerprint1[key] === fingerprint2[key]) {
                    similarity += 1;
                }
            }
        }
        
        return similarity / totalFeatures;
    }

    /**
     * Enhanced rate limiting for verification attempts
     */
    isVerificationRateLimited(walletAddress) {
        const attempts = this.verificationAttempts.get(walletAddress) || { 
            count: 0, 
            lastAttempt: 0,
            firstAttempt: Date.now()
        };
        const now = Date.now();
        
        // Reset counter if last attempt was more than 15 minutes ago
        if (now - attempts.lastAttempt > 15 * 60 * 1000) {
            attempts.count = 0;
            attempts.firstAttempt = now;
        }

        // Implement progressive blocking
        if (attempts.count >= 10) {
            return true; // Hard block
        } else if (attempts.count >= 5) {
            // Progressive delay
            const timeSinceFirstAttempt = now - attempts.firstAttempt;
            if (timeSinceFirstAttempt < 5 * 60 * 1000) { // 5 minutes
                return true;
            }
        }

        return false;
    }

    /**
     * Record failed verification attempt with enhanced tracking
     */
    recordFailedVerification(walletAddress) {
        const attempts = this.verificationAttempts.get(walletAddress) || { 
            count: 0, 
            lastAttempt: 0,
            firstAttempt: Date.now(),
            history: []
        };
        
        attempts.count++;
        attempts.lastAttempt = Date.now();
        attempts.history.push({
            timestamp: new Date(),
            type: 'failed_verification'
        });
        
        // Keep only last 10 attempts in history
        if (attempts.history.length > 10) {
            attempts.history = attempts.history.slice(-10);
        }
        
        this.verificationAttempts.set(walletAddress, attempts);
    }

    /**
     * Clear verification attempts on success
     */
    clearVerificationAttempts(walletAddress) {
        this.verificationAttempts.delete(walletAddress);
    }

    /**
     * Calculate comprehensive verification score for user
     */
    calculateVerificationScore(user, biometricRecord) {
        if (!biometricRecord.verificationCount || biometricRecord.verificationCount === 0) {
            return biometricRecord.qualityScore * 100;
        }

        const baseScore = biometricRecord.qualityScore * 100;
        const successRate = biometricRecord.successfulVerifications / biometricRecord.verificationCount;
        const recencyBonus = this.calculateRecencyBonus(biometricRecord.lastVerifiedAt);
        const consistencyBonus = this.calculateConsistencyBonus(biometricRecord);
        
        let score = baseScore * successRate + recencyBonus + consistencyBonus;
        
        // Apply penalties for recent failures
        const failurePenalty = this.calculateFailurePenalty(user.walletAddress);
        score = Math.max(0, score - failurePenalty);
        
        return Math.min(score, 100);
    }

    calculateRecencyBonus(lastVerified) {
        const hoursSinceVerification = (Date.now() - lastVerified) / (1000 * 60 * 60);
        return Math.max(0, 10 - (hoursSinceVerification / 24)); // Bonus decreases over days
    }

    calculateConsistencyBonus(biometricRecord) {
        if (!biometricRecord.lastSimilarityScore) return 0;
        
        // Reward consistent high similarity scores
        return Math.max(0, (biometricRecord.lastSimilarityScore - 0.8) * 20);
    }

    calculateFailurePenalty(walletAddress) {
        const attempts = this.verificationAttempts.get(walletAddress);
        if (!attempts) return 0;
        
        // Penalize based on recent failure rate
        const recentFailures = attempts.history.filter(attempt => 
            Date.now() - attempt.timestamp < 60 * 60 * 1000 // Last hour
        ).length;
        
        return recentFailures * 5; // 5 points per recent failure
    }
}

module.exports = new BiometricService();