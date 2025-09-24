// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const logger = require('../utils/logger');

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = async (req, res, next) => {
    try {
        const token = extractTokenFromRequest(req);
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'neurocredit-hackathon-secret');
        
        // Get user from database
        const user = await userService.getUserById(decoded.userId);
        
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User not found or account deactivated'
            });
        }

        // Attach user to request
        req.user = userService.sanitizeUser(user);
        logger.debug('User authenticated', { userId: req.user._id, wallet: req.user.walletAddress });
        
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

/**
 * Admin authorization middleware
 */
const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    
    logger.debug('Admin access granted', { userId: req.user._id });
    next();
};

/**
 * NFT ownership requirement middleware
 */
const requireNFT = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const user = await userService.getUserById(req.user._id);
        
        if (!user.hasHumanityNFT) {
            return res.status(403).json({
                success: false,
                message: 'Humanity NFT required for this action'
            });
        }

        logger.debug('NFT verification passed', { userId: req.user._id });
        next();
    } catch (error) {
        logger.error('NFT verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed'
        });
    }
};

/**
 * Biometric verification requirement middleware
 */
const requireBiometricVerification = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const user = await userService.getUserById(req.user._id);
        
        if (!user.isBiometricVerified) {
            return res.status(403).json({
                success: false,
                message: 'Biometric verification required for this action'
            });
        }

        logger.debug('Biometric verification passed', { userId: req.user._id });
        next();
    } catch (error) {
        logger.error('Biometric verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed'
        });
    }
};

/**
 * Optional authentication - attaches user if token exists
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = extractTokenFromRequest(req);
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'neurocredit-hackathon-secret');
            const user = await userService.getUserById(decoded.userId);
            
            if (user && user.isActive) {
                req.user = userService.sanitizeUser(user);
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication for optional auth
        next();
    }
};

// Helper function to extract token from request
function extractTokenFromRequest(req) {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return req.headers.authorization.substring(7);
    }
    
    if (req.query.token) {
        return req.query.token;
    }
    
    return null;
}

module.exports = {
    authenticate,
    requireAdmin,
    requireNFT,
    requireBiometricVerification,
    optionalAuth
};