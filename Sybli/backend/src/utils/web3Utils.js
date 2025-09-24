/**
 * Web3 Utilities
 * Blockchain interaction utilities for NeuroCredit
 */

const { Web3 } = require('web3');
const config = require('../config/server');
const { API_RESPONSES, BLOCKCHAIN } = require('./constants');

class Web3Utils {
    constructor() {
        this.web3 = new Web3(config.web3.providerUrl);
        this.contracts = new Map();
        this.gasPriceCache = {
            value: null,
            timestamp: 0,
            ttl: 60000 // 1 minute
        };
    }

    /**
     * Initialize Web3 provider with fallback options
     */
    initializeProvider(providerUrl = null) {
        try {
            const url = providerUrl || config.web3.providerUrl;
            this.web3 = new Web3(url);
            
            // Test connection
            return this.testConnection();
        } catch (error) {
            throw new Error(`Web3 provider initialization failed: ${error.message}`);
        }
    }

    /**
     * Test Web3 connection
     */
    async testConnection() {
        try {
            const isListening = await this.web3.eth.net.isListening();
            if (!isListening) {
                throw new Error('Web3 provider is not listening');
            }

            const blockNumber = await this.web3.eth.getBlockNumber();
            const chainId = await this.web3.eth.getChainId();

            return {
                connected: true,
                blockNumber,
                chainId,
                provider: this.web3.currentProvider.constructor.name
            };
        } catch (error) {
            throw new Error(`Web3 connection test failed: ${error.message}`);
        }
    }

    /**
     * Validate Ethereum address with checksum
     */
    validateAddress(address) {
        try {
            return this.web3.utils.isAddress(address);
        } catch (error) {
            return false;
        }
    }

    /**
     * Convert address to checksum format
     */
    toChecksumAddress(address) {
        try {
            return this.web3.utils.toChecksumAddress(address);
        } catch (error) {
            throw new Error(`Address checksum conversion failed: ${error.message}`);
        }
    }

    /**
     * Validate and recover signature
     */
    validateSignature(message, signature, expectedAddress) {
        try {
            const recoveredAddress = this.web3.eth.accounts.recover(message, signature);
            return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
        } catch (error) {
            return false;
        }
    }

    /**
     * Recover address from signature
     */
    recoverAddress(message, signature) {
        try {
            return this.web3.eth.accounts.recover(message, signature);
        } catch (error) {
            throw new Error(`Signature recovery failed: ${error.message}`);
        }
    }

