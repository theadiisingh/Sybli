/**
 * User Model
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Authentication
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    authNonce: {
        type: String,
        sparse: true
    },
    nonceExpiresAt: {
        type: Date
    },
    refreshToken: {
        type: String,
        sparse: true
    },

    // Biometric Status
    hasBiometric: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    biometricTypes: [{
        type: String,
        enum: ['facial', 'behavioral', 'voice']
    }],
    verificationScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Activity Tracking
    loginCount: {
        type: Number,
        default: 0
    },
    totalVerifications: {
        type: Number,
        default: 0
    },
    lastLogin: {
        type: Date
    },
    lastBiometricVerification: {
        type: Date
    },
    lastBiometricUpdate: {
        type: Date
    },

    // Profile Information
    username: {
        type: String,
        sparse: true,
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        sparse: true,
        trim: true,
        lowercase: true
    },
    profileImage: {
        type: String
    },

    // Preferences
    preferences: {
        notifications: {
            email: { type: Boolean, default: true },
            biometric: { type: Boolean, default: true },
            nft: { type: Boolean, default: true }
        },
        privacy: {
            publicProfile: { type: Boolean, default: false },
            showVerificationStatus: { type: Boolean, default: true }
        }
    },

    // Security
    security: {
        twoFactorEnabled: { type: Boolean, default: false },
        lastPasswordChange: { type: Date },
        failedLoginAttempts: { type: Number, default: 0 },
        accountLockedUntil: { type: Date }
    },

    // NFT and Blockchain
    nftTokenId: {
        type: String,
        sparse: true
    },
    contractAddress: {
        type: String,
        sparse: true
    },
    blockchainNetwork: {
        type: String,
        default: 'ethereum'
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.authNonce;
            delete ret.refreshToken;
            return ret;
        }
    }
});

// Indexes
userSchema.index({ walletAddress: 1 });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ username: 1 }, { sparse: true });
userSchema.index({ isVerified: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ lastLogin: 1 });

// Middleware
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static Methods
userSchema.statics.findByWalletAddress = function(walletAddress) {
    return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.incrementLoginCount = function(walletAddress) {
    return this.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        { 
            $inc: { loginCount: 1 },
            $set: { lastLogin: new Date() }
        },
        { new: true }
    );
};

// Instance Methods
userSchema.methods.verifyNonce = function(nonce) {
    return this.authNonce === nonce && this.nonceExpiresAt > new Date();
};

userSchema.methods.lockAccount = function(minutes = 15) {
    this.security.accountLockedUntil = new Date(Date.now() + minutes * 60 * 1000);
    return this.save();
};

userSchema.methods.unlockAccount = function() {
    this.security.failedLoginAttempts = 0;
    this.security.accountLockedUntil = null;
    return this.save();
};

userSchema.methods.isAccountLocked = function() {
    return this.security.accountLockedUntil && this.security.accountLockedUntil > new Date();
};

module.exports = mongoose.model('User', userSchema);