const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Web3 } = require('web3');
const User = require('../../database/models/User');
const BiometricHash = require('../../database/models/BiometricHash');
const { generateAuthTokens, verifyToken, generateBiometricToken } = require('../services/hashingService');
const { validateEthAddress, validateSignature } = require('../utils/validationUtils');
const { API_RESPONSES, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../utils/constants');
const { logAuthActivity, logSecurityEvent } = require('../utils/logger');

/**
 * Authentication Controller - Handles wallet-based and biometric authentication
 */

class AuthController {
    constructor() {
        this.web3 = new Web3();
        this.loginAttempts = new Map(); // Track login attempts for rate limiting
    }

    /**
     * Generate nonce for wallet authentication
     */
    generateNonce = async (req, res) => {
        try {
            const { walletAddress } = req.body;

            // Validate Ethereum address
            if (!validateEthAddress(walletAddress)) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.INVALID_ETH_ADDRESS
                });
            }

            // Generate unique nonce
            const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

            // Store nonce in database or update existing user
            let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
            
            if (user) {
                user.authNonce = nonce;
                user.nonceExpiresAt = expiresAt;
                await user.save();
            } else {
                // Create new user record if doesn't exist
                user = new User({
                    walletAddress: walletAddress.toLowerCase(),
                    authNonce: nonce,
                    nonceExpiresAt: expiresAt,
                    isVerified: false,
                    authMethod: 'wallet'
                });
                await user.save();
            }

            logAuthActivity(walletAddress, 'nonce_generated', { nonce });

            res.json({
                success: true,
                nonce,
                expiresAt,
                message: API_RESPONSES.NONCE_GENERATED
            });

        } catch (error) {
            console.error('Nonce generation error:', error);
            res.status(500).json({
                success: false,
                error: API_RESPONSES.INTERNAL_SERVER_ERROR
            });
        }
    };

    /**
     * Verify wallet signature and authenticate user
     */
    verifySignature = async (req, res) => {
        try {
            const { walletAddress, signature, biometricData } = req.body;

            // Validate inputs
            if (!validateEthAddress(walletAddress) || !signature) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.INVALID_INPUT
                });
            }

            // Check rate limiting
            if (this.isRateLimited(walletAddress)) {
                return res.status(429).json({
                    success: false,
                    error: API_RESPONSES.RATE_LIMITED
                });
            }

            // Find user and validate nonce
            const user = await User.findOne({ 
                walletAddress: walletAddress.toLowerCase(),
                nonceExpiresAt: { $gt: new Date() }
            });

            if (!user || !user.authNonce) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.INVALID_OR_EXPIRED_NONCE
                });
            }

            // Verify signature
            const message = `NeuroCredit Authentication Nonce: ${user.authNonce}`;
            const signerAddress = this.web3.eth.accounts.recover(message, signature);

            if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                this.recordFailedAttempt(walletAddress);
                logSecurityEvent(walletAddress, 'invalid_signature', { attemptedAddress: walletAddress });
                
                return res.status(401).json({
                    success: false,
                    error: API_RESPONSES.INVALID_SIGNATURE
                });
            }

            // Check if user needs biometric verification
            if (!user.isVerified && biometricData) {
                const biometricMatch = await this.verifyBiometricData(user, biometricData);
                if (!biometricMatch) {
                    return res.status(401).json({
                        success: false,
                        error: API_RESPONSES.BIOMETRIC_VERIFICATION_FAILED,
                        requiresBiometric: true
                    });
                }
                user.isVerified = true;
            }

            // Update user status
            user.lastLogin = new Date();
            user.loginCount = (user.loginCount || 0) + 1;
            user.authNonce = null; // Clear used nonce
            user.nonceExpiresAt = null;
            await user.save();

            // Generate JWT tokens
            const tokens = generateAuthTokens({
                userId: user._id,
                walletAddress: user.walletAddress,
                isVerified: user.isVerified
            });

            // Store refresh token
            user.refreshToken = tokens.refreshToken;
            await user.save();

            this.clearLoginAttempts(walletAddress);
            logAuthActivity(walletAddress, 'login_success', { userId: user._id });

            res.json({
                success: true,
                tokens,
                user: {
                    walletAddress: user.walletAddress,
                    isVerified: user.isVerified,
                    hasBiometric: !!user.biometricHash,
                    createdAt: user.createdAt
                },
                message: user.isVerified ? 
                    API_RESPONSES.LOGIN_SUCCESS : 
                    API_RESPONSES.LOGIN_SUCCESS_BIOMETRIC_REQUIRED
            });

        } catch (error) {
            console.error('Signature verification error:', error);
            res.status(500).json({
                success: false,
                error: API_RESPONSES.INTERNAL_SERVER_ERROR
            });
        }
    };

    /**
     * Register biometric data for enhanced security
     */
    registerBiometric = async (req, res) => {
        try {
            const { walletAddress, biometricPattern, signature } = req.body;
            const userId = req.user?.userId; // From JWT middleware

            // Validate authentication
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: API_RESPONSES.UNAUTHORIZED
                });
            }

            // Validate inputs
            if (!biometricPattern || !signature) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.INVALID_BIOMETRIC_DATA
                });
            }

            const user = await User.findById(userId);
            if (!user || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                return res.status(404).json({
                    success: false,
                    error: API_RESPONSES.USER_NOT_FOUND
                });
            }

            // Verify user owns the wallet
            const message = `NeuroCredit Biometric Registration: ${walletAddress}`;
            const signerAddress = this.web3.eth.accounts.recover(message, signature);
            
            if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                return res.status(401).json({
                    success: false,
                    error: API_RESPONSES.INVALID_SIGNATURE
                });
            }

            // Generate biometric hash (in real implementation, use proper biometric hashing)
            const biometricHash = await bcrypt.hash(JSON.stringify(biometricPattern), 12);

            // Store biometric hash
            let biometricRecord = await BiometricHash.findOne({ userId });
            if (biometricRecord) {
                biometricRecord.hash = biometricHash;
                biometricRecord.isActive = true;
                biometricRecord.updatedAt = new Date();
            } else {
                biometricRecord = new BiometricHash({
                    userId,
                    hash: biometricHash,
                    patternType: 'facial_pattern', // or 'behavioral_pattern'
                    isActive: true
                });
            }

            await biometricRecord.save();

            // Update user biometric status
            user.biometricHash = biometricHash;
            user.isVerified = true;
            await user.save();

            logAuthActivity(walletAddress, 'biometric_registered', { userId });

            res.json({
                success: true,
                message: API_RESPONSES.BIOMETRIC_REGISTERED_SUCCESS
            });

        } catch (error) {
            console.error('Biometric registration error:', error);
            res.status(500).json({
                success: false,
                error: API_RESPONSES.INTERNAL_SERVER_ERROR
            });
        }
    };

    /**
     * Biometric authentication
     */
    biometricLogin = async (req, res) => {
        try {
            const { walletAddress, biometricData } = req.body;

            if (!walletAddress || !biometricData) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.INVALID_INPUT
                });
            }

            const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: API_RESPONSES.USER_NOT_FOUND
                });
            }

            if (!user.biometricHash) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.BIOMETRIC_NOT_REGISTERED
                });
            }

            // Verify biometric data
            const isBiometricValid = await bcrypt.compare(
                JSON.stringify(biometricData), 
                user.biometricHash
            );

            if (!isBiometricValid) {
                logSecurityEvent(walletAddress, 'biometric_verification_failed');
                return res.status(401).json({
                    success: false,
                    error: API_RESPONSES.BIOMETRIC_VERIFICATION_FAILED
                });
            }

            // Generate tokens
            const tokens = generateAuthTokens({
                userId: user._id,
                walletAddress: user.walletAddress,
                isVerified: user.isVerified
            });

            user.lastLogin = new Date();
            user.loginCount = (user.loginCount || 0) + 1;
            user.refreshToken = tokens.refreshToken;
            await user.save();

            logAuthActivity(walletAddress, 'biometric_login_success', { userId: user._id });

            res.json({
                success: true,
                tokens,
                user: {
                    walletAddress: user.walletAddress,
                    isVerified: user.isVerified,
                    hasBiometric: true
                },
                message: API_RESPONSES.BIOMETRIC_LOGIN_SUCCESS
            });

        } catch (error) {
            console.error('Biometric login error:', error);
            res.status(500).json({
                success: false,
                error: API_RESPONSES.INTERNAL_SERVER_ERROR
            });
        }
    };

    /**
     * Refresh access token
     */
    refreshToken = async (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    error: API_RESPONSES.REFRESH_TOKEN_REQUIRED
                });
            }

            // Verify refresh token
            const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
            const user = await User.findById(decoded.userId);

            if (!user || user.refreshToken !== refreshToken) {
                return res.status(401).json({
                    success: false,
                    error: API_RESPONSES.INVALID_REFRESH_TOKEN
                });
            }

            // Generate new tokens
            const tokens = generateAuthTokens({
                userId: user._id,
                walletAddress: user.walletAddress,
                isVerified: user.isVerified
            });

            // Update refresh token
            user.refreshToken = tokens.refreshToken;
            await user.save();

            res.json({
                success: true,
                tokens,
                message: API_RESPONSES.TOKEN_REFRESHED
            });

        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(401).json({
                success: false,
                error: API_RESPONSES.INVALID_REFRESH_TOKEN
            });
        }
    };

    /**
     * Logout user
     */
    logout = async (req, res) => {
        try {
            const userId = req.user?.userId;
            const { logoutAllDevices } = req.body;

            if (userId) {
                const user = await User.findById(userId);
                if (user) {
                    if (logoutAllDevices) {
                        // Clear all refresh tokens (logout from all devices)
                        user.refreshToken = null;
                    } else {
                        // Clear current refresh token only
                        user.refreshToken = null;
                    }
                    await user.save();

                    logAuthActivity(user.walletAddress, 'logout', { logoutAllDevices });
                }
            }

            res.json({
                success: true,
                message: API_RESPONSES.LOGOUT_SUCCESS
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                error: API_RESPONSES.INTERNAL_SERVER_ERROR
            });
        }
    };

    /**
     * Get user authentication status
     */
    getAuthStatus = async (req, res) => {
        try {
            const userId = req.user?.userId;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: API_RESPONSES.UNAUTHORIZED
                });
            }

            const user = await User.findById(userId).select('-authNonce -refreshToken -biometricHash');
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: API_RESPONSES.USER_NOT_FOUND
                });
            }

            res.json({
                success: true,
                user: {
                    walletAddress: user.walletAddress,
                    isVerified: user.isVerified,
                    hasBiometric: !!user.biometricHash,
                    loginCount: user.loginCount,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt
                }
            });

        } catch (error) {
            console.error('Auth status error:', error);
            res.status(500).json({
                success: false,
                error: API_RESPONSES.INTERNAL_SERVER_ERROR
            });
        }
    };

    // Helper Methods

    /**
     * Verify biometric data against stored hash
     */
    async verifyBiometricData(user, biometricData) {
        try {
            if (!user.biometricHash) return false;

            const biometricRecord = await BiometricHash.findOne({ 
                userId: user._id, 
                isActive: true 
            });

            if (!biometricRecord) return false;

            return await bcrypt.compare(
                JSON.stringify(biometricData), 
                biometricRecord.hash
            );
        } catch (error) {
            console.error('Biometric verification error:', error);
            return false;
        }
    }

    /**
     * Rate limiting for login attempts
     */
    isRateLimited(walletAddress) {
        const attempts = this.loginAttempts.get(walletAddress) || { count: 0, lastAttempt: 0 };
        const now = Date.now();
        
        // Reset counter if last attempt was more than 15 minutes ago
        if (now - attempts.lastAttempt > 15 * 60 * 1000) {
            attempts.count = 0;
        }

        // Block if more than 5 attempts in 15 minutes
        if (attempts.count >= 5) {
            return true;
        }

        return false;
    }

    /**
     * Record failed login attempt
     */
    recordFailedAttempt(walletAddress) {
        const attempts = this.loginAttempts.get(walletAddress) || { count: 0, lastAttempt: 0 };
        attempts.count++;
        attempts.lastAttempt = Date.now();
        this.loginAttempts.set(walletAddress, attempts);
    }

    /**
     * Clear login attempts on successful login
     */
    clearLoginAttempts(walletAddress) {
        this.loginAttempts.delete(walletAddress);
    }
}

module.exports = new AuthController();