// backend/src/middleware/biometricMiddleware.js
const biometricService = require('../services/biometricService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware to validate biometric data format
 */
const validateBiometricData = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Biometric data validation failed',
            errors: errors.array()
        });
    }

    const { videoData, sensorData, timestamp } = req.body;

    // Basic data validation
    if (!videoData || !sensorData) {
        return res.status(400).json({
            success: false,
            message: 'Video data and sensor data are required'
        });
    }

    // Check data recency (within last 5 minutes)
    const dataTimestamp = new Date(timestamp);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    if (dataTimestamp < fiveMinutesAgo) {
        return res.status(400).json({
            success: false,
            message: 'Biometric data is too old'
        });
    }

    logger.debug('Biometric data validation passed');
    next();
};

/**
 * Middleware to process and analyze biometric patterns
 */
const processBiometricPatterns = async (req, res, next) => {
    try {
        const { videoData, sensorData, userId } = req.body;
        
        logger.info('Processing biometric patterns', { userId });

        // Extract patterns from video data
        const patterns = await biometricService.extractPatterns(videoData, sensorData);
        
        if (!patterns || patterns.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No detectable patterns found in biometric data'
            });
        }

        // Generate unique bio-hash
        const bioHash = await biometricService.generateBioHash(patterns);
        
        if (!bioHash) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate biometric hash'
            });
        }

        // Check for duplicates (prevent Sybil attacks)
        const isDuplicate = await biometricService.checkDuplicateBioHash(bioHash);
        
        if (isDuplicate) {
            return res.status(409).json({
                success: false,
                message: 'Biometric pattern already registered'
            });
        }

        // Attach processed data to request
        req.biometricData = {
            patterns,
            bioHash,
            qualityScore: await biometricService.calculateQualityScore(patterns),
            processedAt: new Date()
        };

        logger.info('Biometric patterns processed successfully', { 
            userId, 
            patternsCount: patterns.length,
            qualityScore: req.biometricData.qualityScore 
        });

        next();
    } catch (error) {
        logger.error('Biometric pattern processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Biometric processing failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * Middleware to verify biometric pattern quality
 */
const verifyBiometricQuality = (req, res, next) => {
    const { qualityScore } = req.biometricData;

    // Minimum quality threshold (0-100 scale)
    const MIN_QUALITY_SCORE = 70;

    if (qualityScore < MIN_QUALITY_SCORE) {
        return res.status(400).json({
            success: false,
            message: 'Biometric data quality insufficient for verification',
            details: {
                qualityScore,
                minimumRequired: MIN_QUALITY_SCORE,
                suggestion: 'Please ensure good lighting and stable camera position'
            }
        });
    }

    logger.debug('Biometric quality verification passed', { qualityScore });
    next();
};

/**
 * Middleware to rate limit biometric verification attempts
 */
const rateLimitBiometricAttempts = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.body.userId;
        const clientIP = req.ip || req.connection.remoteAddress;

        if (!userId) {
            return next(); // Skip if no user context
        }

        const attempts = await biometricService.getRecentAttempts(userId, clientIP);
        const MAX_ATTEMPTS = 5;
        const TIME_WINDOW = 15 * 60 * 1000; // 15 minutes

        if (attempts >= MAX_ATTEMPTS) {
            return res.status(429).json({
                success: false,
                message: 'Too many biometric verification attempts',
                details: {
                    attempts,
                    maxAttempts: MAX_ATTEMPTS,
                    retryAfter: '15 minutes'
                }
            });
        }

        // Record this attempt
        await biometricService.recordAttempt(userId, clientIP);

        next();
    } catch (error) {
        logger.error('Rate limiting error:', error);
        // Don't block request if rate limiting fails
        next();
    }
};

/**
 * Middleware to validate biometric verification for NFT minting
 */
const validateBiometricForNFT = async (req, res, next) => {
    try {
        const userId = req.user._id;
        
        // Check if user is already verified
        const userService = require('../services/userService');
        const user = await userService.getUserById(userId);
        
        if (user.isBiometricVerified) {
            return res.status(400).json({
                success: false,
                message: 'User already biometric verified'
            });
        }

        // Check if user already has NFT
        if (user.hasHumanityNFT) {
            return res.status(400).json({
                success: false,
                message: 'User already has Humanity NFT'
            });
        }

        next();
    } catch (error) {
        logger.error('Biometric NFT validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification validation failed'
        });
    }
};

module.exports = {
    validateBiometricData,
    processBiometricPatterns,
    verifyBiometricQuality,
    rateLimitBiometricAttempts,
    validateBiometricForNFT
};