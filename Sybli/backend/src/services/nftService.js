// backend/src/services/nftService.js
const NFT = require('../../database/models/HumanityNFT');

class NFTService {
    async createNFTRecord(nftData) {
        try {
            const nft = new NFT(nftData);
            return await nft.save();
        } catch (error) {
            throw new Error(`Failed to create NFT record: ${error.message}`);
        }
    }

    async getNFTByUser(userId) {
        try {
            return await NFT.findOne({ userId }).sort({ mintedAt: -1 });
        } catch (error) {
            throw new Error(`Failed to fetch NFT by user: ${error.message}`);
        }
    }

    async getNFTByTokenId(tokenId) {
        try {
            return await NFT.findOne({ tokenId });
        } catch (error) {
            throw new Error(`Failed to fetch NFT by token ID: ${error.message}`);
        }
    }

    async getAllNFTs(skip = 0, limit = 10) {
        try {
            const nfts = await NFT.find()
                .sort({ mintedAt: -1 })
                .skip(skip)
                .limit(limit);
            
            const totalCount = await NFT.countDocuments();
            
            return { nfts, totalCount };
        } catch (error) {
            throw new Error(`Failed to fetch NFTs: ${error.message}`);
        }
    }

    async getNFTStats() {
        try {
            const totalNFTs = await NFT.countDocuments();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const nftsToday = await NFT.countDocuments({
                mintedAt: { $gte: today }
            });

            return {
                totalNFTs,
                nftsToday,
                uniqueUsers: await NFT.distinct('userId').then(ids => ids.length)
            };
        } catch (error) {
            throw new Error(`Failed to fetch NFT stats: ${error.message}`);
        }
    }

    async updateNFTMetadata(tokenId, metadata) {
        try {
            return await NFT.findOneAndUpdate(
                { tokenId },
                { metadata, updatedAt: new Date() },
                { new: true }
            );
        } catch (error) {
            throw new Error(`Failed to update NFT metadata: ${error.message}`);
        }
    }
}

module.exports = new NFTService();