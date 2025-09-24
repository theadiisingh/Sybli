/**
 * Proposals Model (Mongoose)
 * Additional proposal-related functionality and utilities
 */

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
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  proposer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dao: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DAO',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'succeeded', 'defeated', 'executed', 'cancelled'],
    default: 'pending'
  },
  votingStartAt: {
    type: Date,
    required: true
  },
  votingEndAt: {
    type: Date,
    required: true
  },
  executedAt: {
    type: Date
  },
  totalVotes: {
    type: Number,
    default: 0
  },
  forVotes: {
    type: Number,
    default: 0
  },
  againstVotes: {
    type: Number,
    default: 0
  },
  abstainVotes: {
    type: Number,
    default: 0
  },
  quorum: {
    type: Number,
    default: 0
  },
  options: [{
    index: Number,
    text: String,
    votes: { type: Number, default: 0 }
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
proposalSchema.index({ proposalId: 1 });
proposalSchema.index({ proposer: 1 });
proposalSchema.index({ dao: 1 });
proposalSchema.index({ status: 1 });
proposalSchema.index({ votingEndAt: 1 });
proposalSchema.index({ created_at: -1 });

// Virtual fields
proposalSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' &&
         now >= this.votingStartAt &&
         now <= this.votingEndAt;
});

proposalSchema.virtual('hasEnded').get(function() {
  return new Date() > this.votingEndAt;
});

proposalSchema.virtual('timeRemaining').get(function() {
  if (this.hasEnded) return 0;
  return Math.max(0, this.votingEndAt - new Date());
});

// Instance methods
proposalSchema.methods.calculateVoteTotals = async function() {
  const Vote = mongoose.model('Vote');
  const votes = await Vote.find({ proposalId: this.proposalId });

  let forVotes = 0;
  let againstVotes = 0;
  let abstainVotes = 0;

  votes.forEach(vote => {
    switch (vote.optionIndex) {
      case 0: forVotes += vote.weight || 1; break;
      case 1: againstVotes += vote.weight || 1; break;
      case 2: abstainVotes += vote.weight || 1; break;
    }
  });

  this.forVotes = forVotes;
  this.againstVotes = againstVotes;
  this.abstainVotes = abstainVotes;
  this.totalVotes = forVotes + againstVotes + abstainVotes;

  return {
    for: forVotes,
    against: againstVotes,
    abstain: abstainVotes,
    total: this.totalVotes
  };
};

proposalSchema.methods.hasQuorum = function() {
  // Simplified quorum calculation - 10% of total NFT holders
  return this.totalVotes >= this.quorum;
};

proposalSchema.methods.isPassing = function() {
  return this.forVotes > this.againstVotes;
};

// Static methods
proposalSchema.statics.getProposalStatistics = async function(daoId = null, timeRange = '30days') {
  const dateThreshold = new Date();

  switch (timeRange) {
    case '7days':
      dateThreshold.setDate(dateThreshold.getDate() - 7);
      break;
    case '30days':
      dateThreshold.setDate(dateThreshold.getDate() - 30);
      break;
    case '90days':
      dateThreshold.setDate(dateThreshold.getDate() - 90);
      break;
    default:
      dateThreshold.setDate(dateThreshold.getDate() - 30);
  }

  const matchConditions = {
    created_at: { $gte: dateThreshold }
  };

  if (daoId) {
    matchConditions.dao = daoId;
  }

  const proposals = await this.find(matchConditions);

  const stats = {
    total: proposals.length,
    by_status: {},
    success_rate: 0,
    average_voting_period: 0,
    participation: {
      total_votes: 0,
      average_votes_per_proposal: 0
    }
  };

  let succeededCount = 0;
  let totalVotingPeriod = 0;

  proposals.forEach(proposal => {
    // Count by status
    stats.by_status[proposal.status] = (stats.by_status[proposal.status] || 0) + 1;

    // Calculate success rate
    if (proposal.status === 'executed' || proposal.status === 'succeeded') {
      succeededCount++;
    }

    // Calculate average voting period
    const votingPeriod = proposal.votingEndAt - proposal.votingStartAt;
    totalVotingPeriod += votingPeriod;

    // Total votes
    stats.participation.total_votes += proposal.totalVotes || 0;
  });

  stats.success_rate = stats.total > 0 ? (succeededCount / stats.total) * 100 : 0;
  stats.average_voting_period = stats.total > 0 ? totalVotingPeriod / stats.total : 0;
  stats.participation.average_votes_per_proposal = stats.total > 0 ? stats.participation.total_votes / stats.total : 0;

  return stats;
};

