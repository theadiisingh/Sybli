// backend/src/controllers/userController.js

const userService = require('../services/userService');
const nftService = require('../services/nftService');
const biometricService = require('../services/biometricService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        logger.info('Fetching user profile', { userId });

        const user = await userService.getUserById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Remove sensitive data
        const userProfile = userService.sanitizeUser(user);

        // Get NFT status if available
        let nftStatus = null;
        if (user.hasHumanityNFT) {
            const nft = await nftService.getNFTByUser(userId);
            nftStatus = {
                hasNFT: true,
                tokenId: nft?.tokenId,
                mintedAt: nft?.mintedAt
            };
        }

        res.status(200).json({
            success: true,
            data: {
                user: userProfile,
                nftStatus: nftStatus
            }
        });

    } catch (error) {
        logger.error('Error fetching user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const userId = req.user.id;
        const updateData = req.body;

        logger.info('Updating user profile', { userId, updateData: Object.keys(updateData) });

        // Remove fields that shouldn't be updated directly
        const allowedFields = ['username', 'walletAddress', 'preferences', 'profileImage'];
        const filteredUpdateData = {};
        
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredUpdateData[key] = updateData[key];
            }
        });

        const updatedUser = await userService.updateUser(userId, filteredUpdateData);
        
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const sanitizedUser = userService.sanitizeUser(updatedUser);

        logger.info('User profile updated successfully', { userId });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: sanitizedUser
            }
        });

    } catch (error) {
        logger.error('Error updating user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get user's biometric verification status
 * @route   GET /api/users/biometric-status
 * @access  Private
 */
const getBiometricStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await userService.getUserById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const status = {
            isBiometricVerified: user.isBiometricVerified,
            lastVerification: user.lastVerification,
            verificationCount: user.verificationCount || 0,
            hasHumanityNFT: user.hasHumanityNFT
        };

        // If user has NFT, include NFT details
        if (user.hasHumanityNFT) {
            const nft = await nftService.getNFTByUser(userId);
            status.nftDetails = {
                tokenId: nft?.tokenId,
                mintedAt: nft?.mintedAt,
                contractAddress: nft?.contractAddress
            };
        }

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
 * @desc    Get user's DAO activity and voting history
 * @route   GET /api/users/dao-activity
 * @access  Private
 */
const getDAOActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        logger.info('Fetching user DAO activity', { userId });

        const user = await userService.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get voting statistics
        const daoService = require('../services/daoService');
        const { votes, totalCount } = await daoService.getUserVotes(userId, (page - 1) * limit, limit);

        // Get proposals created by user
        const Proposal = require('../../database/models/Proposal');
        const userProposals = await Proposal.find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .limit(5);

        const activity = {
            votingStats: {
                totalVotes: totalCount,
                votesOnPage: votes.length,
                participationRate: await calculateParticipationRate(userId)
            },
            recentVotes: votes,
            createdProposals: userProposals,
            nftStatus: {
                hasNFT: user.hasHumanityNFT,
                isEligible: user.isBiometricVerified && !user.hasHumanityNFT
            }
        };

        res.status(200).json({
            success: true,
            data: activity
        });

    } catch (error) {
        logger.error('Error fetching user DAO activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch DAO activity',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/users/account
 * @access  Private
 */
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { confirmation } = req.body;

        if (confirmation !== 'DELETE_MY_ACCOUNT') {
            return res.status(400).json({
                success: false,
                message: 'Confirmation phrase required to delete account'
            });
        }

        logger.warn('User account deletion requested', { userId });

        // Soft delete - mark as inactive rather than actually deleting
        const result = await userService.deactivateUser(userId);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        logger.warn('User account deactivated', { userId });

        res.status(200).json({
            success: true,
            message: 'Account has been deactivated successfully'
        });

    } catch (error) {
        logger.error('Error deleting user account:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete account',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get user's NFT and verification timeline
 * @route   GET /api/users/timeline
 * @access  Private
 */
const getUserTimeline = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await userService.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const timeline = [];

        // Account creation
        timeline.push({
            type: 'account_created',
            timestamp: user.createdAt,
            title: 'Account Created',
            description: 'Joined NeuroCredit'
        });

        // Biometric verification events
        if (user.isBiometricVerified && user.lastVerification) {
            timeline.push({
                type: 'biometric_verified',
                timestamp: user.lastVerification,
                title: 'Biometric Verification',
                description: 'Successfully verified unique human identity'
            });
        }

        // NFT minting event
        if (user.hasHumanityNFT) {
            const nft = await nftService.getNFTByUser(userId);
            if (nft) {
                timeline.push({
                    type: 'nft_minted',
                    timestamp: nft.mintedAt,
                    title: 'Humanity NFT Minted',
                    description: `NFT #${nft.tokenId} minted on blockchain`,
                    metadata: {
                        tokenId: nft.tokenId,
                        transactionHash: nft.transactionHash
                    }
                });
            }
        }

        // Voting activity
        const Vote = require('../../database/models/Vote');
        const recentVotes = await Vote.find({ userId })
            .sort({ votedAt: -1 })
            .limit(3)
            .populate('proposalId', 'title');

        recentVotes.forEach(vote => {
            timeline.push({
                type: 'vote_cast',
                timestamp: vote.votedAt,
                title: 'Vote Cast',
                description: `Voted on proposal: ${vote.proposalId?.title || 'Unknown'}`,
                metadata: {
                    proposalId: vote.proposalId,
                    optionIndex: vote.optionIndex
                }
            });
        });

        // Sort timeline by timestamp
        timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.status(200).json({
            success: true,
            data: {
                timeline,
                totalEvents: timeline.length
            }
        });

    } catch (error) {
        logger.error('Error fetching user timeline:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user timeline',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Check username availability
 * @route   GET /api/users/check-username/:username
 * @access  Public
 */
const checkUsernameAvailability = async (req, res) => {
    try {
        const { username } = req.params;

        if (!username || username.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Username must be at least 3 characters long'
            });
        }

        const exists = await userService.checkUsernameExists(username);

        res.status(200).json({
            success: true,
            data: {
                username,
                available: !exists,
                suggestions: exists ? generateUsernameSuggestions(username) : []
            }
        });

    } catch (error) {
        logger.error('Error checking username availability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check username availability',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get user public profile
 * @route   GET /api/users/public/:walletAddress
 * @access  Public
 */
const getPublicProfile = async (req, res) => {
    try {
        const { walletAddress } = req.params;

        const user = await userService.getUserByWalletAddress(walletAddress);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Only return public information
        const publicProfile = {
            walletAddress: user.walletAddress,
            username: user.username,
            profileImage: user.profileImage,
            joinedAt: user.createdAt,
            isBiometricVerified: user.isBiometricVerified,
            hasHumanityNFT: user.hasHumanityNFT
        };

        // Add NFT details if available
        if (user.hasHumanityNFT) {
            const nft = await nftService.getNFTByUser(user._id);
            publicProfile.nft = {
                tokenId: nft?.tokenId,
                mintedAt: nft?.mintedAt
            };
        }

        // Add DAO activity stats (without sensitive data)
        const daoService = require('../services/daoService');
        const voteCount = await require('../../database/models/Vote').countDocuments({ 
            userId: user._id 
        });
        const proposalCount = await require('../../database/models/Proposal').countDocuments({ 
            createdBy: user._id 
        });

        publicProfile.daoActivity = {
            votesCast: voteCount,
            proposalsCreated: proposalCount
        };

        res.status(200).json({
            success: true,
            data: publicProfile
        });

    } catch (error) {
        logger.error('Error fetching public profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch public profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Admin: Get all users (admin only)
 * @route   GET /api/users/admin/all
 * @access  Private/Admin
 */
const getAllUsers = async (req, res) => {
    try {
        // Check admin permissions
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const { users, totalCount } = await userService.getAllUsers(skip, limit);

        const sanitizedUsers = users.map(user => userService.sanitizeUser(user));

        res.status(200).json({
            success: true,
            data: {
                users: sanitizedUsers,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalItems: totalCount,
                    itemsPerPage: limit
                }
            }
        });

    } catch (error) {
        logger.error('Error fetching all users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Helper function to calculate participation rate
async function calculateParticipationRate(userId) {
    try {
        const totalProposals = await require('../../database/models/Proposal').countDocuments({
            status: 'completed'
        });
        
        const userVotes = await require('../../database/models/Vote').countDocuments({
            userId: userId
        });

        return totalProposals > 0 ? ((userVotes / totalProposals) * 100).toFixed(1) : 0;
    } catch (error) {
        return 0;
    }
}

// Helper function to generate username suggestions
function generateUsernameSuggestions(username) {
    const suggestions = [];
    for (let i = 1; i <= 3; i++) {
        suggestions.push(`${username}${Math.floor(Math.random() * 1000)}`);
    }
    return suggestions;
}

module.exports = {
    getProfile,
    updateProfile,
    getBiometricStatus,
    getDAOActivity,
    deleteAccount,
    getUserTimeline,
    checkUsernameAvailability,
    getPublicProfile,
    getAllUsers
};