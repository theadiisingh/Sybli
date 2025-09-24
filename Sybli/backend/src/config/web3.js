// backend/src/config/web3.js
const path = require('path');

module.exports = {
    // Blockchain network configuration
    network: {
        // Primary RPC endpoints (fallback supported)
        rpcUrls: {
            mainnet: process.env.ETHEREUM_MAINNET_RPC || 'https://mainnet.infura.io/v3/your-project-id',
            goerli: process.env.ETHEREUM_GOERLI_RPC || 'https://goerli.infura.io/v3/your-project-id',
            sepolia: process.env.ETHEREUM_SEPOLIA_RPC || 'https://sepolia.infura.io/v3/your-project-id',
            polygon: process.env.POLYGON_MAINNET_RPC || 'https://polygon-mainnet.infura.io/v3/your-project-id',
            mumbai: process.env.POLYGON_MUMBAI_RPC || 'https://polygon-mumbai.infura.io/v3/your-project-id',
            local: process.env.LOCAL_RPC_URL || 'http://localhost:8545'
        },

        // Default network for development
        default: process.env.DEFAULT_NETWORK || 'local',
        
        // Network chain IDs
        chainIds: {
            mainnet: 1,
            goerli: 5,
            sepolia: 11155111,
            polygon: 137,
            mumbai: 80001,
            local: 1337,
            hardhat: 31337
        },

        // Network configuration
        config: {
            local: {
                chainId: 1337,
                name: 'Local Development',
                nativeCurrency: {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18
                },
                rpcUrls: ['http://localhost:8545'],
                blockExplorerUrls: null
            },
            mumbai: {
                chainId: 80001,
                name: 'Polygon Mumbai Testnet',
                nativeCurrency: {
                    name: 'MATIC',
                    symbol: 'MATIC',
                    decimals: 18
                },
                rpcUrls: ['https://matic-mumbai.chainstacklabs.com'],
                blockExplorerUrls: ['https://mumbai.polygonscan.com']
            },
            goerli: {
                chainId: 5,
                name: 'Goerli Testnet',
                nativeCurrency: {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18
                },
                rpcUrls: ['https://goerli.infura.io/v3/'],
                blockExplorerUrls: ['https://goerli.etherscan.io']
            }
        }
    },

    // Contract addresses (will be populated after deployment)
    contracts: {
        HumanityRegistry: {
            address: process.env.NFT_CONTRACT_ADDRESS || null,
            abiPath: path.join(__dirname, '../../contracts/artifacts/contracts/HumanityRegistry.sol/HumanityRegistry.json'),
            deployedBlock: 0
        },
        SybilResistantDAO: {
            address: process.env.DAO_CONTRACT_ADDRESS || null,
            abiPath: path.join(__dirname, '../../contracts/artifacts/contracts/SybilResistantDAO.sol/SybilResistantDAO.json'),
            deployedBlock: 0
        }
    },

    // Transaction configuration
    transactions: {
        // Gas settings
        gas: {
            limit: {
                mint: 300000,
                vote: 200000,
                propose: 400000,
                default: 250000
            },
            price: {
                multiplier: 1.2, // 20% above estimated gas
                maxPriorityFee: '2000000000', // 2 Gwei
                maxFee: '30000000000' // 30 Gwei
            }
        },

        // Confirmation settings
        confirmations: {
            required: 1,
            timeout: 60000, // 60 seconds
            pollInterval: 1000 // 1 second
        },

        // Nonce management
        nonce: {
            cacheSize: 100,
            timeout: 30000 // 30 seconds
        }
    },

    // Account management
    accounts: {
        // Deployer account (for automated transactions)
        deployer: {
            privateKey: process.env.DEPLOYER_PRIVATE_KEY || null,
            address: process.env.DEPLOYER_ADDRESS || null
        },

        // Hot wallet for user interactions
        hotWallet: {
            privateKey: process.env.HOT_WALLET_PRIVATE_KEY || null,
            address: process.env.HOT_WALLET_ADDRESS || null
        }
    },

    // Event listening configuration
    events: {
        enabled: true,
        pollInterval: 2000, // 2 seconds
        maxBlocks: 1000,
        confirmationBlocks: 3
    },

    // Contract event signatures
    eventSignatures: {
        HumanityRegistered: '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0',
        Transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
        ProposalCreated: '0x7dff3d9f7e3bd3f0f47a43af8a0c67a14240b15a65e0fa7e0506f6b6b13b6b12',
        VoteCast: '0x5d268b4b8b1f5c7c8c8c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1'
    },

    // IPFS configuration (for NFT metadata)
    ipfs: {
        enabled: true,
        gateway: 'https://ipfs.io/ipfs/',
        apiUrl: process.env.IPFS_API_URL || 'https://ipfs.infura.io:5001',
        projectId: process.env.IPFS_PROJECT_ID,
        projectSecret: process.env.IPFS_PROJECT_SECRET
    },

    // Oracle configuration (for future enhancements)
    oracles: {
        chainlink: {
            enabled: false,
            rpcUrl: process.env.CHAINLINK_RPC_URL,
            jobId: process.env.CHAINLINK_JOB_ID
        }
    },

    // Performance optimization
    performance: {
        batchSize: 100,
        concurrency: 5,
        timeout: 30000,
        retries: 3
    },

    // Error handling and monitoring
    errors: {
        maxRetries: 3,
        retryDelay: 1000,
        alertThreshold: 5 // Alert after 5 consecutive errors
    },

    // Development and testing
    development: {
        autoDeploy: process.env.NODE_ENV === 'development',
        forkBlockNumber: null, // For testing specific states
        miningInterval: 0, // 0 = auto mine, 1 = interval mining
        loggerEnabled: true
    },

    // Security settings
    security: {
        privateKeyStorage: 'env', // env, aws-secrets, hashicorp-vault
        txSigning: {
            requireConfirmation: true,
            maxValue: '1000000000000000000', // 1 ETH
            allowedContracts: [] // Whitelist of contract addresses
        }
    }
};