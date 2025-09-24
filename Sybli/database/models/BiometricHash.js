/**
 * BiometricHash Model
 */

const mongoose = require('mongoose');

const biometricHashSchema = new mongoose.Schema({
    // Reference to User
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Biometric Data
    hash: {
        type: String,
        required: true
    },
    patternType: {
        type: String,
        required: true,
        enum: ['facial', 'behavioral', 'voice'],
        index: true
    },
    qualityScore: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },

    // Fingerprint for quick comparison
    fingerprint: {
        type: mongoose.Schema.Types.Mixed
    },

    // Metadata
    metadata: {
        patternSize: Number,
        features: Number,
        complexity: Number,
        algorithmVersion: String,
        extractionMethod: String
    },

    // Verification Statistics
    verificationCount: {
        type: Number,
        default: 0
    },
    successfulVerifications: {
        type: Number,
        default: 0
    },
    lastVerifiedAt: {
        type: Date
    },
    lastSimilarityScore: {
        type: Number,
        min: 0,
        max: 1
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    deactivatedAt: {
        type: Date
    },
    deactivationReason: {
        type: String,
        enum: ['user_requested', 'pattern_update', 'security_concern', 'system']
    },

    // Timestamps
    registeredAt: {
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
            delete ret.hash; // Don't expose hash in JSON responses
            return ret;
        }
    }
});

// Indexes
biometricHashSchema.index({ userId: 1, patternType: 1, isActive: 1 });
biometricHashSchema.index({ isActive: 1 });
biometricHashSchema.index({ registeredAt: 1 });
biometricHashSchema.index({ lastVerifiedAt: 1 });

// Middleware
biometricHashSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static Methods
biometricHashSchema.statics.findActiveByUser = function(userId) {
    return this.find({ userId, isActive: true });
};

biometricHashSchema.statics.findByUserAndType = function(userId, patternType) {
    return this.findOne({ userId, patternType, isActive: true });
};

biometricHashSchema.statics.deactivateAllForUser = function(userId, reason = 'system') {
    return this.updateMany(
        { userId, isActive: true },
        { 
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: reason
        }
    );
};

// Instance Methods
biometricHashSchema.methods.recordVerification = function(successful = true, similarityScore = null) {
    this.verificationCount += 1;
    this.lastVerifiedAt = new Date();
    
    if (successful) {
        this.successfulVerifications += 1;
    }
    
    if (similarityScore !== null) {
        this.lastSimilarityScore = similarityScore;
    }
    
    return this.save();
};

biometricHashSchema.methods.getSuccessRate = function() {
    return this.verificationCount > 0 ? this.successfulVerifications / this.verificationCount : 0;
};

module.exports = mongoose.model('BiometricHash', biometricHashSchema);