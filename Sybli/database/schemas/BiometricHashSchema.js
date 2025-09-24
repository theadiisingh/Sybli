const mongoose = require('mongoose');

const biometricHashSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    hash: {
        type: String,
        required: true
    },
    patternType: {
        type: String,
        enum: ['facial_pattern', 'behavioral_pattern'],
        default: 'facial_pattern'
    },
    isActive: {
        type: Boolean,
        default: true
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
biometricHashSchema.index({ userId: 1 });
biometricHashSchema.index({ isActive: 1 });

module.exports = biometricHashSchema;
