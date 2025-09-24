/**
 * NFT Service
 * Handles NFT creation, management, and operations
 */

const web3Service = require('./web3Service');
const nftUtils = require('../utils/nftUtils');

class NFTService {
  async createNFT(metadata) {
    try {
      // Create NFT using Web3 service
      const nft = await nftUtils.createNFT(metadata);
      return nft;
    } catch (error) {
      throw new Error('NFT creation failed: ' + error.message);
    }
  }

  async getNFT(tokenId) {
    try {
      // Get NFT details
      const nft = await nftUtils.getNFT(tokenId);
      return nft;
    } catch (error) {
      throw new Error('Failed to get NFT: ' + error.message);
    }
  }

  async transferNFT(tokenId, from, to) {
    try {
      // Transfer NFT ownership
      const result = await nftUtils.transferNFT(tokenId, from, to);
      return result;
    } catch (error) {
      throw new Error('NFT transfer failed: ' + error.message);
    }
  }
}

module.exports = new NFTService();
