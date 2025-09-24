// backend/src/controllers/daoController.js

const daoService = require('../services/daoService');
const nftService = require('../services/nftService');
const userService = require('../services/userService');
const web3Service = require('../services/web3Service');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * @desc    Create a new proposal in the DAO
 * @route   POST /api/dao/proposals
 * @access  Private (Humanity NFT required)
 */
const createProposal = async (req, res) => {
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

        const { title, description, options, durationHours = 24 } = req.body;
        const userId = req.user.id;

        logger.info('Creating new DAO proposal', { userId, title });

        // Verify user has Humanity NFT
        const userNFT = await nftService.getNFTByUser(userId);
        if (!userNFT) {
            return res.status(403).json({
                success: false,
                message: 'Humanity NFT required to create proposals'
            });
        }

        // Create proposal on blockchain
        const blockchainProposal = await web3Service.createProposal(
            title,
            description,
            options,
            durationHours
        );

        if (!blockchainProposal.success) {
            throw new Error(`Proposal creation failed: ${blockchainProposal.error}`);
        }

        // Save proposal to database
        const proposal = await daoService.createProposal({
            proposalId: blockchainProposal.proposalId,
            title,
            description,
            options,
            createdBy: userId,
            creatorWallet: req.user.walletAddress,
            contractAddress: blockchainProposal.contractAddress,
            transactionHash: blockchainProposal.transactionHash,
            startTime: new Date(),
            endTime: new Date(Date.now() + durationHours * 60 * 60 * 1000),
            status: 'active'
        });

        logger.info('Proposal created successfully', {
            proposalId: proposal.proposalId,
            createdBy: userId
        });

        res.status(201).json({
            success: true,
            message: 'Proposal created successfully',
            data: {
                proposal: proposal,
                transaction: {
                    hash: blockchainProposal.transactionHash,
                    proposalId: blockchainProposal.proposalId
                }
            }
        });

    } catch (error) {
        logger.error('Error creating proposal:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create proposal',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Cast a vote on a proposal
 * @route   POST /api/dao/proposals/:proposalId/vote
 * @access  Private (Humanity NFT required)
 */
const castVote = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { proposalId } = req.params;
        const { optionIndex, walletAddress } = req.body;
        const userId = req.user.id;

        logger.info('Casting vote on proposal', { userId, proposalId, optionIndex });

        // Verify user has Humanity NFT
        const userNFT = await nftService.getNFTByUser(userId);
        if (!userNFT) {
            return res.status(403).json({
                success: false,
                message: 'Humanity NFT required to vote'
            });
        }

        // Check if proposal exists and is active
        const proposal = await daoService.getProposalById(proposalId);
        if (!proposal) {
            return res.status(404).json({
                success: false,
                message: 'Proposal not found'
            });
        }

        if (proposal.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Proposal is not active for voting'
            });
        }

        // Check if user already voted
        const existingVote = await daoService.getUserVote(proposalId, userId);
        if (existingVote) {
            return res.status(400).json({
                success: false,
                message: 'User has already voted on this proposal'
            });
        }

        // Cast vote on blockchain
        const voteResult = await web3Service.castVote(
            proposalId,
            optionIndex,
            walletAddress,
            proposal.contractAddress
        );

        if (!voteResult.success) {
            throw new Error(`Vote casting failed: ${voteResult.error}`);
        }

        // Save vote to database
        const vote = await daoService.recordVote({
            proposalId: proposalId,
            userId: userId,
            walletAddress: walletAddress,
            optionIndex: optionIndex,
            transactionHash: voteResult.transactionHash,
            votedAt: new Date()
        });

        logger.info('Vote cast successfully', {
            proposalId,
            userId,
            optionIndex,
            transactionHash: voteResult.transactionHash
        });

        res.status(200).json({
            success: true,
            message: 'Vote cast successfully',
            data: {
                vote: vote,
                transaction: {
                    hash: voteResult.transactionHash
                }
            }
        });

    } catch (error) {
        logger.error('Error casting vote:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cast vote',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get all proposals with pagination
 * @route   GET /api/dao/proposals
 * @access  Public
 */
const getAllProposals = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status; // active, completed, cancelled
        const skip = (page - 1) * limit;

        const { proposals, totalCount } = await daoService.getAllProposals(
            skip, 
            limit, 
            status
        );

        // Enhance with blockchain data and vote counts
        const enhancedProposals = await Promise.all(
            proposals.map(async (proposal) => {
                try {
                    const blockchainData = await web3Service.getProposalData(
                        proposal.proposalId, 
                        proposal.contractAddress
                    );
                    
                    const voteCounts = await daoService.getVoteCounts(proposal.proposalId);
                    const userVote = req.user ? 
                        await daoService.getUserVote(proposal.proposalId, req.user.id) : null;

                    return {
                        ...proposal.toObject ? proposal.toObject() : proposal,
                        blockchainData,
                        voteCounts,
                        userVote: userVote ? { optionIndex: userVote.optionIndex } : null,
                        totalVotes: voteCounts.total
                    };
                } catch (error) {
                    logger.error(`Error enhancing proposal ${proposal.proposalId}:`, error);
                    return proposal;
                }
            })
        );

        res.status(200).json({
            success: true,
            data: {
                proposals: enhancedProposals,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalItems: totalCount,
                    itemsPerPage: limit
                }
            }
        });

    } catch (error) {
        logger.error('Error fetching proposals:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch proposals',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get single proposal details
 * @route   GET /api/dao/proposals/:proposalId
 * @access  Public
 */
const getProposal = async (req, res) => {
    try {
        const { proposalId } = req.params;

        const proposal = await daoService.getProposalById(proposalId);
        
        if (!proposal) {
            return res.status(404).json({
                success: false,
                message: 'Proposal not found'
            });
        }

        // Get blockchain data
        const blockchainData = await web3Service.getProposalData(
            proposalId, 
            proposal.contractAddress
        );

        // Get vote counts and details
        const voteCounts = await daoService.getVoteCounts(proposalId);
        const recentVotes = await daoService.getRecentVotes(proposalId, 10);
        
        // Check if user has voted (if authenticated)
        let userVote = null;
        if (req.user) {
            userVote = await daoService.getUserVote(proposalId, req.user.id);
        }

        // Get creator info
        const creator = await userService.getUserById(proposal.createdBy, {
            email: 0,
            password: 0,
            biometricData: 0
        });

        const proposalDetails = {
            ...proposal.toObject ? proposal.toObject() : proposal,
            blockchainData,
            voteCounts,
            recentVotes,
            userVote,
            creator: creator,
            totalVotes: voteCounts.total
        };

        res.status(200).json({
            success: true,
            data: proposalDetails
        });

    } catch (error) {
        logger.error('Error fetching proposal:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch proposal',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get user's voting history
 * @route   GET /api/dao/my-votes
 * @access  Private
 */
const getMyVotes = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const { votes, totalCount } = await daoService.getUserVotes(userId, skip, limit);

        // Enhance votes with proposal details
        const enhancedVotes = await Promise.all(
            votes.map(async (vote) => {
                try {
                    const proposal = await daoService.getProposalById(vote.proposalId);
                    return {
                        ...vote.toObject ? vote.toObject() : vote,
                        proposal: proposal ? {
                            title: proposal.title,
                            status: proposal.status
                        } : null
                    };
                } catch (error) {
                    logger.error(`Error enhancing vote ${vote._id}:`, error);
                    return vote;
                }
            })
        );

        res.status(200).json({
            success: true,
            data: {
                votes: enhancedVotes,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalItems: totalCount,
                    itemsPerPage: limit
                }
            }
        });

    } catch (error) {
        logger.error('Error fetching user votes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch voting history',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get DAO statistics and overview
 * @route   GET /api/dao/stats
 * @access  Public
 */
const getDAOStats = async (req, res) => {
    try {
        const stats = await daoService.getDAOStats();
        
        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Error fetching DAO stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch DAO statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Check user's voting eligibility for a proposal
 * @route   GET /api/dao/proposals/:proposalId/eligibility
 * @access  Private
 */
const checkVotingEligibility = async (req, res) => {
    try {
        const { proposalId } = req.params;
        const userId = req.user.id;

        const proposal = await daoService.getProposalById(proposalId);
        if (!proposal) {
            return res.status(404).json({
                success: false,
                message: 'Proposal not found'
            });
        }

        // Check Humanity NFT ownership
        const userNFT = await nftService.getNFTByUser(userId);
        const hasNFT = !!userNFT;

        // Check if already voted
        const existingVote = await daoService.getUserVote(proposalId, userId);
        const hasVoted = !!existingVote;

        // Check proposal status
        const isActive = proposal.status === 'active';
        const isExpired = new Date() > new Date(proposal.endTime);

        const eligibility = {
            canVote: hasNFT && isActive && !hasVoted && !isExpired,
            reasons: {
                hasNFT,
                hasVoted,
                isActive,
                isExpired,
                proposalEnded: isExpired,
                proposalActive: isActive
            },
            details: {
                nftStatus: hasNFT ? 'Verified' : 'No NFT found',
                voteStatus: hasVoted ? 'Already voted' : 'Can vote',
                proposalStatus: isExpired ? 'Ended' : (isActive ? 'Active' : 'Inactive')
            }
        };

        res.status(200).json({
            success: true,
            data: eligibility
        });

    } catch (error) {
        logger.error('Error checking voting eligibility:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check voting eligibility',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Update proposal status (admin/cron job)
 * @route   PUT /api/dao/proposals/:proposalId/status
 * @access  Private/Admin
 */
const updateProposalStatus = async (req, res) => {
    try {
        const { proposalId } = req.params;
        const { status } = req.body;

        // Verify admin permissions
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const updatedProposal = await daoService.updateProposalStatus(proposalId, status);
        
        logger.info('Proposal status updated', { proposalId, status, updatedBy: req.user.id });

        res.status(200).json({
            success: true,
            message: 'Proposal status updated successfully',
            data: updatedProposal
        });

    } catch (error) {
        logger.error('Error updating proposal status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update proposal status',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get real-time vote updates for a proposal (WebSocket support)
 * @route   GET /api/dao/proposals/:proposalId/live
 * @access  Public
 */
const getLiveVoteUpdates = async (req, res) => {
    try {
        const { proposalId } = req.params;

        const proposal = await daoService.getProposalById(proposalId);
        if (!proposal) {
            return res.status(404).json({
                success: false,
                message: 'Proposal not found'
            });
        }

        // Get real-time vote counts
        const voteCounts = await daoService.getVoteCounts(proposalId);
        const recentVotes = await daoService.getRecentVotes(proposalId, 20);

        // Simulate real-time updates (in real app, this would use WebSockets)
        const liveData = {
            proposalId,
            totalVotes: voteCounts.total,
            voteCounts,
            recentVotes,
            lastUpdated: new Date(),
            participants: voteCounts.total,
            // For demo purposes - simulate live updates
            live: true
        };

        res.status(200).json({
            success: true,
            data: liveData
        });

    } catch (error) {
        logger.error('Error fetching live vote data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch live vote data',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

module.exports = {
    createProposal,
    castVote,
    getAllProposals,
    getProposal,
    getMyVotes,
    getDAOStats,
    checkVotingEligibility,
    updateProposalStatus,
    getLiveVoteUpdates
};