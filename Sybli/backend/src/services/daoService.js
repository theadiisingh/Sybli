// backend/src/services/daoService.js
const Proposal = require('../../database/models/Proposals_new');
const Vote = require('../../database/models/Vote_new');
const User = require('../../database/models/User');

class DAOService {
    /**
     * Create a new proposal
     */
    async createProposal(proposalData) {
        try {
            const proposal = new Proposal(proposalData);
            return await proposal.save();
        } catch (error) {
            throw new Error(`Failed to create proposal: ${error.message}`);
        }
    }

    /**
     * Get proposal by ID
     */
    async getProposalById(proposalId) {
        try {
            return await Proposal.findOne({ proposalId });
        } catch (error) {
            throw new Error(`Failed to fetch proposal: ${error.message}`);
        }
    }

    /**
     * Get all proposals with pagination
     */
    async getAllProposals(skip = 0, limit = 10, status = null) {
        try {
            const query = status ? { status } : {};
            const proposals = await Proposal.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            
            const totalCount = await Proposal.countDocuments(query);
            
            return { proposals, totalCount };
        } catch (error) {
            throw new Error(`Failed to fetch proposals: ${error.message}`);
        }
    }

    /**
     * Record a vote
     */
    async recordVote(voteData) {
        try {
            const vote = new Vote(voteData);
            return await vote.save();
        } catch (error) {
            throw new Error(`Failed to record vote: ${error.message}`);
        }
    }

    /**
     * Check if user has already voted on a proposal
     */
    async getUserVote(proposalId, userId) {
        try {
            return await Vote.findOne({ proposalId, userId });
        } catch (error) {
            throw new Error(`Failed to fetch user vote: ${error.message}`);
        }
    }

    /**
     * Get vote counts for a proposal
     */
    async getVoteCounts(proposalId) {
        try {
            const votes = await Vote.find({ proposalId });
            const counts = {};
            
            // Initialize all options to 0
            for (let i = 0; i < 5; i++) { // Assuming max 5 options
                counts[i] = 0;
            }
            
            // Count actual votes
            votes.forEach(vote => {
                counts[vote.optionIndex] = (counts[vote.optionIndex] || 0) + 1;
            });
            
            return {
                ...counts,
                total: votes.length
            };
        } catch (error) {
            throw new Error(`Failed to count votes: ${error.message}`);
        }
    }

    /**
     * Get recent votes for a proposal
     */
    async getRecentVotes(proposalId, limit = 10) {
        try {
            return await Vote.find({ proposalId })
                .sort({ votedAt: -1 })
                .limit(limit)
                .populate('userId', 'username walletAddress');
        } catch (error) {
            throw new Error(`Failed to fetch recent votes: ${error.message}`);
        }
    }

    /**
     * Get user's voting history
     */
    async getUserVotes(userId, skip = 0, limit = 10) {
        try {
            const votes = await Vote.find({ userId })
                .sort({ votedAt: -1 })
                .skip(skip)
                .limit(limit);
            
            const totalCount = await Vote.countDocuments({ userId });
            
            return { votes, totalCount };
        } catch (error) {
            throw new Error(`Failed to fetch user votes: ${error.message}`);
        }
    }

    /**
     * Get DAO statistics
     */
    async getDAOStats() {
        try {
            const totalProposals = await Proposal.countDocuments();
            const activeProposals = await Proposal.countDocuments({ status: 'active' });
            const totalVotes = await Vote.countDocuments();
            const uniqueVoters = await Vote.distinct('userId');
            
            // Get total NFT holders (mock for now)
            const nftHolders = await User.countDocuments({ hasHumanityNFT: true });

            return {
                totalProposals,
                activeProposals,
                completedProposals: await Proposal.countDocuments({ status: 'completed' }),
                totalVotes,
                uniqueVoters: uniqueVoters.length,
                nftHolders,
                participationRate: nftHolders > 0 ? 
                    ((uniqueVoters.length / nftHolders) * 100).toFixed(1) : 0,
                
                // Today's activity
                votesToday: await this.getTodaysVotes(),
                proposalsToday: await this.getTodaysProposals()
            };
        } catch (error) {
            throw new Error(`Failed to fetch DAO stats: ${error.message}`);
        }
    }

    /**
     * Get today's votes
     */
    async getTodaysVotes() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return await Vote.countDocuments({ votedAt: { $gte: today } });
        } catch (error) {
            throw new Error(`Failed to fetch today's votes: ${error.message}`);
        }
    }

    /**
     * Get today's proposals
     */
    async getTodaysProposals() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return await Proposal.countDocuments({ createdAt: { $gte: today } });
        } catch (error) {
            throw new Error(`Failed to fetch today's proposals: ${error.message}`);
        }
    }

    /**
     * Update proposal status
     */
    async updateProposalStatus(proposalId, status) {
        try {
            return await Proposal.findOneAndUpdate(
                { proposalId },
                { 
                    status, 
                    updatedAt: new Date(),
                    ...(status === 'completed' ? { completedAt: new Date() } : {})
                },
                { new: true }
            );
        } catch (error) {
            throw new Error(`Failed to update proposal status: ${error.message}`);
        }
    }

    /**
     * Close expired proposals (for cron job)
     */
    async closeExpiredProposals() {
        try {
            const now = new Date();
            const result = await Proposal.updateMany(
                { 
                    status: 'active',
                    endTime: { $lt: now }
                },
                { 
                    status: 'completed',
                    updatedAt: now,
                    completedAt: now
                }
            );
            
            return result.modifiedCount;
        } catch (error) {
            throw new Error(`Failed to close expired proposals: ${error.message}`);
        }
    }
}

module.exports = new DAOService();