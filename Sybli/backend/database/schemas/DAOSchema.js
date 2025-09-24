// backend/database/schemas/DAOSchema.js
const mongoose = require('mongoose');

const daoSchema = new mongoose.Schema({
    // On-chain identifier
    proposalId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // Contract information
    contract: {
        address: {
            type: String,
            required: true,
            match: /^0x[a-fA-F0-9]{40}$/,
            index: true
        },
        chainId: { type: Number, default: 1337 },
        name: { type: String, default: 'SybilResistantDAO' }
    },
    
    // Proposal content
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 5000
    },
    options: [{
        index: { type: Number, required: true },
        text: { type: String, required: true, maxlength: 200 },
        description: { type: String, maxlength: 500 }
    }],
    
    // Creator information
    creator: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        walletAddress: {
            type: String,
            required: true,
            match: /^0x[a-fA-F0-9]{40}$/,
            index: true
        },
        username: { type: String, required: true }
    },
    
    // Voting parameters
    voting: {
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        duration: { type: Number, required: true }, // in hours
        quorum: { type: Number, default: 0 }, // Minimum votes required
        threshold: { type: Number, default: 50 }, // Percentage needed to pass
        
        // Voting system type
        system: {
            type: String,
            enum: ['single-choice', 'approval', 'ranked-choice', 'quadratic'],
            default: 'single-choice'
        },
        
        // Eligibility criteria
        eligibility: {
            nftRequired: { type: Boolean, default: true },
            minReputation: { type: Number, default: 0 },
            specificHolders: [{ type: String }] // Specific NFT holders
        }
    },
    
    // On-chain transaction
    transaction: {
        hash: {
            type: String,
            required: true,
            match: /^0x[a-fA-F0-9]{64}$/,
            index: true
        },
        blockNumber: { type: Number, required: true },
        gasUsed: { type: Number, default: 0 }
    },
    
    // Voting results
    results: {
        totalVotes: { type: Number, default: 0 },
        uniqueVoters: { type: Number, default: 0 },
        optionVotes: [{
            optionIndex: { type: Number, required: true },
            count: { type: Number, default: 0 },
            percentage: { type: Number, default: 0 }
        }],
        
        // Winner information
        winningOption: { type: Number, default: -1 },
        isTie: { type: Boolean, default: false },
        passed: { type: Boolean, default: false },
        
        // Participation metrics
        participationRate: { type: Number, default: 0 }, // % of eligible voters
        quorumReached: { type: Boolean, default: false }
    },
    
    // Status tracking
    status: {
        current: {
            type: String,
            enum: ['draft', 'active', 'completed', 'cancelled', 'executed', 'failed'],
            default: 'draft'
        },
        previous: { type: String, default: null },
        changedAt: { type: Date, default: Date.now },
        reason: { type: String, default: null } // Reason for status change
    },
    
    // Categories and tags
    categories: [{
        type: String,
        enum: ['governance', 'funding', 'technical', 'community', 'partnership', 'other']
    }],
    tags: [{ type: String, maxlength: 20 }],
    
    // Discussion and updates
    discussion: {
        threadId: String, // Link to forum/discord thread
        commentCount: { type: Number, default: 0 },
        lastActivity: { type: Date, default: Date.now }
    },
    
    // Execution (for executable proposals)
    execution: {
        executable: { type: Boolean, default: false },
        targetContract: String,
        functionSignature: String,
        parameters: mongoose.Schema.Types.Mixed,
        executedAt: Date,
        executionHash: String
    },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            // Add computed fields for API responses
            ret.isActive = doc.isActive;
            ret.timeRemaining = doc.timeRemaining;
            ret.hasEnded = doc.hasEnded;
            return ret;
        }
    }
});

// Indexes for performance
daoSchema.index({ 'voting.endTime': 1 });
daoSchema.index({ 'status.current': 1 });
daoSchema.index({ 'creator.userId': 1 });
daoSchema.index({ createdAt: -1 });
daoSchema.index({ 'results.totalVotes': -1 });
daoSchema.index({ categories: 1 });

// Virtual for active status
daoSchema.virtual('isActive').get(function() {
    const now = new Date();
    return this.status.current === 'active' && 
           this.voting.startTime <= now && 
           this.voting.endTime > now;
});

// Virtual for time remaining
daoSchema.virtual('timeRemaining').get(function() {
    if (this.hasEnded) return 0;
    const now = new Date();
    return Math.max(0, this.voting.endTime - now);
});

// Virtual for hasEnded
daoSchema.virtual('hasEnded').get(function() {
    return new Date() > this.voting.endTime;
});

// Pre-save middleware
daoSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Auto-update status based on time
    const now = new Date();
    if (this.status.current === 'active' && now > this.voting.endTime) {
        this.status.current = 'completed';
        this.status.changedAt = now;
    }
    
    // Calculate percentages if votes changed
    if (this.isModified('results.optionVotes') && this.results.totalVotes > 0) {
        this.results.optionVotes.forEach(option => {
            option.percentage = (option.count / this.results.totalVotes) * 100;
        });
        
        // Determine winner
        const maxVotes = Math.max(...this.results.optionVotes.map(o => o.count));
        const winners = this.results.optionVotes.filter(o => o.count === maxVotes);
        
        this.results.winningOption = winners.length === 1 ? winners[0].optionIndex : -1;
        this.results.isTie = winners.length > 1;
        this.results.passed = maxVotes / this.results.totalVotes >= this.voting.threshold / 100;
        this.results.quorumReached = this.results.totalVotes >= this.voting.quorum;
    }
    
    next();
});

// Method to add a vote
daoSchema.methods.addVote = function(optionIndex, voterId) {
    // Initialize option if it doesn't exist
    let option = this.results.optionVotes.find(o => o.optionIndex === optionIndex);
    if (!option) {
        option = { optionIndex, count: 0, percentage: 0 };
        this.results.optionVotes.push(option);
    }
    
    option.count += 1;
    this.results.totalVotes += 1;
    this.results.uniqueVoters += 1;
    
    return this.save();
};

// Method to update status
daoSchema.methods.updateStatus = function(newStatus, reason = null) {
    this.status.previous = this.status.current;
    this.status.current = newStatus;
    this.status.changedAt = new Date();
    this.status.reason = reason;
    return this.save();
};

// Static method to find active proposals
daoSchema.statics.findActive = function() {
    const now = new Date();
    return this.find({
        'status.current': 'active',
        'voting.startTime': { $lte: now },
        'voting.endTime': { $gt: now }
    });
};

// Static method to find ending soon
daoSchema.statics.findEndingSoon = function(hours = 24) {
    const now = new Date();
    const cutoff = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    return this.find({
        'status.current': 'active',
        'voting.endTime': { $lte: cutoff, $gt: now }
    });
};

// Static method to get voting statistics
daoSchema.statics.getVotingStats = function(timeRange = 'all') {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
        case 'day':
            startDate = new Date(now.setDate(now.getDate() - 1));
            break;
        case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        default:
            startDate = new Date(0);
    }
    
    return this.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: null,
                totalProposals: { $sum: 1 },
                activeProposals: { 
                    $sum: { 
                        $cond: [{ $eq: ['$status.current', 'active'] }, 1, 0] 
                    } 
                },
                totalVotes: { $sum: '$results.totalVotes' },
                averageParticipation: { $avg: '$results.participationRate' }
            }
        }
    ]);
};

module.exports = daoSchema;