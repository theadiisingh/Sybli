/**
 * Web3 Service
 * Handles blockchain interactions and smart contract calls
 */

const Web3 = require('web3');
const web3Config = require('../config/web3');

class Web3Service {
  constructor() {
    this.web3 = new Web3(web3Config.provider);
    this.isConnected = false;
  }

  async connect() {
    try {
      this.isConnected = await this.web3.eth.net.isListening();
      return this.isConnected;
    } catch (error) {
      throw new Error('Failed to connect to blockchain: ' + error.message);
    }
  }

  async getBalance(address) {
    try {
      const balance = await this.web3.eth.getBalance(address);
      return this.web3.utils.fromWei(balance, 'ether');
    } catch (error) {
      throw new Error('Failed to get balance: ' + error.message);
    }
  }
}

module.exports = new Web3Service();
