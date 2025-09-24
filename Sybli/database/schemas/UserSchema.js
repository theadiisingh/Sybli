const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    authNonce: {
        type: String,
        default: null
    },
    nonceExpiresAt: {
        type: Date,
        default: null
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    authMethod: {
        type: String,
        enum: ['wallet', 'biometric'],
        default: 'wallet'
    },
    biometricHash: {
        type: String,
        default: null
    },
    refreshToken: {
        type: String,
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for performance
userSchema.index({ walletAddress: 1 });
userSchema.index({ nonceExpiresAt: 1 });

module.exports = userSchema;
