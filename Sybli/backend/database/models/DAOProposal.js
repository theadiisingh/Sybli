/**
 * DAOProposal Model
 * Represents governance proposals in the DAO
 */

const { Model } = require('objection');

class DAOProposal extends Model {
  static get tableName() {
    return 'dao_proposals';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['dao_id', 'proposer_id', 'title', 'description', 'voting_start_at', 'voting_end_at'],
      properties: {
        id: { type: 'integer' },
        dao_id: { type: 'integer' },
        proposer_id: { type: 'integer' },
        title: { type: 'string', maxLength: 200 },
        description: { type: 'string' },
        proposal_id: { type: 'string' },
        actions: { type: 'array' },
        value: { type: 'string' },
        target_contract: { type: 'string' },
        voting_start_at: { type: 'string', format: 'date-time' },
        voting_end_at: { type: 'string', format: 'date-time' },
        quorum_threshold: { type: 'number' },
        status: { 
          type: 'string', 
          enum: ['pending', 'active', 'succeeded', 'defeated', 'executed', 'canceled', 'expired'] 
        },
        for_votes: { type: 'string' },
        against_votes: { type: 'string' },
        abstain_votes: { type: 'string' },
        total_votes: { type: 'string' },
        executed_at: { type: 'string', format: 'date-time' },
        transaction_hash: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const User = require('./User');
    const Vote = require('./Vote');
    const DAO = require('./DAO');
    
    return {
      proposer: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'dao_proposals.proposer_id',
          to: 'users.id'
        }
      },
      dao: {
        relation: Model.BelongsToOneRelation,
        modelClass: DAO,
        join: {
          from: 'dao_proposals.dao_id',
          to: 'daos.id'
        }
      },
      votes: {
        relation: Model.HasManyRelation,
        modelClass: Vote,
        join: {
          from: 'dao_proposals.id',
          to: 'votes.proposal_id'
        }
      }
    };
  }

  // Instance methods
  isVotingActive() {
    const now = new Date();
    return now >= new Date(this.voting_start_at) && now <= new Date(this.voting_end_at);
  }

  isVotingEnded() {
    return new Date() > new Date(this.voting_end_at);
  }

  hasQuorum() {
    const totalVotes = parseFloat(this.total_votes) || 0;
    const quorumThreshold = parseFloat(this.quorum_threshold) || 0;
    return totalVotes >= quorumThreshold;
  }

  isPassing() {
    if (!this.isVotingEnded()) return false;
    
    const forVotes = parseFloat(this.for_votes) || 0;
    const againstVotes = parseFloat(this.against_votes) || 0;
    
    return forVotes > againstVotes && this.hasQuorum();
  }

  async calculateVoteTotals() {
    const votes = await this.$relatedQuery('votes');
    
    const totals = votes.reduce((acc, vote) => {
      const weight = parseFloat(vote.vote_weight) || 0;
      
      switch (vote.vote_type) {
        case 'for':
          acc.for += weight;
          break;
        case 'against':
          acc.against += weight;
          break;
        case 'abstain':
          acc.abstain += weight;
          break;
      }
      acc.total += weight;
      return acc;
    }, { for: 0, against: 0, abstain: 0, total: 0 });

    return totals;
  }

  async updateVoteTotals() {
    const totals = await this.calculateVoteTotals();
    
    await this.$query().patch({
      for_votes: totals.for.toString(),
      against_votes: totals.against.toString(),
      abstain_votes: totals.abstain.toString(),
      total_votes: totals.total.toString(),
      updated_at: new Date().toISOString()
    });
    
    return totals;
  }

  // Static methods
  static async createProposal(proposalData) {
    return await this.query().insert({
      ...proposalData,
      status: 'pending',
      for_votes: '0',
      against_votes: '0',
      abstain_votes: '0',
      total_votes: '0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  static async getActiveProposals(daoId = null) {
    const now = new Date().toISOString();
    const query = this.query()
      .where('voting_start_at', '<=', now)
      .where('voting_end_at', '>=', now)
      .where('status', 'active');

    if (daoId) {
      query.where('dao_id', daoId);
    }

    return await query;
  }

  static async getProposalsByStatus(status, daoId = null) {
    const query = this.query().where('status', status);
    
    if (daoId) {
      query.where('dao_id', daoId);
    }
    
    return await query.orderBy('created_at', 'desc');
  }

  static async updateProposalStatus(proposalId, newStatus) {
    return await this.query().patchAndFetchById(proposalId, {
      status: newStatus,
      updated_at: new Date().toISOString()
    });
  }

  static async executeProposal(proposalId, transactionHash) {
    return await this.query().patchAndFetchById(proposalId, {
      status: 'executed',
      executed_at: new Date().toISOString(),
      transaction_hash: transactionHash,
      updated_at: new Date().toISOString()
    });
  }

  static async getProposalsWithVoteCounts(daoId, limit = 50, offset = 0) {
    return await this.query()
      .where('dao_id', daoId)
      .select('dao_proposals.*')
      .select(
        this.raw('COUNT(votes.id) as vote_count'),
        this.raw('SUM(CASE WHEN votes.vote_type = "for" THEN CAST(votes.vote_weight AS DECIMAL) ELSE 0 END) as for_votes_total'),
        this.raw('SUM(CASE WHEN votes.vote_type = "against" THEN CAST(votes.vote_weight AS DECIMAL) ELSE 0 END) as against_votes_total')
      )
      .leftJoin('votes', 'dao_proposals.id', 'votes.proposal_id')
      .groupBy('dao_proposals.id')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  // Hooks
  async $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = this.created_at;
  }

  async $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}

module.exports = DAOProposal;