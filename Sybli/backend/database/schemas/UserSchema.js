// backend/database/schemas/UserSchema.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Authentication & Identity
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
        match: /^[a-zA-Z0-9_]+$/,
        index: true
    },
    email: {
        type: String,
        required: false, // Optional for wallet-based auth
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: /^0x[a-fA-F0-9]{40}$/,
        index: true
    },
    
    // Profile Information
    profileImage: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        maxlength: 500,
        default: ''
    },
    
    // Preferences
    preferences: {
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            daoUpdates: { type: Boolean, default: true }
        },
        privacy: {
            profilePublic: { type: Boolean, default: true },
            showWallet: { type: Boolean, default: true },
            showActivity: { type: Boolean, default: true }
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'auto'
        }
    },
    
    // Biometric Verification Status
    biometricVerification: {
        isVerified: { type: Boolean, default: false },
        lastVerified: { type: Date, default: null },
        verificationCount: { type: Number, default: 0 },
        qualityScore: { type: Number, min: 0, max: 100, default: 0 },
        bioHash: { type: String, unique: true, sparse: true }
    },
    
    // NFT Status
    nftStatus: {
        hasNFT: { type: Boolean, default: false },
        tokenId: { type: String, default: null },
        contractAddress: { type: String, default: null },
        mintedAt: { type: Date, default: null },
        transactionHash: { type: String, default: null }
    },
    
    // DAO Activity Tracking
    daoActivity: {
        proposalsCreated: { type: Number, default: 0 },
        votesCast: { type: Number, default: 0 },
        lastVote: { type: Date, default: null },
        reputation: { type: Number, default: 0 } // Future: reputation system
    },
    
    // Security & Authentication
    auth: {
        password: { type: String, select: false }, // For email/password auth
        recoveryPhrase: { type: String, select: false },
        twoFactorEnabled: { type: Boolean, default: false },
        lastLogin: { type: Date, default: null },
        loginAttempts: { type: Number, default: 0 },
        lockUntil: { type: Date, default: null }
    },
    
    // Account Status
    status: {
        isActive: { type: Boolean, default: true },
        isVerified: { type: Boolean, default: false },
        isAdmin: { type: Boolean, default: false },
        deactivatedAt: { type: Date, default: null },
        deactivationReason: { type: String, default: null }
    },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            // Remove sensitive fields when converting to JSON
            delete ret.auth;
            delete ret.biometricVerification.bioHash;
            return ret;
        }
    }
});

// Indexes for better query performance
userSchema.index({ 'biometricVerification.isVerified': 1 });
userSchema.index({ 'nftStatus.hasNFT': 1 });
userSchema.index({ 'daoActivity.reputation': -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'status.isActive': 1 });

// Virtual for account age
userSchema.virtual('accountAge').get(function() {
    return Date.now() - this.createdAt;
});

// Virtual for isEligibleForDAO (has NFT and is verified)
userSchema.virtual('isEligibleForDAO').get(function() {
    return this.biometricVerification.isVerified && this.nftStatus.hasNFT;
});

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Hash password if modified
    if (this.isModified('auth.password') && this.auth.password) {
        this.auth.password = bcrypt.hashSync(this.auth.password, 12);
    }
    
    next();
});

// Method to check password (for email/password auth)
userSchema.methods.checkPassword = function(password) {
    return bcrypt.compareSync(password, this.auth.password);
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = function() {
    if (this.auth.lockUntil && this.auth.lockUntil < Date.now()) {
        return this.update({
            'auth.loginAttempts': 1,
            'auth.lockUntil': null
        });
    }
    
    const updates = { $inc: { 'auth.loginAttempts': 1 } };
    if (this.auth.loginAttempts + 1 >= 5) {
        updates.$set = { 'auth.lockUntil': Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }
    
    return this.update(updates);
};

// Method to reset login attempts after successful login
userSchema.methods.resetLoginAttempts = function() {
    return this.update({
        'auth.loginAttempts': 0,
        'auth.lockUntil': null,
        'auth.lastLogin': Date.now()
    });
};

// Static method to find by wallet address
userSchema.statics.findByWallet = function(walletAddress) {
    return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

// Static method to find by username
userSchema.statics.findByUsername = function(username) {
    return this.findOne({ username: new RegExp(`^${username}$`, 'i') });
};

// Static method to get users with NFT
userSchema.statics.getNFTHolders = function() {
    return this.find({ 'nftStatus.hasNFT': true });
};

// Static method to get active users
userSchema.statics.getActiveUsers = function() {
    return this.find({ 'status.isActive': true });
};

module.exports = userSchema;