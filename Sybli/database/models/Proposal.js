// backend/database/models/Proposal.js
const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
    proposalId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    creatorWallet: {
        type: String,
        required: true
    },
    contractAddress: {
        type: String,
        required: true
    },
    transactionHash: {
        type: String,
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Index for faster queries
proposalSchema.index({ proposalId: 1 });
proposalSchema.index({ status: 1 });
proposalSchema.index({ endTime: 1 });
proposalSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Proposal', proposalSchema);