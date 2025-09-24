/**
 * Biometric Controller
 * Handles biometric data processing and analysis
 */

const biometricService = require('../services/biometricService');
const userService = require('../services/userService');
const hashingService = require('../services/hashingService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * @desc    Process and store biometric data for user verification
 * @route   POST /api/biometric/process
 * @access  Private
 */
const processBiometricData = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { biometricData, deviceInfo, consentGiven } = req.body;
        const userId = req.user.id;

        logger.info('Processing biometric data', { userId, deviceInfo: deviceInfo?.deviceType });

        // Verify user consent
        if (!consentGiven) {
            return res.status(400).json({
                success: false,
                message: 'User consent required for biometric processing'
            });
        }

        // Check if user already has biometric verification
        const user = await userService.getUserById(userId);
        if (user.isBiometricVerified) {
            return res.status(400).json({
                success: false,
                message: 'User is already biometrically verified'
            });
        }

        // Process biometric data
        const processingResult = await biometricService.processBiometricData(
            biometricData,
            deviceInfo
        );

        if (!processingResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Biometric data processing failed',
                details: processingResult.error
            });
        }

        // Generate unique biometric hash
        const bioHash = await hashingService.generateBiometricHash(
            biometricData,
            userId,
            deviceInfo
        );

        // Check for hash collisions (duplicate identities)
        const existingHash = await biometricService.findByHash(bioHash);
        if (existingHash && existingHash.userId !== userId) {
            logger.warn('Biometric hash collision detected', { userId, existingUserId: existingHash.userId });
            return res.status(409).json({
                success: false,
                message: 'Biometric data matches existing verified user'
            });
        }

        // Store biometric hash
        const biometricRecord = await biometricService.storeBiometricHash({
            userId: userId,
            bioHash: bioHash,
            deviceInfo: deviceInfo,
            metadata: processingResult.metadata,
            consentGiven: consentGiven,
            createdAt: new Date()
        });

        // Update user verification status
        await userService.updateBiometricStatus(userId, true);

        logger.info('Biometric verification completed successfully', { userId, bioHash: bioHash.substring(0, 8) + '...' });

        res.status(200).json({
            success: true,
            message: 'Biometric verification completed successfully',
            data: {
                verificationId: biometricRecord._id,
                bioHash: bioHash.substring(0, 16) + '...', // Partial hash for reference
                verifiedAt: new Date(),
                processingMetadata: processingResult.metadata
            }
        });

    } catch (error) {
        logger.error('Error processing biometric data:', error);
        res.status(500).json({
            success: false,
            message: 'Biometric processing failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Analyze biometric patterns for verification
 * @route   POST /api/biometric/analyze
 * @access  Private
 */
const analyzePattern = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { biometricData, verificationType = 'login' } = req.body;
        const userId = req.user.id;

        logger.info('Analyzing biometric pattern', { userId, verificationType });

        // Get user's stored biometric data
        const storedBiometric = await biometricService.getUserBiometricData(userId);
        if (!storedBiometric) {
            return res.status(404).json({
                success: false,
                message: 'No biometric data found for user'
            });
        }

        // Analyze pattern match
        const analysisResult = await biometricService.analyzeBiometricPattern(
            biometricData,
            storedBiometric,
            verificationType
        );

        if (!analysisResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Biometric verification failed',
                details: analysisResult.error
            });
        }

        // Update verification count and timestamp
        await userService.updateUser(userId, {
            lastVerification: new Date(),
            $inc: { verificationCount: 1 }
        });

        logger.info('Biometric pattern analysis successful', {
            userId,
            confidence: analysisResult.confidence,
            verificationType
        });

        res.status(200).json({
            success: true,
            message: 'Biometric verification successful',
            data: {
                verified: true,
                confidence: analysisResult.confidence,
                verificationType: verificationType,
                verifiedAt: new Date(),
                analysisMetadata: analysisResult.metadata
            }
        });

    } catch (error) {
        logger.error('Error analyzing biometric pattern:', error);
        res.status(500).json({
            success: false,
            message: 'Biometric analysis failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get user's biometric verification status
 * @route   GET /api/biometric/status
 * @access  Private
 */
const getBiometricStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await userService.getUserById(userId);
        const biometricData = await biometricService.getUserBiometricData(userId);

        const status = {
            isBiometricVerified: user.isBiometricVerified,
            lastVerification: user.lastVerification,
            verificationCount: user.verificationCount || 0,
            hasStoredBiometricData: !!biometricData,
            biometricDataCreated: biometricData?.createdAt,
            deviceInfo: biometricData?.deviceInfo,
            consentGiven: biometricData?.consentGiven
        };

        res.status(200).json({
            success: true,
            data: status
        });

    } catch (error) {
        logger.error('Error fetching biometric status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch biometric status',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Update biometric consent status
 * @route   PUT /api/biometric/consent
 * @access  Private
 */
const updateBiometricConsent = async (req, res) => {
    try {
        const { consentGiven } = req.body;
        const userId = req.user.id;

        if (typeof consentGiven !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Consent must be a boolean value'
            });
        }

        // Update biometric record
        const updated = await biometricService.updateBiometricConsent(userId, consentGiven);

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'No biometric data found for user'
            });
        }

        logger.info('Biometric consent updated', { userId, consentGiven });

        res.status(200).json({
            success: true,
            message: 'Biometric consent updated successfully',
            data: {
                consentGiven,
                updatedAt: new Date()
            }
        });

    } catch (error) {
        logger.error('Error updating biometric consent:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update biometric consent',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Delete user's biometric data (GDPR compliance)
 * @route   DELETE /api/biometric/data
 * @access  Private
 */
const deleteBiometricData = async (req, res) => {
    try {
        const userId = req.user.id;
        const { confirmation } = req.body;

        if (confirmation !== 'DELETE_MY_BIOMETRIC_DATA') {
            return res.status(400).json({
                success: false,
                message: 'Confirmation phrase required to delete biometric data'
            });
        }

        logger.warn('Biometric data deletion requested', { userId });

        // Delete biometric records
        const deleted = await biometricService.deleteUserBiometricData(userId);

        // Update user status
        await userService.updateBiometricStatus(userId, false);

        logger.warn('Biometric data deleted', { userId });

        res.status(200).json({
            success: true,
            message: 'Biometric data has been permanently deleted'
        });

    } catch (error) {
        logger.error('Error deleting biometric data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete biometric data',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get biometric verification statistics (admin only)
 * @route   GET /api/biometric/stats
 * @access  Private/Admin
 */
const getBiometricStats = async (req, res) => {
    try {
        // Check admin permissions
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const stats = await biometricService.getBiometricStats();

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Error fetching biometric stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch biometric statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Verify biometric hash uniqueness (admin only)
 * @route   POST /api/biometric/verify-hash
 * @access  Private/Admin
 */
const verifyBiometricHash = async (req, res) => {
    try {
        // Check admin permissions
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const { bioHash } = req.body;

        if (!bioHash) {
            return res.status(400).json({
                success: false,
                message: 'Biometric hash is required'
            });
        }

        const existingRecord = await biometricService.findByHash(bioHash);

        const result = {
            hash: bioHash,
            isUnique: !existingRecord,
            existingUserId: existingRecord?.userId || null,
            verified: !!existingRecord
        };

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Error verifying biometric hash:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify biometric hash',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

module.exports = {
    processBiometricData,
    analyzePattern,
    getBiometricStatus,
    updateBiometricConsent,
    deleteBiometricData,
    getBiometricStats,
    verifyBiometricHash
};
