const mongoose = require('mongoose');

const nftSchema = new mongoose.Schema({
    tokenId: {
        type: String,
        required: true,
        unique: true
    },
    owner: {
        type: String,
        required: true,
        lowercase: true
    },
    contractAddress: {
        type: String,
        required: true,
        lowercase: true
    },
    metadata: {
        name: String,
        description: String,
        image: String,
        attributes: [{
            trait_type: String,
            value: mongoose.Schema.Types.Mixed
        }]
    },
    isHumanityNFT: {
        type: Boolean,
        default: false
    },
    mintedAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for performance
nftSchema.index({ tokenId: 1 });
nftSchema.index({ owner: 1 });
nftSchema.index({ contractAddress: 1 });
nftSchema.index({ isHumanityNFT: 1 });

module.exports = nftSchema;
