/**
 * Authentication Controller
 * Handles user authentication, registration, and login
 */

const authService = require('../services/authService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class AuthController {
  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  async register(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, username, walletAddress } = req.body;

      // Register user
      const result = await authService.register({
        email,
        password,
        username,
        walletAddress
      });

      logger.info('User registration successful', { userId: result.user._id });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });

    } catch (error) {
      logger.error('Registration error:', error);

      // Handle specific errors
      if (error.message.includes('already registered') ||
          error.message.includes('already taken')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  async login(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Login user
      const result = await authService.login({ email, password });

      logger.info('User login successful', { userId: result.user._id });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });

    } catch (error) {
      logger.error('Login error:', error);

      // Handle authentication errors
      if (error.message.includes('Invalid email or password') ||
          error.message.includes('Account is deactivated')) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  async logout(req, res) {
    try {
      const userId = req.user?.id;
      const token = req.headers.authorization?.replace('Bearer ', '');

      // Logout user
      const result = await authService.logout(userId, token);

      logger.info('User logout successful', { userId });

      res.status(200).json({
        success: true,
        message: result.message
      });

    } catch (error) {
      logger.error('Logout error:', error);

      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Refresh token
      const result = await authService.refreshToken(refreshToken);

      logger.info('Token refresh successful');

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });

    } catch (error) {
      logger.error('Token refresh error:', error);

      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  /**
   * Request password reset
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email } = req.body;

      // Generate reset token
      const result = await authService.generatePasswordResetToken(email);

      logger.info('Password reset requested', { email });

      res.status(200).json({
        success: true,
        message: result.message
      });

    } catch (error) {
      logger.error('Forgot password error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Reset password with token
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { token, password } = req.body;

      // Reset password
      const result = await authService.resetPassword(token, password);

      logger.info('Password reset successful');

      res.status(200).json({
        success: true,
        message: result.message
      });

    } catch (error) {
      logger.error('Reset password error:', error);

      if (error.message.includes('Invalid or expired')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Verify JWT token (middleware helper)
   * GET /api/v1/auth/verify
   */
  async verifyToken(req, res) {
    try {
      // If we reach here, the token is valid (checked by authMiddleware)
      const user = req.user;

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          user: user
        }
      });

    } catch (error) {
      logger.error('Token verification error:', error);

      res.status(401).json({
        success: false,
        message: 'Token verification failed'
      });
    }
  }

  /**
   * Get current user profile (alias for verify)
   * GET /api/v1/auth/me
   */
  async getCurrentUser(req, res) {
    try {
      const user = req.user;

      res.status(200).json({
        success: true,
        data: {
          user: user
        }
      });

    } catch (error) {
      logger.error('Get current user error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to get current user',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = new AuthController();
