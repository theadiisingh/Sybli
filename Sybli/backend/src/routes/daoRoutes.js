/**
 * DAO Routes
 * Defines all DAO-related API endpoints
 */

const express = require('express');
const router = express.Router();
const daoController = require('../controllers/daoController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Public routes
router.get('/proposals', daoController.getAllProposals);
router.get('/proposals/:proposalId', daoController.getProposal);
router.get('/stats', daoController.getDAOStats);
router.get('/proposals/:proposalId/live', daoController.getLiveVoteUpdates);

// Protected routes (require authentication)
router.post('/proposals',
  [authMiddleware.authenticate, ...validationMiddleware.validationRules.validateProposalCreation],
  daoController.createProposal
);

router.post('/proposals/:proposalId/vote',
  [authMiddleware.authenticate, ...validationMiddleware.validationRules.validateVote],
  daoController.castVote
);

router.get('/my-votes', authMiddleware.authenticate, daoController.getMyVotes);

router.get('/proposals/:proposalId/eligibility',
  authMiddleware.authenticate,
  daoController.checkVotingEligibility
);

// Admin routes
router.put('/proposals/:proposalId/status',
  [authMiddleware.authenticate, ...validationMiddleware.validationRules.validateAdminAccess],
  daoController.updateProposalStatus
);

module.exports = router;
