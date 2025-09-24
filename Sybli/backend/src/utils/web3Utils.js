/**
 * Web3 Utils
 * Utility functions for Web3 and blockchain operations
 */

const Web3 = require('web3');

class Web3Utils {
  async validateAddress(address) {
    try {
      // Validate blockchain address format
      return Web3.utils.isAddress(address);
    } catch (error) {
      throw new Error('Address validation failed: ' + error.message);
    }
  }

  async formatAddress(address) {
    try {
      // Format address for display
      if (!address) return '';
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    } catch (error) {
      throw new Error('Address formatting failed: ' + error.message);
    }
  }

  async toWei(amount, unit = 'ether') {
    try {
      // Convert amount to Wei
      return Web3.utils.toWei(amount.toString(), unit);
    } catch (error) {
      throw new Error('Wei conversion failed: ' + error.message);
    }
  }

  async fromWei(amount, unit = 'ether') {
    try {
      // Convert Wei to specified unit
      return Web3.utils.fromWei(amount.toString(), unit);
    } catch (error) {
      throw new Error('Wei conversion failed: ' + error.message);
    }
  }

  async estimateGas(transaction) {
    try {
      // Estimate gas for transaction
      // This would typically use web3.eth.estimateGas
      return 21000; // Default gas estimate
    } catch (error) {
      throw new Error('Gas estimation failed: ' + error.message);
    }
  }
}

module.exports = new Web3Utils();
