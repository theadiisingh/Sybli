// backend/database/schemas/BiometricHashSchema.js
const mongoose = require('mongoose');

const biometricHashSchema = new mongoose.Schema({
    // Unique bio-hash generated from biometric patterns
    bioHash: {
        type: String,
        required: true,
        unique: true,
        index: true,
        match: /^[a-fA-F0-9]{64}$/ // SHA-256 hash format
    },
    
    // Reference to user (optional - for registered users)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },
    
    // Biometric data metadata
    metadata: {
        // Pattern analysis results
        patterns: {
            facial: { type: Number, min: 0, max: 100, default: 0 },
            blink: { type: Number, min: 0, max: 100, default: 0 },
            headMovement: { type: Number, min: 0, max: 100, default: 0 },
            mouse: { type: Number, min: 0, max: 100, default: 0 }
        },
        
        // Quality metrics
        qualityScore: { type: Number, min: 0, max: 100, required: true },
        confidence: { type: Number, min: 0, max: 1, default: 0.8 },
        
        // Technical details
        processingTime: { type: Number, default: 0 }, // in milliseconds
        frameCount: { type: Number, default: 0 },
        algorithmVersion: { type: String, default: '1.0.0' },
        
        // Device information
        device: {
            type: { type: String, enum: ['webcam', 'mobile', 'desktop'], default: 'webcam' },
            resolution: { width: Number, height: Number },
            userAgent: String,
            ipAddress: String
        }
    },
    
    // Verification context
    context: {
        purpose: {
            type: String,
            enum: ['registration', 'verification', 'authentication', 'test'],
            default: 'verification'
        },
        sessionId: String,
        challenge: String, // Optional challenge for verification
        expiresAt: Date
    },
    
    // Security flags
    security: {
        isCompromised: { type: Boolean, default: false },
        compromiseReason: String,
        flaggedAt: Date,
        verifiedCount: { type: Number, default: 0 },
        lastVerified: Date
    },
    
    // Privacy settings
    privacy: {
        dataRetention: {
            type: String,
            enum: ['temporary', 'permanent'],
            default: 'permanent'
        },
        autoDeleteAt: Date,
        allowResearch: { type: Boolean, default: false }
    },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now, expires: '730d' }, // Auto-delete after 2 years
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Indexes for performance and querying
biometricHashSchema.index({ userId: 1, createdAt: -1 });
biometricHashSchema.index({ 'metadata.qualityScore': -1 });
biometricHashSchema.index({ 'context.purpose': 1 });
biometricHashSchema.index({ 'security.isCompromised': 1 });
biometricHashSchema.index({ 'privacy.autoDeleteAt': 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to update timestamps
biometricHashSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Set auto-delete date if temporary retention
    if (this.privacy.dataRetention === 'temporary' && !this.privacy.autoDeleteAt) {
        this.privacy.autoDeleteAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
    
    next();
});

// Method to check if hash is expired
biometricHashSchema.methods.isExpired = function() {
    return this.context.expiresAt && this.context.expiresAt < new Date();
};

// Method to mark as compromised
biometricHashSchema.methods.markCompromised = function(reason) {
    this.security.isCompromised = true;
    this.security.compromiseReason = reason;
    this.security.flaggedAt = new Date();
    return this.save();
};

// Method to increment verification count
biometricHashSchema.methods.incrementVerification = function() {
    this.security.verifiedCount += 1;
    this.security.lastVerified = new Date();
    return this.save();
};

// Static method to find by quality range
biometricHashSchema.statics.findByQuality = function(minScore, maxScore = 100) {
    return this.find({
        'metadata.qualityScore': { $gte: minScore, $lte: maxScore }
    });
};

// Static method to get compromised hashes
biometricHashSchema.statics.getCompromisedHashes = function() {
    return this.find({ 'security.isCompromised': true });
};

// Static method to clean expired temporary hashes
biometricHashSchema.statics.cleanExpiredTemporary = function() {
    return this.deleteMany({
        'privacy.dataRetention': 'temporary',
        'privacy.autoDeleteAt': { $lt: new Date() }
    });
};

module.exports = biometricHashSchema;