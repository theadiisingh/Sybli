/**
 * Web3 Middleware
 * Handles blockchain connection and transaction validation
 */

const web3Service = require('../services/web3Service');

const web3Middleware = async (req, res, next) => {
  try {
    // Validate blockchain connection
    if (!web3Service.isConnected()) {
      return res.status(503).json({ error: 'Blockchain service unavailable' });
    }

    // Additional Web3 validation logic here
    next();
  } catch (error) {
    res.status(500).json({ error: 'Web3 validation failed' });
  }
};

module.exports = web3Middleware;
