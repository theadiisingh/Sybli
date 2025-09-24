// backend/src/middleware/validationMiddleware.js
const { body, param, query, validationResult } = require('express-validator');
const userService = require('../services/userService');

/**
 * Common validation rules
 */
const validationRules = {
    // User validation
    userRegistration: [
        body('username')
            .isLength({ min: 3, max: 30 })
            .withMessage('Username must be between 3 and 30 characters')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username can only contain letters, numbers, and underscores'),

        body('walletAddress')
            .isLength({ min: 42, max: 42 })
            .withMessage('Valid wallet address required')
            .matches(/^0x[a-fA-F0-9]{40}$/)
            .withMessage('Invalid Ethereum address format'),

        body('email')
            .optional()
            .isEmail()
            .withMessage('Valid email address required')
            .normalizeEmail()
    ],

    // Biometric validation
    validateBiometricData: [
        body('biometricData')
            .exists()
            .withMessage('Biometric data is required'),

        body('deviceInfo')
            .exists()
            .withMessage('Device info is required'),

        body('consentGiven')
            .isBoolean()
            .withMessage('Consent must be a boolean value')
    ],

    validateBiometricAnalysis: [
        body('biometricData')
            .exists()
            .withMessage('Biometric data is required'),

        body('verificationType')
            .optional()
            .isIn(['login', 'transaction', 'high_security'])
            .withMessage('Invalid verification type')
    ],

    validateConsentUpdate: [
        body('consentGiven')
            .isBoolean()
            .withMessage('Consent must be a boolean value')
    ],

    validateDataDeletion: [
        body('confirmation')
            .equals('DELETE_MY_BIOMETRIC_DATA')
            .withMessage('Confirmation phrase required')
    ],

    validateAdminAccess: [
        // This will be checked in the controller
    ],

    // NFT validation
    validateNFTMint: [
        body('walletAddress')
            .isLength({ min: 42, max: 42 })
            .withMessage('Valid wallet address required')
            .matches(/^0x[a-fA-F0-9]{40}$/)
            .withMessage('Invalid Ethereum address format')
    ],

    validateNFTTransfer: [
        body('toAddress')
            .isLength({ min: 42, max: 42 })
            .withMessage('Valid recipient address required')
            .matches(/^0x[a-fA-F0-9]{40}$/)
            .withMessage('Invalid recipient address format'),

        body('tokenId')
            .isInt({ min: 0 })
            .withMessage('Valid token ID required')
    ],

    // DAO proposal validation
    validateProposalCreation: [
        body('title')
            .isLength({ min: 5, max: 200 })
            .withMessage('Title must be between 5 and 200 characters'),

        body('description')
            .isLength({ min: 10, max: 2000 })
            .withMessage('Description must be between 10 and 2000 characters'),

        body('options')
            .isArray({ min: 2, max: 5 })
            .withMessage('Proposal must have between 2 and 5 options'),

        body('options.*')
            .isLength({ min: 1, max: 200 })
            .withMessage('Each option must be between 1 and 200 characters'),

        body('durationHours')
            .optional()
            .isInt({ min: 1, max: 168 })
            .withMessage('Duration must be between 1 and 168 hours')
    ],

    // Voting validation
    validateVote: [
        body('optionIndex')
            .isInt({ min: 0, max: 4 })
            .withMessage('Valid option index required (0-4)'),

        body('walletAddress')
            .isLength({ min: 42, max: 42 })
            .withMessage('Valid wallet address required')
            .matches(/^0x[a-fA-F0-9]{40}$/)
            .withMessage('Invalid Ethereum address format')
    ],

    // Pagination validation
    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
    ],

    // ID parameter validation
    mongoIdParam: [
        param('id')
            .isMongoId()
            .withMessage('Valid MongoDB ID required')
    ],

    // Wallet address parameter validation
    walletAddressParam: [
        param('walletAddress')
            .isLength({ min: 42, max: 42 })
            .withMessage('Valid wallet address required')
            .matches(/^0x[a-fA-F0-9]{40}$/)
            .withMessage('Invalid Ethereum address format')
    ]
};

/**
 * Custom validators
 */
const customValidators = {
    // Check if username is available
    isUsernameAvailable: async (username) => {
        const exists = await userService.checkUsernameExists(username);
        if (exists) {
            throw new Error('Username already taken');
        }
        return true;
    },

    // Check if wallet is not already registered
    isWalletUnique: async (walletAddress) => {
        const user = await userService.getUserByWalletAddress(walletAddress);
        if (user) {
            throw new Error('Wallet address already registered');
        }
        return true;
    },

    // Validate bio-hash format and uniqueness
    isValidBioHash: async (bioHash) => {
        if (!/^[a-fA-F0-9]{64}$/.test(bioHash)) {
            throw new Error('Invalid bio-hash format');
        }
        
        // In a real implementation, check against existing hashes
        // const exists = await biometricService.checkDuplicateBioHash(bioHash);
        // if (exists) {
        //     throw new Error('Biometric pattern already registered');
        // }
        
        return true;
    }
};

/**
 * Validation result handler middleware
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.param,
            message: error.msg,
            value: error.value
        }));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errorMessages
        });
    }
    
    next();
};

/**
 * Sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
    // Sanitize string inputs
    if (req.body.username) {
        req.body.username = req.body.username.trim().replace(/[^a-zA-Z0-9_]/g, '');
    }
    
    if (req.body.email) {
        req.body.email = req.body.email.trim().toLowerCase();
    }
    
    if (req.body.walletAddress) {
        req.body.walletAddress = req.body.walletAddress.trim().toLowerCase();
    }
    
    // Sanitize text fields
    if (req.body.title) {
        req.body.title = req.body.title.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    
    if (req.body.description) {
        req.body.description = req.body.description.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    next();
};

/**
 * File upload validation
 */
const validateFileUpload = (allowedTypes, maxSize) => {
    return (req, res, next) => {
        if (!req.file) {
            return next();
        }

        // Check file type
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
            });
        }

        // Check file size
        if (req.file.size > maxSize) {
            return res.status(400).json({
                success: false,
                message: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`
            });
        }

        next();
    };
};

module.exports = {
    validationRules,
    customValidators,
    handleValidationErrors,
    sanitizeInput,
    validateFileUpload
};