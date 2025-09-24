/**
 * NFT Routes
 * Defines all NFT-related API endpoints
 */

const express = require('express');
const router = express.Router();
const nftController = require('../controllers/nftController');
const authMiddleware = require('../middleware/authMiddleware');

// Protected routes
router.post('/create', authMiddleware, nftController.createNFT);
router.get('/:id', authMiddleware, nftController.getNFT);
router.post('/transfer', authMiddleware, nftController.transferNFT);

module.exports = router;
