// backend/src/services/web3Service.js
const { Web3 } = require('web3');
const { ethers } = require('ethers');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class Web3Service {
    constructor() {
        this.web3 = null;
        this.ethersProvider = null;
        this.contracts = new Map();
        this.account = null;
        this.initialized = false;
        this.initializeWeb3();
    }

    /**
     * Initialize Web3 connection
     */
    initializeWeb3() {
        try {
            // Get RPC URL from environment or use default
            const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 
                           process.env.ETHEREUM_RPC_URL || 
                           'http://localhost:8545'; // Local Hardhat node

            // Initialize Web3
            this.web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
            
            // Initialize Ethers.js provider (for better contract interaction)
            this.ethersProvider = new ethers.JsonRpcProvider(rpcUrl);

            // Set up account for transactions (if private key provided)
            if (process.env.DEPLOYER_PRIVATE_KEY) {
                this.account = this.web3.eth.accounts.privateKeyToAccount(
                    process.env.DEPLOYER_PRIVATE_KEY
                );
                this.web3.eth.accounts.wallet.add(this.account);
                logger.info('Web3 account configured', { address: this.account.address });
            }

            this.initialized = true;
            logger.info('Web3 service initialized', { rpcUrl, network: this.getNetworkName() });

        } catch (error) {
            logger.error('Failed to initialize Web3 service:', error);
            this.initialized = false;
        }
    }

    /**
     * Check if Web3 is connected and working
     */
    async isConnected() {
        if (!this.initialized || !this.web3) {
            return false;
        }

        try {
            await this.web3.eth.getBlockNumber();
            return true;
        } catch (error) {
            logger.error('Web3 connection check failed:', error);
            return false;
        }
    }

    /**
     * Get current network ID
     */
    async getNetworkId() {
        try {
            return await this.web3.eth.getChainId();
        } catch (error) {
            logger.error('Failed to get network ID:', error);
            throw new Error('Unable to connect to blockchain network');
        }
    }

    /**
     * Get network name from ID
     */
    getNetworkName(networkId = null) {
        const networks = {
            1: 'Ethereum Mainnet',
            3: 'Ropsten Testnet',
            4: 'Rinkeby Testnet',
            5: 'Goerli Testnet',
            42: 'Kovan Testnet',
            137: 'Polygon Mainnet',
            80001: 'Mumbai Testnet',
            1337: 'Local Hardhat',
            31337: 'Local Hardhat'
        };

        if (networkId) {
            return networks[networkId] || `Unknown Network (${networkId})`;
        }

        return networks;
    }

    /**
     * Get wallet balance
     */
    async getBalance(address) {
        try {
            const balance = await this.web3.eth.getBalance(address);
            return balance;
        } catch (error) {
            logger.error('Failed to get balance:', error);
            throw new Error(`Unable to get balance for address: ${address}`);
        }
    }

    /**
     * Validate Ethereum address
     */
    isValidAddress(address) {
        try {
            return this.web3.utils.isAddress(address);
        } catch (error) {
            return false;
        }
    }

    /**
     * Convert to checksum address
     */
    toChecksumAddress(address) {
        try {
            return this.web3.utils.toChecksumAddress(address);
        } catch (error) {
            logger.error('Failed to convert to checksum address:', error);
            return address;
        }
    }

    /**
     * Get contract instance
     */
    getContract(contractAddress, abi = null) {
        try {
            const cacheKey = contractAddress.toLowerCase();
            
            if (this.contracts.has(cacheKey)) {
                return this.contracts.get(cacheKey);
            }

            // Load ABI if not provided
            if (!abi) {
                abi = this.loadContractABI('HumanityRegistry');
            }

            const contract = new this.web3.eth.Contract(abi, contractAddress);
            this.contracts.set(cacheKey, contract);

            return contract;
        } catch (error) {
            logger.error('Failed to get contract instance:', error);
            throw new Error(`Unable to create contract instance for: ${contractAddress}`);
        }
    }

    /**
     * Get contract instance using Ethers.js (better for complex interactions)
     */
    getEthersContract(contractAddress, abi = null) {
        try {
            if (!abi) {
                abi = this.loadContractABI('HumanityRegistry');
            }

            if (!this.account) {
                return new ethers.Contract(contractAddress, abi, this.ethersProvider);
            }

            const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, this.ethersProvider);
            return new ethers.Contract(contractAddress, abi, signer);
        } catch (error) {
            logger.error('Failed to get Ethers contract instance:', error);
            throw new Error(`Unable to create Ethers contract instance for: ${contractAddress}`);
        }
    }

    /**
     * Load contract ABI from file
     */
    loadContractABI(contractName) {
        try {
            const abiPath = path.join(__dirname, '../../contracts/artifacts/contracts/', `${contractName}.sol/${contractName}.json`);
            
            if (!fs.existsSync(abiPath)) {
                // Fallback to hardcoded ABI for hackathon
                logger.warn(`ABI file not found at ${abiPath}, using fallback ABI`);
                return this.getFallbackABI(contractName);
            }

            const contractArtifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
            return contractArtifact.abi;
        } catch (error) {
            logger.error('Failed to load contract ABI:', error);
            return this.getFallbackABI(contractName);
        }
    }

    /**
     * Fallback ABI for hackathon development
     */
    getFallbackABI(contractName) {
        const abis = {
            'HumanityRegistry': [
                {
                    "inputs": [],
                    "stateMutability": "nonpayable",
                    "type": "constructor"
                },
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "internalType": "address",
                            "name": "owner",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "internalType": "address",
                            "name": "approved",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "internalType": "uint256",
                            "name": "tokenId",
                            "type": "uint256"
                        }
                    ],
                    "name": "Approval",
                    "type": "event"
                },
                {
                    "inputs": [
                        {
                            "internalType": "address",
                            "name": "to",
                            "type": "address"
                        },
                        {
                            "internalType": "uint256",
                            "name": "tokenId",
                            "type": "uint256"
                        }
                    ],
                    "name": "approve",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "bytes32",
                            "name": "bioHash",
                            "type": "bytes32"
                        }
                    ],
                    "name": "registerHumanity",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "uint256",
                            "name": "tokenId",
                            "type": "uint256"
                        }
                    ],
                    "name": "ownerOf",
                    "outputs": [
                        {
                            "internalType": "address",
                            "name": "",
                            "type": "address"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "bytes32",
                            "name": "",
                            "type": "bytes32"
                        }
                    ],
                    "name": "bioHashRegistered",
                    "outputs": [
                        {
                            "internalType": "bool",
                            "name": "",
                            "type": "bool"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ],
            'SybilResistantDAO': [
                {
                    "inputs": [
                        {
                            "internalType": "address",
                            "name": "nftAddress",
                            "type": "address"
                        }
                    ],
                    "stateMutability": "nonpayable",
                    "type": "constructor"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "title",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "description",
                            "type": "string"
                        },
                        {
                            "internalType": "string[]",
                            "name": "options",
                            "type": "string[]"
                        },
                        {
                            "internalType": "uint256",
                            "name": "durationHours",
                            "type": "uint256"
                        }
                    ],
                    "name": "createProposal",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "uint256",
                            "name": "proposalId",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint256",
                            "name": "optionIndex",
                            "type": "uint256"
                        }
                    ],
                    "name": "castVote",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "uint256",
                            "name": "proposalId",
                            "type": "uint256"
                        }
                    ],
                    "name": "getProposal",
                    "outputs": [
                        {
                            "components": [
                                {
                                    "internalType": "string",
                                    "name": "title",
                                    "type": "string"
                                },
                                {
                                    "internalType": "string",
                                    "name": "description",
                                    "type": "string"
                                },
                                {
                                    "internalType": "string[]",
                                    "name": "options",
                                    "type": "string[]"
                                },
                                {
                                    "internalType": "uint256",
                                    "name": "startTime",
                                    "type": "uint256"
                                },
                                {
                                    "internalType": "uint256",
                                    "name": "endTime",
                                    "type": "uint256"
                                },
                                {
                                    "internalType": "bool",
                                    "name": "isActive",
                                    "type": "bool"
                                },
                                {
                                    "internalType": "uint256[]",
                                    "name": "voteCounts",
                                    "type": "uint256[]"
                                }
                            ],
                            "internalType": "struct SybilResistantDAO.Proposal",
                            "name": "",
                            "type": "tuple"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
        };

        return abis[contractName] || [];
    }

    /**
     * Mint Humanity NFT
     */
    async mintNFT(walletAddress, metadata) {
        try {
            if (!this.initialized) {
                throw new Error('Web3 service not initialized');
            }

            const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
            if (!contractAddress) {
                throw new Error('NFT contract address not configured');
            }

            const contract = this.getEthersContract(contractAddress);
            
            // Generate bio-hash from metadata
            const bioHash = this.web3.utils.sha3(JSON.stringify(metadata));

            logger.info('Minting NFT', { walletAddress, bioHash });

            // Estimate gas first
            const gasEstimate = await contract.registerHumanity.estimateGas(bioHash);
            
            // Send transaction
            const tx = await contract.registerHumanity(bioHash, {
                gasLimit: gasEstimate * 2n, // Add buffer
                gasPrice: await this.ethersProvider.getGasPrice()
            });

            // Wait for confirmation
            const receipt = await tx.wait();

            if (!receipt.status) {
                throw new Error('Transaction failed');
            }

            // Get token ID from event logs
            const tokenId = this.extractTokenIdFromReceipt(receipt);

            logger.info('NFT minted successfully', {
                walletAddress,
                tokenId: tokenId.toString(),
                transactionHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            });

            return {
                success: true,
                tokenId: tokenId.toString(),
                transactionHash: receipt.hash,
                contractAddress: contractAddress,
                gasUsed: receipt.gasUsed.toString()
            };

        } catch (error) {
            logger.error('NFT minting failed:', error);
            return {
                success: false,
                error: error.message,
                details: this.parseError(error)
            };
        }
    }

    /**
     * Create a new DAO proposal
     */
    async createProposal(title, description, options, durationHours = 24) {
        try {
            const contractAddress = process.env.DAO_CONTRACT_ADDRESS;
            if (!contractAddress) {
                throw new Error('DAO contract address not configured');
            }

            const contract = this.getEthersContract(contractAddress);

            logger.info('Creating DAO proposal', { title, options: options.length });

            const tx = await contract.createProposal(
                title,
                description,
                options,
                durationHours
            );

            const receipt = await tx.wait();

            if (!receipt.status) {
                throw new Error('Proposal creation transaction failed');
            }

            const proposalId = this.extractProposalIdFromReceipt(receipt);

            logger.info('Proposal created successfully', {
                proposalId: proposalId.toString(),
                transactionHash: receipt.hash
            });

            return {
                success: true,
                proposalId: proposalId.toString(),
                transactionHash: receipt.hash,
                contractAddress: contractAddress
            };

        } catch (error) {
            logger.error('Proposal creation failed:', error);
            return {
                success: false,
                error: error.message,
                details: this.parseError(error)
            };
        }
    }

    /**
     * Cast a vote on a proposal
     */
    async castVote(proposalId, optionIndex, walletAddress, contractAddress = null) {
        try {
            if (!contractAddress) {
                contractAddress = process.env.DAO_CONTRACT_ADDRESS;
            }

            const contract = this.getEthersContract(contractAddress);

            logger.info('Casting vote', { proposalId, optionIndex, walletAddress });

            const tx = await contract.castVote(proposalId, optionIndex);
            const receipt = await tx.wait();

            if (!receipt.status) {
                throw new Error('Vote transaction failed');
            }

            logger.info('Vote cast successfully', {
                proposalId,
                optionIndex,
                transactionHash: receipt.hash
            });

            return {
                success: true,
                transactionHash: receipt.hash
            };

        } catch (error) {
            logger.error('Vote casting failed:', error);
            return {
                success: false,
                error: error.message,
                details: this.parseError(error)
            };
        }
    }

    /**
     * Get NFT data
     */
    async getNFTData(tokenId, contractAddress = null) {
        try {
            if (!contractAddress) {
                contractAddress = process.env.NFT_CONTRACT_ADDRESS;
            }

            const contract = this.getContract(contractAddress);

            const owner = await contract.methods.ownerOf(tokenId).call();
            const tokenURI = await contract.methods.tokenURI(tokenId).call().catch(() => null);
            const isSoulbound = await contract.methods.isSoulbound(tokenId).call().catch(() => true);

            return {
                owner,
                tokenURI,
                isSoulbound,
                exists: !!owner && owner !== '0x0000000000000000000000000000000000000000'
            };

        } catch (error) {
            logger.error('Failed to get NFT data:', error);
            return {
                exists: false,
                error: error.message
            };
        }
    }

    /**
     * Get proposal data
     */
    async getProposalData(proposalId, contractAddress = null) {
        try {
            if (!contractAddress) {
                contractAddress = process.env.DAO_CONTRACT_ADDRESS;
            }

            const contract = this.getContract(contractAddress);

            const proposal = await contract.methods.getProposal(proposalId).call();
            
            return {
                title: proposal.title,
                description: proposal.description,
                options: proposal.options,
                startTime: parseInt(proposal.startTime),
                endTime: parseInt(proposal.endTime),
                isActive: proposal.isActive,
                voteCounts: proposal.voteCounts.map(v => parseInt(v)),
                totalVotes: proposal.voteCounts.reduce((sum, v) => sum + parseInt(v), 0)
            };

        } catch (error) {
            logger.error('Failed to get proposal data:', error);
            return {
                exists: false,
                error: error.message
            };
        }
    }

    /**
     * Verify NFT ownership
     */
    async verifyNFTOwnership(tokenId, walletAddress, contractAddress = null) {
        try {
            if (!contractAddress) {
                contractAddress = process.env.NFT_CONTRACT_ADDRESS;
            }

            const nftData = await this.getNFTData(tokenId, contractAddress);
            
            if (!nftData.exists) {
                return {
                    isValid: false,
                    reason: 'NFT does not exist'
                };
            }

            const isOwner = nftData.owner.toLowerCase() === walletAddress.toLowerCase();
            
            return {
                isValid: isOwner,
                reason: isOwner ? 'Ownership verified' : 'Wallet does not own this NFT',
                owner: nftData.owner,
                requestedOwner: walletAddress
            };

        } catch (error) {
            logger.error('NFT ownership verification failed:', error);
            return {
                isValid: false,
                reason: error.message
            };
        }
    }

    /**
     * Estimate gas for a transaction
     */
    async estimateGas(transactionData) {
        try {
            return await this.web3.eth.estimateGas(transactionData);
        } catch (error) {
            logger.error('Gas estimation failed:', error);
            throw new Error(`Gas estimation failed: ${error.message}`);
        }
    }

    /**
     * Wait for transaction confirmation
     */
    async waitForTransaction(txHash, confirmations = 1) {
        try {
            return await this.web3.eth.waitForTransactionReceipt(txHash, confirmations);
        } catch (error) {
            logger.error('Transaction wait failed:', error);
            throw new Error(`Transaction confirmation failed: ${error.message}`);
        }
    }

    /**
     * Get contract code
     */
    async getCode(address) {
        try {
            return await this.web3.eth.getCode(address);
        } catch (error) {
            logger.error('Failed to get contract code:', error);
            return '0x';
        }
    }

    /**
     * Extract token ID from transaction receipt
     */
    extractTokenIdFromReceipt(receipt) {
        try {
            // Look for Transfer event in logs
            for (const log of receipt.logs) {
                if (log.topics[0] === this.web3.utils.sha3('Transfer(address,address,uint256)')) {
                    // tokenId is the third topic
                    return BigInt(log.topics[3]);
                }
            }
            throw new Error('Token ID not found in receipt logs');
        } catch (error) {
            logger.error('Failed to extract token ID:', error);
            return 0n;
        }
    }

    /**
     * Extract proposal ID from transaction receipt
     */
    extractProposalIdFromReceipt(receipt) {
        try {
            // Look for ProposalCreated event
            for (const log of receipt.logs) {
                if (log.topics[0] === this.web3.utils.sha3('ProposalCreated(uint256,string)')) {
                    // proposalId is the first topic (after event signature)
                    return BigInt(log.topics[1]);
                }
            }
            throw new Error('Proposal ID not found in receipt logs');
        } catch (error) {
            logger.error('Failed to extract proposal ID:', error);
            return 0n;
        }
    }

    /**
     * Parse blockchain error messages
     */
    parseError(error) {
        if (error.message.includes('revert')) {
            return 'Transaction reverted - check contract requirements';
        }
        if (error.message.includes('insufficient funds')) {
            return 'Insufficient funds for transaction';
        }
        if (error.message.includes('nonce')) {
            return 'Nonce error - try again';
        }
        if (error.message.includes('gas')) {
            return 'Gas estimation failed - try with higher gas limit';
        }
        return error.message;
    }

    /**
     * Get service status
     */
    async getStatus() {
        const isConnected = await this.isConnected();
        const networkId = isConnected ? await this.getNetworkId() : null;
        
        return {
            initialized: this.initialized,
            connected: isConnected,
            networkId: networkId,
            networkName: networkId ? this.getNetworkName(networkId) : 'Disconnected',
            account: this.account ? this.account.address : 'No account configured',
            contractsLoaded: this.contracts.size
        };
    }
}

// Export singleton instance
module.exports = new Web3Service();