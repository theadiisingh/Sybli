/**
 * NFTRecord Model
 */

const mongoose = require('mongoose');

const nftRecordSchema = new mongoose.Schema({
    // NFT Identification
    tokenId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    contractAddress: {
        type: String,
        required: true,
        index: true
    },
    blockchainNetwork: {
        type: String,
        required: true,
        default: 'ethereum'
    },

    // Owner Information
    ownerWalletAddress: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // NFT Metadata
    metadata: {
        name: String,
        description: String,
        image: String,
        attributes: [{
            trait_type: String,
            value: mongoose.Schema.Types.Mixed
        }],
        external_url: String,
        animation_url: String
    },

    // Biometric Link
    biometricVerificationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BiometricHash',
        sparse: true
    },
    verificationScore: {
        type: Number,
        min: 0,
        max: 100
    },

    // Transaction History
    transactionHash: {
        type: String,
        required: true
    },
    blockNumber: {
        type: Number,
        required: true
    },
    gasUsed: {
        type: Number
    },

    // Status
    status: {
        type: String,
        enum: ['minted', 'transferred', 'burned', 'locked'],
        default: 'minted',
        index: true
    },
    isSoulbound: {
        type: Boolean,
        default: true
    },

    // Timestamps
    mintedAt: {
        type: Date,
        default: Date.now
    },
    lastTransferredAt: {
        type: Date
    }

}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes
nftRecordSchema.index({ ownerWalletAddress: 1, status: 1 });
nftRecordSchema.index({ contractAddress: 1, tokenId: 1 });
nftRecordSchema.index({ mintedAt: 1 });
nftRecordSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('NFTRecord', nftRecordSchema);