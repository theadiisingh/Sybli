/**
 * Authentication Service
 * Handles JWT token generation, password hashing, and user authentication
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../../database/models/User');
const userService = require('./userService');
const logger = require('../utils/logger');

class AuthService {
    /**
     * Hash a password
     */
    async hashPassword(password) {
        try {
            const saltRounds = 12;
            return await bcrypt.hash(password, saltRounds);
        } catch (error) {
            logger.error('Error hashing password:', error);
            throw new Error('Failed to hash password');
        }
    }

    /**
     * Verify a password against hash
     */
    async verifyPassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            logger.error('Error verifying password:', error);
            throw new Error('Failed to verify password');
        }
    }

    /**
     * Generate JWT token
     */
    generateToken(userId, expiresIn = '24h') {
        try {
            const payload = {
                userId: userId,
                iat: Math.floor(Date.now() / 1000)
            };

            const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-key', {
                expiresIn: expiresIn,
                issuer: 'neurocredit-api',
                audience: 'neurocredit-users'
            });

            return token;
        } catch (error) {
            logger.error('Error generating token:', error);
            throw new Error('Failed to generate token');
        }
    }

    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key', {
                issuer: 'neurocredit-api',
                audience: 'neurocredit-users'
            });

            return decoded;
        } catch (error) {
            logger.error('Error verifying token:', error);
            throw new Error('Invalid token');
        }
    }

    /**
     * Generate refresh token
     */
    generateRefreshToken(userId) {
        try {
            const payload = {
                userId: userId,
                type: 'refresh',
                iat: Math.floor(Date.now() / 1000)
            };

            const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret', {
                expiresIn: '7d',
                issuer: 'neurocredit-api',
                audience: 'neurocredit-users'
            });

            return refreshToken;
        } catch (error) {
            logger.error('Error generating refresh token:', error);
            throw new Error('Failed to generate refresh token');
        }
    }

    /**
     * Register a new user
     */
    async register(userData) {
        try {
            const { email, password, username, walletAddress } = userData;

            // Check if user already exists
            const existingUser = await User.findOne({
                $or: [
                    { email: email.toLowerCase() },
                    { username: username.toLowerCase() },
                    { walletAddress: walletAddress.toLowerCase() }
                ]
            });

            if (existingUser) {
                if (existingUser.email === email.toLowerCase()) {
                    throw new Error('Email already registered');
                }
                if (existingUser.username === username.toLowerCase()) {
                    throw new Error('Username already taken');
                }
                if (existingUser.walletAddress === walletAddress.toLowerCase()) {
                    throw new Error('Wallet address already registered');
                }
            }

            // Hash password
            const hashedPassword = await this.hashPassword(password);

            // Create user
            const newUser = await userService.createUser({
                email: email.toLowerCase(),
                password: hashedPassword,
                username: username.toLowerCase(),
                walletAddress: walletAddress.toLowerCase(),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Generate tokens
            const token = this.generateToken(newUser._id);
            const refreshToken = this.generateRefreshToken(newUser._id);

            logger.info('User registered successfully', { userId: newUser._id, email: newUser.email });

            return {
                user: userService.sanitizeUser(newUser),
                token,
                refreshToken
            };

        } catch (error) {
            logger.error('Error registering user:', error);
            throw error;
        }
    }

    /**
     * Login user
     */
    async login(credentials) {
        try {
            const { email, password } = credentials;

            // Find user by email
            const user = await userService.getUserByEmail(email.toLowerCase());
            if (!user) {
                throw new Error('Invalid email or password');
            }

            // Check if user is active
            if (!user.isActive) {
                throw new Error('Account is deactivated');
            }

            // Verify password
            const isValidPassword = await this.verifyPassword(password, user.password);
            if (!isValidPassword) {
                throw new Error('Invalid email or password');
            }

            // Generate tokens
            const token = this.generateToken(user._id);
            const refreshToken = this.generateRefreshToken(user._id);

            // Update last login
            await userService.updateUser(user._id, { lastLogin: new Date() });

            logger.info('User logged in successfully', { userId: user._id, email: user.email });

            return {
                user: userService.sanitizeUser(user),
                token,
                refreshToken
            };

        } catch (error) {
            logger.error('Error logging in user:', error);
            throw error;
        }
    }

    /**
     * Logout user (invalidate tokens)
     */
    async logout(userId, token) {
        try {
            // In a production system, you might want to add tokens to a blacklist
            // For now, we'll just log the logout
            logger.info('User logged out', { userId });

            // You could implement token blacklisting here
            // await this.blacklistToken(token);

            return { success: true, message: 'Logged out successfully' };

        } catch (error) {
            logger.error('Error logging out user:', error);
            throw new Error('Failed to logout');
        }
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret', {
                issuer: 'neurocredit-api',
                audience: 'neurocredit-users'
            });

            if (decoded.type !== 'refresh') {
                throw new Error('Invalid refresh token');
            }

            // Check if user still exists and is active
            const user = await userService.getUserById(decoded.userId);
            if (!user || !user.isActive) {
                throw new Error('User not found or inactive');
            }

            // Generate new tokens
            const newToken = this.generateToken(user._id);
            const newRefreshToken = this.generateRefreshToken(user._id);

            logger.info('Token refreshed successfully', { userId: user._id });

            return {
                token: newToken,
                refreshToken: newRefreshToken
            };

        } catch (error) {
            logger.error('Error refreshing token:', error);
            throw new Error('Invalid refresh token');
        }
    }

    /**
     * Generate password reset token
     */
    async generatePasswordResetToken(email) {
        try {
            const user = await userService.getUserByEmail(email.toLowerCase());
            if (!user) {
                // Don't reveal if email exists or not for security
                return { success: true, message: 'If the email exists, a reset link has been sent' };
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

            // Hash the token before storing
            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

            // Save to user
            await userService.updateUser(user._id, {
                passwordResetToken: hashedToken,
                passwordResetExpires: resetTokenExpiry
            });

            // In a real application, send email with reset link
            // For now, just return the token
            logger.info('Password reset token generated', { userId: user._id, email: user.email });

            return {
                success: true,
                message: 'Password reset token generated',
                resetToken: resetToken // In production, this would be sent via email
            };

        } catch (error) {
            logger.error('Error generating password reset token:', error);
            throw new Error('Failed to generate reset token');
        }
    }

    /**
     * Reset password using token
     */
    async resetPassword(token, newPassword) {
        try {
            // Hash the provided token
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            // Find user with valid reset token
            const user = await User.findOne({
                passwordResetToken: hashedToken,
                passwordResetExpires: { $gt: Date.now() }
            });

            if (!user) {
                throw new Error('Invalid or expired reset token');
            }

            // Hash new password
            const hashedPassword = await this.hashPassword(newPassword);

            // Update user
            await userService.updateUser(user._id, {
                password: hashedPassword,
                passwordResetToken: undefined,
                passwordResetExpires: undefined,
                updatedAt: new Date()
            });

            logger.info('Password reset successfully', { userId: user._id });

            return { success: true, message: 'Password reset successfully' };

        } catch (error) {
            logger.error('Error resetting password:', error);
            throw error;
        }
    }

    /**
     * Get user from token
     */
    async getUserFromToken(token) {
        try {
            const decoded = this.verifyToken(token);
            const user = await userService.getUserById(decoded.userId);

            if (!user || !user.isActive) {
                throw new Error('User not found or inactive');
            }

            return userService.sanitizeUser(user);

        } catch (error) {
            logger.error('Error getting user from token:', error);
            throw new Error('Invalid token');
        }
    }
}

module.exports = new AuthService();
