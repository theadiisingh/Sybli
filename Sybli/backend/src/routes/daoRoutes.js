/**
 * DAO Routes
 * Defines all DAO-related API endpoints
 */

const express = require('express');
const router = express.Router();
const daoController = require('../controllers/daoController');
const authMiddleware = require('../middleware/authMiddleware');

// Protected routes
router.post('/proposal', authMiddleware, daoController.createProposal);
router.post('/vote', authMiddleware, daoController.voteOnProposal);
router.get('/proposals', authMiddleware, daoController.getProposals);

module.exports = router;
