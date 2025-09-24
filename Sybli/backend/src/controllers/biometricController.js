const { Web3 } = require('web3');
const bcrypt = require('bcryptjs');
const User = require('../../../database/models/User');
const BiometricHash = require('../../../database/models/BiometricHash');
const { validateEthAddress, validateBiometricData } = require('../utils/validationUtils');
const { extractFacialPattern, extractBehavioralPattern, comparePatterns } = require('../utils/biometricUtils');
const { generateBiometricToken, hashBiometricData } = require('../services/hashingService');
const { API_RESPONSES, BIOMETRIC, PATTERN_THRESHOLDS } = require('../utils/constants');
const BIOMETRIC_TYPES = BIOMETRIC.TYPES;
const { logBiometricActivity, logSecurityEvent } = require('../utils/logger');

/**
 * Biometric Controller - Handles facial and behavioral pattern processing
 */

class BiometricController {
    constructor() {
        this.web3 = new Web3();
        this.patternStorage = new Map(); // Temporary storage for pattern analysis
    }

    /**
     * Extract and analyze biometric patterns from video/data
     */
    processBiometricPattern = async (req, res) => {
        try {
            const { walletAddress, videoData, behavioralData, patternType, signature } = req.body;

            // Validate inputs
            if (!validateEthAddress(walletAddress) || !signature) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.INVALID_INPUT
                });
            }

            // Verify signature for security
            const message = `NeuroCredit Biometric Processing: ${walletAddress}`;
            const signerAddress = this.web3.eth.accounts.recover(message, signature);

            if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                return res.status(401).json({
                    success: false,
                    error: API_RESPONSES.INVALID_SIGNATURE
                });
            }

            const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: API_RESPONSES.USER_NOT_FOUND
                });
            }

            let extractedPattern;
            let patternQuality = 0;

            // Process based on pattern type
            switch (patternType) {
                case BIOMETRIC_TYPES.FACIAL:
                    if (!videoData) {
                        return res.status(400).json({
                            success: false,
                            error: API_RESPONSES.MISSING_VIDEO_DATA
                        });
                    }
                    extractedPattern = await this.processFacialPattern(videoData);
                    patternQuality = this.calculatePatternQuality(extractedPattern);
                    break;

                case BIOMETRIC_TYPES.BEHAVIORAL:
                    if (!behavioralData) {
                        return res.status(400).json({
                            success: false,
                            error: API_RESPONSES.MISSING_BEHAVIORAL_DATA
                        });
                    }
                    extractedPattern = await this.processBehavioralPattern(behavioralData);
                    patternQuality = this.calculatePatternQuality(extractedPattern);
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        error: API_RESPONSES.INVALID_PATTERN_TYPE
                    });
            }

            // Check pattern quality threshold
            if (patternQuality < PATTERN_THRESHOLDS.MINIMUM_QUALITY) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.PATTERN_QUALITY_LOW,
                    qualityScore: patternQuality,
                    minimumRequired: PATTERN_THRESHOLDS.MINIMUM_QUALITY
                });
            }

            // Store pattern temporarily for verification step
            const sessionId = generateBiometricToken();
            this.patternStorage.set(sessionId, {
                pattern: extractedPattern,
                patternType,
                walletAddress: walletAddress.toLowerCase(),
                timestamp: Date.now(),
                quality: patternQuality
            });

            // Set expiration (10 minutes)
            setTimeout(() => {
                this.patternStorage.delete(sessionId);
            }, 10 * 60 * 1000);

            logBiometricActivity(walletAddress, 'pattern_processed', {
                patternType,
                quality: patternQuality,
                sessionId
            });

            res.json({
                success: true,
                sessionId,
                patternType,
                qualityScore: patternQuality,
                message: API_RESPONSES.PATTERN_PROCESSED_SUCCESS,
                nextStep: 'verify_biometric' // Guide frontend to next step
            });

        } catch (error) {
            console.error('Biometric pattern processing error:', error);
            res.status(500).json({
                success: false,
                error: API_RESPONSES.PATTERN_PROCESSING_FAILED
            });
        }
    };

    /**
     * Verify biometric pattern against stored hash
     */
    verifyBiometricPattern = async (req, res) => {
        try {
            const { sessionId, confirmation, signature } = req.body;

            if (!sessionId || !signature) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.INVALID_INPUT
                });
            }

            // Retrieve stored pattern
            const storedPattern = this.patternStorage.get(sessionId);
            if (!storedPattern) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.INVALID_OR_EXPIRED_SESSION
                });
            }

            // Clean up stored pattern
            this.patternStorage.delete(sessionId);

            const { pattern, patternType, walletAddress, quality } = storedPattern;

            // Verify signature
            const message = `NeuroCredit Biometric Verification: ${sessionId}`;
            const signerAddress = this.web3.eth.accounts.recover(message, signature);

            if (signerAddress.toLowerCase() !== walletAddress) {
                return res.status(401).json({
                    success: false,
                    error: API_RESPONSES.INVALID_SIGNATURE
                });
            }

            const user = await User.findOne({ walletAddress });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: API_RESPONSES.USER_NOT_FOUND
                });
            }

            if (confirmation === 'register') {
                // Register new biometric pattern
                return await this.registerBiometricPattern(user, pattern, patternType, quality, res);
            } else if (confirmation === 'verify') {
                // Verify against existing pattern
                return await this.verifyAgainstStoredPattern(user, pattern, patternType, res);
            } else {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.INVALID_VERIFICATION_ACTION
                });
            }

        } catch (error) {
            console.error('Biometric verification error:', error);
            res.status(500).json({
                success: false,
                error: API_RESPONSES.BIOMETRIC_VERIFICATION_FAILED
            });
        }
    };

    /**
     * Register a new biometric pattern
     */
    registerBiometricPattern = async (user, pattern, patternType, quality, res) => {
        try {
            // Check if user already has this pattern type registered
            const existingPattern = await BiometricHash.findOne({
                userId: user._id,
                patternType,
                isActive: true
            });

            if (existingPattern) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.BIOMETRIC_ALREADY_REGISTERED
                });
            }

            // Generate secure hash of the pattern
            const patternHash = await hashBiometricData(pattern);

            // Create new biometric record
            const biometricRecord = new BiometricHash({
                userId: user._id,
                hash: patternHash,
                patternType,
                qualityScore: quality,
                isActive: true,
                registeredAt: new Date()
            });

            await biometricRecord.save();

            // Update user's biometric status
            user.hasBiometric = true;
            user.isVerified = true;
            user.lastBiometricUpdate = new Date();
            await user.save();

            logBiometricActivity(user.walletAddress, 'biometric_registered', {
                patternType,
                quality,
                recordId: biometricRecord._id
            });

            res.json({
                success: true,
                message: API_RESPONSES.BIOMETRIC_REGISTERED_SUCCESS,
                patternType,
                qualityScore: quality,
                registeredAt: biometricRecord.registeredAt
            });

        } catch (error) {
            console.error('Biometric registration error:', error);
            throw error;
        }
    };

    /**
     * Verify against stored biometric pattern
     */
    verifyAgainstStoredPattern = async (user, inputPattern, patternType, res) => {
        try {
            // Get stored pattern hash
            const storedRecord = await BiometricHash.findOne({
                userId: user._id,
                patternType,
                isActive: true
            });

            if (!storedRecord) {
                return res.status(404).json({
                    success: false,
                    error: API_RESPONSES.BIOMETRIC_NOT_REGISTERED
                });
            }

            // Verify the pattern matches
            const isMatch = await bcrypt.compare(JSON.stringify(inputPattern), storedRecord.hash);

            if (!isMatch) {
                logSecurityEvent(user.walletAddress, 'biometric_verification_failed', { patternType });
                return res.status(401).json({
                    success: false,
                    error: API_RESPONSES.BIOMETRIC_VERIFICATION_FAILED,
                    similarityScore: 0.0
                });
            }

            // Update verification stats
            storedRecord.verificationCount = (storedRecord.verificationCount || 0) + 1;
            storedRecord.lastVerifiedAt = new Date();
            await storedRecord.save();

            user.lastBiometricVerification = new Date();
            await user.save();

            logBiometricActivity(user.walletAddress, 'biometric_verified', {
                patternType,
                verificationCount: storedRecord.verificationCount
            });

            res.json({
                success: true,
                message: API_RESPONSES.BIOMETRIC_VERIFICATION_SUCCESS,
                similarityScore: 1.0, // Perfect match
                verificationCount: storedRecord.verificationCount,
                isVerified: true
            });

        } catch (error) {
            console.error('Biometric verification error:', error);
            throw error;
        }
    };

    /**
     * Get user's biometric status
     */
    getBiometricStatus = async (req, res) => {
        try {
            const { walletAddress } = req.params;
            const userId = req.user?.userId;

            if (!validateEthAddress(walletAddress)) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.INVALID_ETH_ADDRESS
                });
            }

            const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: API_RESPONSES.USER_NOT_FOUND
                });
            }

            // Get all active biometric records for user
            const biometricRecords = await BiometricHash.find({
                userId: user._id,
                isActive: true
            }).select('patternType qualityScore registeredAt verificationCount lastVerifiedAt');

            res.json({
                success: true,
                hasBiometric: user.hasBiometric,
                isVerified: user.isVerified,
                biometricRecords,
                lastVerification: user.lastBiometricVerification,
                message: API_RESPONSES.BIOMETRIC_STATUS_RETRIEVED
            });

        } catch (error) {
            console.error('Biometric status error:', error);
            res.status(500).json({
                success: false,
                error: API_RESPONSES.INTERNAL_SERVER_ERROR
            });
        }
    };

    /**
     * Update or add new biometric pattern
     */
    updateBiometricPattern = async (req, res) => {
        try {
            const { walletAddress, patternType, videoData, behavioralData, signature } = req.body;
            const userId = req.user?.userId;

            if (!userId || !validateEthAddress(walletAddress) || !signature) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.INVALID_INPUT
                });
            }

            const user = await User.findById(userId);
            if (!user || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                return res.status(404).json({
                    success: false,
                    error: API_RESPONSES.USER_NOT_FOUND
                });
            }

            // Verify signature
            const message = `NeuroCredit Biometric Update: ${walletAddress}-${patternType}`;
            const signerAddress = this.web3.eth.accounts.recover(message, signature);

            if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                return res.status(401).json({
                    success: false,
                    error: API_RESPONSES.INVALID_SIGNATURE
                });
            }

            // Process the new pattern
            let extractedPattern;
            let patternQuality;

            if (patternType === BIOMETRIC_TYPES.FACIAL && videoData) {
                extractedPattern = await this.processFacialPattern(videoData);
                patternQuality = this.calculatePatternQuality(extractedPattern);
            } else if (patternType === BIOMETRIC_TYPES.BEHAVIORAL && behavioralData) {
                extractedPattern = await this.processBehavioralPattern(behavioralData);
                patternQuality = this.calculatePatternQuality(extractedPattern);
            } else {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.INVALID_PATTERN_DATA
                });
            }

            // Check quality threshold
            if (patternQuality < PATTERN_THRESHOLDS.MINIMUM_QUALITY) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.PATTERN_QUALITY_LOW
                });
            }

            // Deactivate old pattern of same type
            await BiometricHash.updateMany(
                { userId: user._id, patternType, isActive: true },
                { isActive: false, deactivatedAt: new Date() }
            );

            // Register new pattern
            const patternHash = await hashBiometricData(extractedPattern);
            const newRecord = new BiometricHash({
                userId: user._id,
                hash: patternHash,
                patternType,
                qualityScore: patternQuality,
                isActive: true,
                registeredAt: new Date()
            });

            await newRecord.save();

            user.lastBiometricUpdate = new Date();
            await user.save();

            logBiometricActivity(walletAddress, 'biometric_updated', { patternType, quality: patternQuality });

            res.json({
                success: true,
                message: API_RESPONSES.BIOMETRIC_UPDATED_SUCCESS,
                patternType,
                qualityScore: patternQuality,
                updatedAt: newRecord.registeredAt
            });

        } catch (error) {
            console.error('Biometric update error:', error);
            res.status(500).json({
                success: false,
                error: API_RESPONSES.BIOMETRIC_UPDATE_FAILED
            });
        }
    };

    /**
     * Remove biometric pattern
     */
    removeBiometricPattern = async (req, res) => {
        try {
            const { walletAddress, patternType, signature } = req.body;
            const userId = req.user?.userId;

            if (!userId || !validateEthAddress(walletAddress) || !signature) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.INVALID_INPUT
                });
            }

            const user = await User.findById(userId);
            if (!user || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                return res.status(404).json({
                    success: false,
                    error: API_RESPONSES.USER_NOT_FOUND
                });
            }

            // Verify signature
            const message = `NeuroCredit Biometric Removal: ${walletAddress}-${patternType}`;
            const signerAddress = this.web3.eth.accounts.recover(message, signature);

            if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                return res.status(401).json({
                    success: false,
                    error: API_RESPONSES.INVALID_SIGNATURE
                });
            }

            // Deactivate the pattern
            const result = await BiometricHash.updateMany(
                { userId: user._id, patternType, isActive: true },
                { 
                    isActive: false, 
                    deactivatedAt: new Date(),
                    deactivationReason: 'user_requested'
                }
            );

            if (result.modifiedCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: API_RESPONSES.BIOMETRIC_NOT_FOUND
                });
            }

            // Check if user has any active biometrics left
            const activeBiometrics = await BiometricHash.countDocuments({
                userId: user._id,
                isActive: true
            });

            if (activeBiometrics === 0) {
                user.hasBiometric = false;
                user.isVerified = false; // Require re-verification
                await user.save();
            }

            logBiometricActivity(walletAddress, 'biometric_removed', { patternType });

            res.json({
                success: true,
                message: API_RESPONSES.BIOMETRIC_REMOVED_SUCCESS,
                patternType,
                remainingBiometrics: activeBiometrics
            });

        } catch (error) {
            console.error('Biometric removal error:', error);
            res.status(500).json({
                success: false,
                error: API_RESPONSES.BIOMETRIC_REMOVAL_FAILED
            });
        }
    };

    // ==================== HELPER METHODS ====================

    /**
     * Process facial pattern from video data
     */
    async processFacialPattern(videoData) {
        // In a real implementation, this would use computer vision libraries
        // For hackathon demo, we'll simulate pattern extraction

        const facialPattern = {
            landmarks: this.extractFacialLandmarks(videoData),
            texture: this.analyzeFacialTexture(videoData),
            geometric: this.calculateGeometricRatios(videoData),
            temporal: this.analyzeTemporalPatterns(videoData),
            timestamp: Date.now()
        };

        return facialPattern;
    }

    /**
     * Process behavioral pattern from interaction data
     */
    async processBehavioralPattern(behavioralData) {
        // Simulate behavioral pattern extraction
        const behavioralPattern = {
            mouseMovements: this.analyzeMousePatterns(behavioralData.mouseMovements),
            typingRhythm: this.analyzeTypingPatterns(behavioralData.typingData),
            interactionTiming: this.analyzeInteractionTiming(behavioralData.interactions),
            deviceCharacteristics: behavioralData.deviceInfo,
            timestamp: Date.now()
        };

        return behavioralPattern;
    }

    /**
     * Calculate pattern quality score (0-1)
     */
    calculatePatternQuality(pattern) {
        // Simple quality calculation based on pattern completeness
        let quality = 0;
        const keys = Object.keys(pattern).filter(key => key !== 'timestamp');

        keys.forEach(key => {
            if (pattern[key] && Object.keys(pattern[key]).length > 0) {
                quality += 0.2; // Each component contributes to quality
            }
        });

        return Math.min(quality, 1.0);
    }

    /**
     * Simulated pattern analysis methods (for demo purposes)
     */
    extractFacialLandmarks(videoData) {
        // Simulate facial landmark extraction
        return {
            leftEye: { x: 0.25, y: 0.35, confidence: 0.95 },
            rightEye: { x: 0.75, y: 0.35, confidence: 0.94 },
            nose: { x: 0.5, y: 0.5, confidence: 0.92 },
            mouth: { x: 0.5, y: 0.65, confidence: 0.90 }
        };
    }

    analyzeFacialTexture(videoData) {
        return {
            contrast: 0.85,
            brightness: 0.72,
            smoothness: 0.88
        };
    }

    calculateGeometricRatios(videoData) {
        return {
            eyeDistanceRatio: 0.45,
            noseMouthRatio: 0.62,
            faceSymmetry: 0.91
        };
    }

    analyzeTemporalPatterns(videoData) {
        return {
            blinkRate: 0.23,
            headMovement: 0.15,
            expressionChanges: 0.08
        };
    }

    analyzeMousePatterns(mouseMovements) {
        return {
            speedVariation: 0.75,
            movementDirectness: 0.82,
            clickPattern: 0.68
        };
    }

    analyzeTypingPatterns(typingData) {
        return {
            speed: 45, // characters per minute
            rhythmConsistency: 0.79,
            errorRate: 0.12
        };
    }

    analyzeInteractionTiming(interactions) {
        return {
            responseTime: 250, // milliseconds
            decisionTime: 1200,
            consistency: 0.85
        };
    }
}

module.exports = new BiometricController();