proposalSchema.statics.getTrendingProposals = async function(daoId = null, limit = 10) {
  const matchConditions = { status: 'active' };
  if (daoId) {
    matchConditions.dao = daoId;
  }

  const proposals = await this.find(matchConditions)
    .populate('proposer', 'username')
    .populate('dao', 'name')
    .sort({ created_at: -1 })
    .limit(limit);

  // Calculate engagement score based on votes and recency
  return proposals.map(proposal => {
    const voteCount = proposal.totalVotes || 0;
    const recency = Math.max(1, Math.floor((new Date() - proposal.created_at) / (1000 * 60 * 60))); // hours
    const engagementScore = voteCount / recency;

    return {
      ...proposal.toObject(),
      engagement_score: engagementScore,
      hotness: engagementScore * Math.log(voteCount + 1)
    };
  }).sort((a, b) => b.hotness - a.hotness);
};

proposalSchema.statics.batchUpdateProposalStatuses = async function() {
  const now = new Date();

  // Update proposals that should be active
  const activated = await this.updateMany(
    {
      status: 'pending',
      votingStartAt: { $lte: now },
      votingEndAt: { $gte: now }
    },
    { status: 'active' }
  );

  // Update proposals that have ended but not yet finalized
  const endedProposals = await this.find({
    status: 'active',
    votingEndAt: { $lt: now }
  });

  let succeeded = 0;
  let defeated = 0;

  for (const proposal of endedProposals) {
    await proposal.calculateVoteTotals();

    const hasQuorum = proposal.hasQuorum();
    const isPassing = proposal.isPassing();

    let newStatus = 'defeated';
    if (hasQuorum && isPassing) {
      newStatus = 'succeeded';
      succeeded++;
    } else {
      defeated++;
    }

    await this.updateOne(
      { _id: proposal._id },
      { status: newStatus }
    );
  }

  return {
    activated: activated.modifiedCount,
    succeeded,
    defeated,
    total_processed: endedProposals.length
  };
};

proposalSchema.statics.searchProposals = async function(searchCriteria) {
  const {
    daoId = null,
    status = null,
    proposerId = null,
    titleQuery = null,
    dateFrom = null,
    dateTo = null,
    limit = 50,
    offset = 0
  } = searchCriteria;

  const query = {};

  if (daoId) query.dao = daoId;
  if (status) query.status = status;
  if (proposerId) query.proposer = proposerId;
  if (titleQuery) query.title = new RegExp(titleQuery, 'i');
  if (dateFrom || dateTo) {
    query.created_at = {};
    if (dateFrom) query.created_at.$gte = new Date(dateFrom);
    if (dateTo) query.created_at.$lte = new Date(dateTo);
  }

  return await this.find(query)
    .populate('proposer', 'username')
    .populate('dao', 'name')
    .sort({ created_at: -1 })
    .limit(limit)
    .skip(offset);
};

proposalSchema.statics.getProposalTimeline = async function(proposalId) {
  const proposal = await this.findOne({ proposalId })
    .populate('proposer', 'username')
    .populate({
      path: 'votes',
      populate: { path: 'user', select: 'username' }
    });

  if (!proposal) return null;

  const timeline = [];

  // Proposal created
  timeline.push({
    type: 'proposal_created',
    timestamp: proposal.created_at,
    user: proposal.proposer,
    description: 'Proposal created'
  });

  // Voting started
  if (proposal.votingStartAt) {
    timeline.push({
      type: 'voting_started',
      timestamp: proposal.votingStartAt,
      description: 'Voting period started'
    });
  }

  // Votes (simplified - would need Vote model population)
  // This is a placeholder - actual implementation would need Vote model

  // Voting ended
  if (proposal.votingEndAt) {
    timeline.push({
      type: 'voting_ended',
      timestamp: proposal.votingEndAt,
      description: 'Voting period ended'
    });
  }

  // Status changes
  if (proposal.executedAt) {
    timeline.push({
      type: 'proposal_executed',
      timestamp: proposal.executedAt,
      description: 'Proposal executed on-chain'
    });
  }

  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

// Utility methods
proposalSchema.statics.exportProposalsToCSV = async function(daoId = null, options = {}) {
  const proposals = await this.searchProposals({ daoId, ...options });

  const headers = [
    'ID', 'Title', 'Status', 'Proposer', 'For Votes', 'Against Votes',
    'Abstain Votes', 'Total Votes', 'Created At', 'Voting Start', 'Voting End'
  ].join(',');

  const rows = proposals.map(proposal => [
    proposal.proposalId,
    `"${proposal.title.replace(/"/g, '""')}"`,
    proposal.status,
    proposal.proposer ? proposal.proposer.username : 'Unknown',
    proposal.forVotes,
    proposal.againstVotes,
    proposal.abstainVotes,
    proposal.totalVotes,
    proposal.created_at,
    proposal.votingStartAt,
    proposal.votingEndAt
  ].join(','));

  return [headers, ...rows].join('\n');
};

const Proposals = mongoose.model('Proposals', proposalSchema);

module.exports = Proposals;
