const mongoose = require('mongoose');

const daoProposalSchema = new mongoose.Schema({
    proposalId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    proposer: {
        type: String,
        required: true,
        lowercase: true
    },
    votesFor: {
        type: Number,
        default: 0
    },
    votesAgainst: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
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
daoProposalSchema.index({ proposalId: 1 });
daoProposalSchema.index({ proposer: 1 });
daoProposalSchema.index({ status: 1 });

module.exports = daoProposalSchema;