    /**
     * Create signed message for authentication
     */
    createSignableMessage(nonce, walletAddress) {
        try {
            const message = `NeuroCredit Authentication: ${nonce}\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
            const messageHash = this.web3.utils.sha3(message);
            return {
                message,
                messageHash,
                nonce
            };
        } catch (error) {
            throw new Error(`Signable message creation failed: ${error.message}`);
        }
    }

    /**
     * Get current gas price with caching
     */
    async getGasPrice() {
        try {
            const now = Date.now();
            
            // Use cached gas price if still valid
            if (this.gasPriceCache.value && now - this.gasPriceCache.timestamp < this.gasPriceCache.ttl) {
                return this.gasPriceCache.value;
            }

            const gasPrice = await this.web3.eth.getGasPrice();
            this.gasPriceCache = {
                value: gasPrice,
                timestamp: now,
                ttl: 60000
            };

            return gasPrice;
        } catch (error) {
            // Return default gas price if fetch fails
            return BLOCKCHAIN.DEFAULT_GAS_PRICE;
        }
    }

    /**
     * Estimate gas for transaction
     */
    async estimateGas(transactionConfig) {
        try {
            return await this.web3.eth.estimateGas(transactionConfig);
        } catch (error) {
            console.warn('Gas estimation failed, using default:', error.message);
            return BLOCKCHAIN.DEFAULT_GAS_LIMIT;
        }
    }

    /**
     * Get transaction receipt with retry logic
     */
    async getTransactionReceipt(txHash, maxRetries = 5, delay = 2000) {
        try {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                const receipt = await this.web3.eth.getTransactionReceipt(txHash);
                
                if (receipt) {
                    return receipt;
                }

                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            throw new Error('Transaction receipt not found after retries');
        } catch (error) {
            throw new Error(`Transaction receipt retrieval failed: ${error.message}`);
        }
    }

    /**
     * Wait for transaction confirmation
     */
    async waitForTransaction(txHash, confirmations = BLOCKCHAIN.CONFIRMATIONS_REQUIRED) {
        try {
            const receipt = await this.getTransactionReceipt(txHash);
            
            if (!receipt.status) {
                throw new Error('Transaction failed');
            }

            // Wait for required confirmations
            if (confirmations > 0) {
                const currentBlock = await this.web3.eth.getBlockNumber();
                while (currentBlock - receipt.blockNumber < confirmations) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            return {
                success: true,
                receipt,
                confirmations: confirmations > 0 ? confirmations : 0
            };
        } catch (error) {
            throw new Error(`Transaction confirmation failed: ${error.message}`);
        }
    }

    /**
     * Send transaction with enhanced error handling
     */
    async sendTransaction(transactionConfig, privateKey) {
        try {
            // Estimate gas
            const gasLimit = await this.estimateGas(transactionConfig);
            
            // Get gas price
            const gasPrice = await this.getGasPrice();

            // Create signed transaction
            const signedTx = await this.web3.eth.accounts.signTransaction({
                ...transactionConfig,
                gas: gasLimit,
                gasPrice: gasPrice
            }, privateKey);

            // Send transaction
            const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                gasUsed: receipt.gasUsed,
                status: receipt.status
            };
        } catch (error) {
            throw new Error(`Transaction sending failed: ${error.message}`);
        }
    }

    /**
     * Call contract method
     */
    async callContractMethod(contractAddress, abi, methodName, params = []) {
        try {
            const contract = new this.web3.eth.Contract(abi, contractAddress);
            const result = await contract.methods[methodName](...params).call();
            
            return {
                success: true,
                result,
                contractAddress,
                methodName
            };
        } catch (error) {
            throw new Error(`Contract method call failed: ${error.message}`);
        }
    }

    /**
     * Send contract transaction
     */
    async sendContractTransaction(contractAddress, abi, methodName, params = [], privateKey, value = '0') {
        try {
            const contract = new this.web3.eth.Contract(abi, contractAddress);
            
            const data = contract.methods[methodName](...params).encodeABI();
            
            const transactionConfig = {
                to: contractAddress,
                data: data,
                value: value
            };

            return await this.sendTransaction(transactionConfig, privateKey);
        } catch (error) {
            throw new Error(`Contract transaction failed: ${error.message}`);
        }
    }

    /**
     * Get contract events with filtering
     */
    async getContractEvents(contractAddress, abi, eventName, options = {}) {
        try {
            const contract = new this.web3.eth.Contract(abi, contractAddress);
            const events = await contract.getPastEvents(eventName, {
                fromBlock: options.fromBlock || 0,
                toBlock: options.toBlock || 'latest',
                filter: options.filter || {}
            });

            return {
                success: true,
                events,
                count: events.length
            };
        } catch (error) {
            throw new Error(`Contract events retrieval failed: ${error.message}`);
        }
    }

    /**
     * Get wallet balance
     */
    async getBalance(walletAddress) {
        try {
            const balance = await this.web3.eth.getBalance(walletAddress);
            const balanceInEth = this.web3.utils.fromWei(balance, 'ether');
            
            return {
                success: true,
                balance: balance,
                balanceInEth: parseFloat(balanceInEth),
                walletAddress
            };
        } catch (error) {
            throw new Error(`Balance retrieval failed: ${error.message}`);
        }
    }

    /**
     * Transfer ETH between accounts
     */
    async transferETH(fromAddress, privateKey, toAddress, amountInEth) {
        try {
            const amountInWei = this.web3.utils.toWei(amountInEth.toString(), 'ether');
            
            const transactionConfig = {
                from: fromAddress,
                to: toAddress,
                value: amountInWei
            };

            return await this.sendTransaction(transactionConfig, privateKey);
        } catch (error) {
            throw new Error(`ETH transfer failed: ${error.message}`);
        }
    }

    /**
     * Generate new wallet
     */
    generateWallet() {
        try {
            const account = this.web3.eth.accounts.create();
            
            return {
                success: true,
                address: account.address,
                privateKey: account.privateKey,
                publicKey: account.publicKey
            };
        } catch (error) {
            throw new Error(`Wallet generation failed: ${error.message}`);
        }
    }

    /**
     * Encrypt private key with password
     */
    encryptPrivateKey(privateKey, password) {
        try {
            const encrypted = this.web3.eth.accounts.encrypt(privateKey, password);
            return {
                success: true,
                encrypted: JSON.stringify(encrypted)
            };
        } catch (error) {
            throw new Error(`Private key encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt private key with password
     */
    decryptPrivateKey(encryptedKey, password) {
        try {
            const decrypted = this.web3.eth.accounts.decrypt(JSON.parse(encryptedKey), password);
            return {
                success: true,
                privateKey: decrypted.privateKey,
                address: decrypted.address
            };
        } catch (error) {
            throw new Error(`Private key decryption failed: ${error.message}`);
        }
    }

    /**
     * Get transaction history for address
     */
    async getTransactionHistory(address, limit = 50) {
        try {
            // Note: This is a simplified implementation
            // In production, you might use a blockchain explorer API
            const currentBlock = await this.web3.eth.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000); // Last 10k blocks
            
            // This would need to be implemented with proper indexing
            // For now, return basic info
            return {
                success: true,
                address,
                transactionCount: await this.web3.eth.getTransactionCount(address),
                lastBlock: currentBlock,
                message: 'Full transaction history requires blockchain indexing'
            };
        } catch (error) {
            throw new Error(`Transaction history retrieval failed: ${error.message}`);
        }
    }

    /**
     * Get network information
     */
    async getNetworkInfo() {
        try {
            const [blockNumber, chainId, gasPrice, peerCount] = await Promise.all([
                this.web3.eth.getBlockNumber(),
                this.web3.eth.getChainId(),
                this.web3.eth.getGasPrice(),
                this.web3.eth.net.getPeerCount()
            ]);

            return {
                success: true,
                blockNumber,
                chainId,
                gasPrice: this.web3.utils.fromWei(gasPrice, 'gwei'),
                peerCount,
                isSyncing: await this.web3.eth.isSyncing(),
                networkType: this.getNetworkType(chainId)
            };
        } catch (error) {
            throw new Error(`Network info retrieval failed: ${error.message}`);
        }
    }

    /**
     * Get network type from chain ID
     */
    getNetworkType(chainId) {
        const networks = {
            1: 'mainnet',
            3: 'ropsten',
            4: 'rinkeby',
            5: 'goerli',
            42: 'kovan',
            56: 'binance',
            97: 'binance-testnet',
            137: 'polygon',
            80001: 'mumbai',
            1337: 'local',
            31337: 'local'
        };

        return networks[chainId] || `unknown-${chainId}`;
    }

    /**
     * Convert between units
     */
    convertUnits(value, fromUnit, toUnit) {
        try {
            const weiValue = this.web3.utils.toWei(value.toString(), fromUnit);
            const converted = this.web3.utils.fromWei(weiValue, toUnit);
            
            return {
                success: true,
                value: parseFloat(converted),
                fromUnit,
                toUnit
            };
        } catch (error) {
            throw new Error(`Unit conversion failed: ${error.message}`);
        }
    }

    /**
     * Validate contract ABI
     */
    validateABI(abi) {
        try {
            if (!Array.isArray(abi)) {
                return false;
            }

            // Basic ABI validation
            const requiredFunctionFields = ['name', 'type', 'inputs'];
            
            for (const item of abi) {
                if (!item.type) return false;
                
                if (item.type === 'function' || item.type === 'event') {
                    for (const field of requiredFunctionFields) {
                        if (!(field in item)) return false;
                    }
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Create contract instance
     */
    createContractInstance(contractAddress, abi) {
        try {
            if (!this.validateABI(abi)) {
                throw new Error('Invalid ABI provided');
            }

            const contract = new this.web3.eth.Contract(abi, contractAddress);
            this.contracts.set(contractAddress, contract);
            
            return contract;
        } catch (error) {
            throw new Error(`Contract instance creation failed: ${error.message}`);
        }
    }

    /**
     * Get cached contract instance
     */
    getCachedContract(contractAddress) {
        return this.contracts.get(contractAddress);
    }

    /**
     * Clear contract cache
     */
    clearContractCache() {
        this.contracts.clear();
    }
}

// Create singleton instance
const web3Utils = new Web3Utils();

module.exports = web3Utils;