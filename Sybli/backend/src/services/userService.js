// backend/src/services/userService.js
const User = require('../../database/models/User');
const bcrypt = require('bcryptjs');

class UserService {
    /**
     * Get user by ID
     */
    async getUserById(userId, projection = {}) {
        try {
            return await User.findById(userId, projection);
        } catch (error) {
            throw new Error(`Failed to fetch user: ${error.message}`);
        }
    }

    /**
     * Get user by wallet address
     */
    async getUserByWalletAddress(walletAddress, projection = {}) {
        try {
            return await User.findOne({ walletAddress }, projection);
        } catch (error) {
            throw new Error(`Failed to fetch user by wallet: ${error.message}`);
        }
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email, projection = {}) {
        try {
            return await User.findOne({ email }, projection);
        } catch (error) {
            throw new Error(`Failed to fetch user by email: ${error.message}`);
        }
    }

    /**
     * Create new user
     */
    async createUser(userData) {
        try {
            const user = new User(userData);
            return await user.save();
        } catch (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }

    /**
     * Update user
     */
    async updateUser(userId, updateData) {
        try {
            return await User.findByIdAndUpdate(
                userId,
                { ...updateData, updatedAt: new Date() },
                { new: true, runValidators: true }
            );
        } catch (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }

    /**
     * Deactivate user (soft delete)
     */
    async deactivateUser(userId) {
        try {
            return await User.findByIdAndUpdate(
                userId,
                { 
                    isActive: false,
                    deactivatedAt: new Date()
                },
                { new: true }
            );
        } catch (error) {
            throw new Error(`Failed to deactivate user: ${error.message}`);
        }
    }

    /**
     * Check if username exists
     */
    async checkUsernameExists(username) {
        try {
            const user = await User.findOne({ 
                username: new RegExp(`^${username}$`, 'i') 
            });
            return !!user;
        } catch (error) {
            throw new Error(`Failed to check username: ${error.message}`);
        }
    }

    /**
     * Get all users with pagination (admin only)
     */
    async getAllUsers(skip = 0, limit = 20) {
        try {
            const users = await User.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            
            const totalCount = await User.countDocuments();
            
            return { users, totalCount };
        } catch (error) {
            throw new Error(`Failed to fetch users: ${error.message}`);
        }
    }

    /**
     * Update biometric verification status
     */
    async updateBiometricStatus(userId, status) {
        try {
            return await User.findByIdAndUpdate(
                userId,
                {
                    isBiometricVerified: status,
                    lastVerification: new Date(),
                    $inc: { verificationCount: 1 }
                },
                { new: true }
            );
        } catch (error) {
            throw new Error(`Failed to update biometric status: ${error.message}`);
        }
    }

    /**
     * Update NFT status
     */
    async updateNFTStatus(userId, nftData) {
        try {
            return await User.findByIdAndUpdate(
                userId,
                {
                    hasHumanityNFT: true,
                    nftTokenId: nftData.tokenId,
                    nftMintedAt: new Date()
                },
                { new: true }
            );
        } catch (error) {
            throw new Error(`Failed to update NFT status: ${error.message}`);
        }
    }

    /**
     * Remove sensitive data from user object
     */
    sanitizeUser(user) {
        if (!user) return null;
        
        const userObj = user.toObject ? user.toObject() : user;
        
        // Remove sensitive fields
        const { password, biometricData, __v, ...sanitized } = userObj;
        
        return sanitized;
    }

    /**
     * Get user statistics
     */
    async getUserStats() {
        try {
            const totalUsers = await User.countDocuments();
            const verifiedUsers = await User.countDocuments({ isBiometricVerified: true });
            const nftHolders = await User.countDocuments({ hasHumanityNFT: true });
            const activeUsers = await User.countDocuments({ isActive: true });
            
            // Today's registrations
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayRegistrations = await User.countDocuments({ createdAt: { $gte: today } });

            return {
                totalUsers,
                verifiedUsers,
                nftHolders,
                activeUsers,
                todayRegistrations,
                verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(1) : 0,
                nftAdoptionRate: totalUsers > 0 ? ((nftHolders / totalUsers) * 100).toFixed(1) : 0
            };
        } catch (error) {
            throw new Error(`Failed to fetch user stats: ${error.message}`);
        }
    }
}

module.exports = new UserService();