// backend/database/models/Vote.js
const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
    proposalId: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    walletAddress: {
        type: String,
        required: true
    },
    optionIndex: {
        type: Number,
        required: true,
        min: 0
    },
    transactionHash: {
        type: String,
        required: true
    },
    votedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Ensure one vote per user per proposal
voteSchema.index({ proposalId: 1, userId: 1 }, { unique: true });
voteSchema.index({ proposalId: 1, optionIndex: 1 });
voteSchema.index({ userId: 1 });
voteSchema.index({ votedAt: -1 });

module.exports = mongoose.model('Vote', voteSchema);