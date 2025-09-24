// backend/src/controllers/nftController.js

const nftService = require('../services/nftService');
const web3Service = require('../services/web3Service');
const userService = require('../services/userService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * @desc    Mint Humanity NFT for verified user
 * @route   POST /api/nft/mint
 * @access  Private
 */
const mintHumanityNFT = async (req, res) => {
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

        const { userId, bioHash, walletAddress } = req.body;
        
        logger.info(`NFT Mint request for user: ${userId}`, { userId, walletAddress });

        // Check if user already has NFT
        const existingNFT = await nftService.getNFTByUser(userId);
        if (existingNFT) {
            return res.status(400).json({
                success: false,
                message: 'User already has a Humanity NFT',
                nft: existingNFT
            });
        }

        // Verify user exists and is verified
        const user = await userService.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isBiometricVerified) {
            return res.status(400).json({
                success: false,
                message: 'User biometric verification required before minting NFT'
            });
        }

        // Prepare NFT metadata
        const metadata = {
            name: "Humanity Verification NFT",
            description: "Proof of unique human identity using biometric verification",
            image: "ipfs://Qm.../humanity-badge.png", // Placeholder IPFS hash
            attributes: [
                {
                    trait_type: "Verification Level",
                    value: "Biometric"
                },
                {
                    trait_type: "Issued Date",
                    value: new Date().toISOString()
                },
                {
                    trait_type: "Unique Bio-Hash",
                    value: bioHash
                }
            ]
        };

        // Mint NFT on blockchain
        const mintResult = await web3Service.mintNFT(walletAddress, metadata);
        
        if (!mintResult.success) {
            throw new Error(`NFT minting failed: ${mintResult.error}`);
        }

        // Save NFT record to database
        const nftRecord = await nftService.createNFTRecord({
            userId: userId,
            tokenId: mintResult.tokenId,
            contractAddress: mintResult.contractAddress,
            transactionHash: mintResult.transactionHash,
            bioHash: bioHash,
            metadata: metadata,
            mintedAt: new Date()
        });

        // Update user with NFT reference
        await userService.updateUser(userId, {
            hasHumanityNFT: true,
            nftTokenId: mintResult.tokenId,
            lastVerification: new Date()
        });

        logger.info(`NFT minted successfully for user: ${userId}`, {
            tokenId: mintResult.tokenId,
            transactionHash: mintResult.transactionHash
        });

        res.status(201).json({
            success: true,
            message: 'Humanity NFT minted successfully',
            data: {
                nft: nftRecord,
                transaction: {
                    hash: mintResult.transactionHash,
                    tokenId: mintResult.tokenId,
                    contractAddress: mintResult.contractAddress
                }
            }
        });

    } catch (error) {
        logger.error('Error minting Humanity NFT:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mint NFT',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get NFT by user ID
 * @route   GET /api/nft/user/:userId
 * @access  Private
 */
const getNFTByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const nft = await nftService.getNFTByUser(userId);
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                message: 'No NFT found for this user'
            });
        }

        // Get current NFT data from blockchain
        const blockchainData = await web3Service.getNFTData(nft.tokenId, nft.contractAddress);
        
        const nftWithBlockchainData = {
            ...nft.toObject ? nft.toObject() : nft,
            blockchainData: blockchainData
        };

        res.status(200).json({
            success: true,
            data: nftWithBlockchainData
        });

    } catch (error) {
        logger.error('Error fetching NFT by user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch NFT',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get NFT by token ID
 * @route   GET /api/nft/token/:tokenId
 * @access  Public
 */
const getNFTByTokenId = async (req, res) => {
    try {
        const { tokenId } = req.params;

        const nft = await nftService.getNFTByTokenId(tokenId);
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                message: 'NFT not found'
            });
        }

        // Get blockchain data
        const blockchainData = await web3Service.getNFTData(tokenId, nft.contractAddress);
        
        // Get user info (without sensitive data)
        const user = await userService.getUserById(nft.userId, { 
            email: 0, 
            password: 0,
            biometricData: 0 
        });

        const nftWithDetails = {
            ...nft.toObject ? nft.toObject() : nft,
            blockchainData: blockchainData,
            user: user
        };

        res.status(200).json({
            success: true,
            data: nftWithDetails
        });

    } catch (error) {
        logger.error('Error fetching NFT by token ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch NFT',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Verify NFT ownership and validity
 * @route   POST /api/nft/verify
 * @access  Public
 */
const verifyNFT = async (req, res) => {
    try {
        const { tokenId, walletAddress } = req.body;

        if (!tokenId || !walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Token ID and wallet address are required'
            });
        }

        // Check database record
        const nftRecord = await nftService.getNFTByTokenId(tokenId);
        if (!nftRecord) {
            return res.status(404).json({
                success: false,
                message: 'NFT record not found'
            });
        }

        // Verify on blockchain
        const verification = await web3Service.verifyNFTOwnership(
            tokenId, 
            walletAddress, 
            nftRecord.contractAddress
        );

        if (!verification.isValid) {
            return res.status(400).json({
                success: false,
                message: 'NFT verification failed',
                details: verification.reason
            });
        }

        // Get user info for the NFT
        const user = await userService.getUserById(nftRecord.userId, {
            email: 0,
            password: 0,
            biometricData: 0
        });

        res.status(200).json({
            success: true,
            message: 'NFT verification successful',
            data: {
                nft: nftRecord,
                verification: verification,
                user: user
            }
        });

    } catch (error) {
        logger.error('Error verifying NFT:', error);
        res.status(500).json({
            success: false,
            message: 'NFT verification failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get all NFTs with pagination
 * @route   GET /api/nft
 * @access  Public
 */
const getAllNFTs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const { nfts, totalCount } = await nftService.getAllNFTs(skip, limit);
        
        // Enhance with blockchain data
        const enhancedNFTs = await Promise.all(
            nfts.map(async (nft) => {
                try {
                    const blockchainData = await web3Service.getNFTData(nft.tokenId, nft.contractAddress);
                    const user = await userService.getUserById(nft.userId, {
                        email: 0,
                        password: 0,
                        biometricData: 0
                    });

                    return {
                        ...nft.toObject ? nft.toObject() : nft,
                        blockchainData,
                        user
                    };
                } catch (error) {
                    logger.error(`Error enhancing NFT data for token ${nft.tokenId}:`, error);
                    return nft;
                }
            })
        );

        res.status(200).json({
            success: true,
            data: {
                nfts: enhancedNFTs,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalItems: totalCount,
                    itemsPerPage: limit
                }
            }
        });

    } catch (error) {
        logger.error('Error fetching all NFTs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch NFTs',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Get NFT minting statistics
 * @route   GET /api/nft/stats
 * @access  Public
 */
const getNFTStats = async (req, res) => {
    try {
        const stats = await nftService.getNFTStats();
        
        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Error fetching NFT stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch NFT statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Update NFT metadata (admin only)
 * @route   PUT /api/nft/:tokenId/metadata
 * @access  Private/Admin
 */
const updateNFTMetadata = async (req, res) => {
    try {
        const { tokenId } = req.params;
        const { metadata } = req.body;

        // Verify admin permissions (simplified for hackathon)
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const updatedNFT = await nftService.updateNFTMetadata(tokenId, metadata);
        
        res.status(200).json({
            success: true,
            message: 'NFT metadata updated successfully',
            data: updatedNFT
        });

    } catch (error) {
        logger.error('Error updating NFT metadata:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update NFT metadata',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @desc    Transfer NFT (special case for Soulbound NFT)
 * @route   POST /api/nft/:tokenId/transfer
 * @access  Private
 */
const transferNFT = async (req, res) => {
    try {
        const { tokenId } = req.params;
        const { fromAddress, toAddress, userId } = req.body;

        // Soulbound NFTs are non-transferable by design
        // This endpoint would handle special cases or admin overrides

        return res.status(400).json({
            success: false,
            message: 'Humanity NFTs are soulbound and non-transferable'
        });

        // Implementation for non-soulbound NFTs would go here

    } catch (error) {
        logger.error('Error transferring NFT:', error);
        res.status(500).json({
            success: false,
            message: 'NFT transfer failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

module.exports = {
    mintHumanityNFT,
    getNFTByUser,
    getNFTByTokenId,
    verifyNFT,
    getAllNFTs,
    getNFTStats,
    updateNFTMetadata,
    transferNFT
};