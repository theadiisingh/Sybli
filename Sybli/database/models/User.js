// backend/database/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: false, // Optional for wallet-based auth
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true
    },
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    profileImage: {
        type: String,
        default: null
    },
    preferences: {
        notifications: {
            type: Boolean,
            default: true
        },
        publicProfile: {
            type: Boolean,
            default: true
        }
    },
    // Biometric verification status
    isBiometricVerified: {
        type: Boolean,
        default: false
    },
    lastVerification: {
        type: Date,
        default: null
    },
    verificationCount: {
        type: Number,
        default: 0
    },
    // NFT status
    hasHumanityNFT: {
        type: Boolean,
        default: false
    },
    nftTokenId: {
        type: String,
        default: null
    },
    nftMintedAt: {
        type: Date,
        default: null
    },
    // Account status
    isActive: {
        type: Boolean,
        default: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    deactivatedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for better performance
userSchema.index({ walletAddress: 1 });
userSchema.index({ username: 1 });
userSchema.index({ isBiometricVerified: 1 });
userSchema.index({ hasHumanityNFT: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for account age
userSchema.virtual('accountAge').get(function() {
    return Date.now() - this.createdAt;
});

module.exports = mongoose.model('User', userSchema);