/**
 * Vote Model (Mongoose)
 * Represents individual votes on DAO proposals
 */

const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  proposalId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  optionIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 4 // Assuming max 5 options (0-4)
  },
  weight: {
    type: Number,
    default: 1,
    min: 0
  },
  reason: {
    type: String,
    maxlength: 1000
  },
  transactionHash: {
    type: String
  },
  blockNumber: {
    type: Number
  },
  votedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
voteSchema.index({ proposalId: 1, userId: 1 }, { unique: true }); // One vote per user per proposal
voteSchema.index({ votedAt: -1 });

// Virtual fields
voteSchema.virtual('isOnChainVerified').get(function() {
  return !!(this.transactionHash && this.blockNumber);
});

// Instance methods
voteSchema.methods.getVoteImpact = function() {
  return this.weight;
};

voteSchema.methods.validateVoteWeight = async function() {
  const User = mongoose.model('User');
  const user = await User.findById(this.userId);
  if (!user) return false;

  // Simplified validation - check if user has voting power
  const votingPower = await user.getVotingPower();
  return this.weight <= votingPower;
};

// Static methods
voteSchema.statics.castVote = async function(voteData) {
  const {
    proposalId,
    userId,
    optionIndex,
    weight = 1,
    reason = '',
    transactionHash = null,
    blockNumber = null
  } = voteData;

  // Check if user already voted on this proposal
  const existingVote = await this.findOne({
    proposalId,
    userId
  });

  if (existingVote) {
    throw new Error('User has already voted on this proposal');
  }

  const vote = new this({
    proposalId,
    userId,
    optionIndex,
    weight,
    reason,
    transactionHash,
    blockNumber
  });

  return await vote.save();
};

voteSchema.statics.getVotesByProposal = async function(proposalId, options = {}) {
  const { optionIndex = null, limit = 100, offset = 0 } = options;

  const query = { proposalId };

  if (optionIndex !== null) {
    query.optionIndex = optionIndex;
  }

  return await this.find(query)
    .populate('userId', 'username walletAddress')
    .sort({ votedAt: -1 })
    .limit(limit)
    .skip(offset);
};

voteSchema.statics.getUserVotes = async function(userId, proposalId = null) {
  const query = { userId };

  if (proposalId) {
    query.proposalId = proposalId;
  }

  return await this.find(query)
    .populate('proposalId', 'title status')
    .sort({ votedAt: -1 });
};

voteSchema.statics.getVoteSummary = async function(proposalId) {
  const votes = await this.aggregate([
    { $match: { proposalId } },
    {
      $group: {
        _id: '$optionIndex',
        total_weight: { $sum: '$weight' },
        vote_count: { $sum: 1 }
      }
    }
  ]);

  // Initialize all options to 0
  const summary = {};
  for (let i = 0; i < 5; i++) { // Assuming max 5 options
    summary[i] = { total_weight: 0, vote_count: 0 };
  }

  // Fill in actual vote data
  votes.forEach(vote => {
    summary[vote._id] = {
      total_weight: vote.total_weight,
      vote_count: vote.vote_count
    };
  });

  return summary;
};

voteSchema.statics.hasUserVoted = async function(proposalId, userId) {
  const vote = await this.findOne({ proposalId, userId });
  return !!vote;
};

voteSchema.statics.getRecentVotes = async function(daoId, days = 7) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  // This would need to be more complex to filter by DAO
  // For now, just return recent votes
  return await this.find({ votedAt: { $gte: dateThreshold } })
    .populate('userId', 'username')
    .populate('proposalId', 'title')
    .sort({ votedAt: -1 });
};

// Pre-save middleware
voteSchema.pre('save', function(next) {
  if (this.isNew) {
    this.votedAt = new Date();
  }
  next();
});

// Post-save middleware to update proposal vote totals
voteSchema.post('save', async function(doc) {
  try {
    const Proposal = mongoose.model('Proposals');
    const proposal = await Proposal.findOne({ proposalId: doc.proposalId });
    if (proposal) {
      await proposal.calculateVoteTotals();
      await proposal.save();
    }
  } catch (error) {
    console.error('Error updating proposal vote totals:', error);
  }
});

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;
