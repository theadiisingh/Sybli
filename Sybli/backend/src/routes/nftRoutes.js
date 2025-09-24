/**
 * NFT Routes
 * Defines all NFT-related API endpoints
 */

const express = require('express');
const router = express.Router();
const nftController = require('../controllers/nftController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Public routes
router.get('/', nftController.getAllNFTs);
router.get('/stats', nftController.getNFTStats);
router.get('/token/:tokenId', nftController.getNFTByTokenId);
router.post('/verify', nftController.verifyNFT);

// Protected routes (require authentication)
router.post('/mint',
  authMiddleware.authenticate,
  validationMiddleware.validationRules.validateNFTMint,
  validationMiddleware.handleValidationErrors,
  nftController.mintHumanityNFT
);

router.get('/user/:userId', authMiddleware.authenticate, nftController.getNFTByUser);

// Admin routes
router.put('/:tokenId/metadata',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  validationMiddleware.validateAdminAccess,
  validationMiddleware.handleValidationErrors,
  nftController.updateNFTMetadata
);

router.post('/:tokenId/transfer',
  authMiddleware.authenticate,
  validationMiddleware.validationRules.validateNFTTransfer,
  validationMiddleware.handleValidationErrors,
  nftController.transferNFT
);

module.exports = router;
