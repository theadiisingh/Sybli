// backend/src/middleware/web3Middleware.js
const web3Service = require('../services/web3Service');
const logger = require('../utils/logger');

/**
 * Middleware to validate Ethereum address
 */
const validateEthAddress = (req, res, next) => {
    const address = req.body.walletAddress || req.params.walletAddress || req.query.address;
    
    if (!address) {
        return next();
    }

    if (!web3Service.isValidAddress(address)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid Ethereum address'
        });
    }

    // Normalize address to checksum format
    if (address) {
        req.normalizedAddress = web3Service.toChecksumAddress(address);
    }

    next();
};

/**
 * Middleware to check wallet balance
 */
const checkWalletBalance = async (req, res, next) => {
    try {
        const address = req.body.walletAddress || req.user?.walletAddress;
        
        if (!address) {
            return next();
        }

        const balance = await web3Service.getBalance(address);
        const MIN_BALANCE = web3Service.utils.toWei('0.001', 'ether'); // 0.001 ETH

        if (balance < MIN_BALANCE) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance for transaction',
                details: {
                    currentBalance: web3Service.utils.fromWei(balance, 'ether'),
                    minimumRequired: web3Service.utils.fromWei(MIN_BALANCE, 'ether')
                }
            });
        }

        req.walletBalance = balance;
        next();
    } catch (error) {
        logger.error('Wallet balance check error:', error);
        // Continue anyway - don't block if balance check fails
        next();
    }
};

/**
 * Middleware to estimate gas for transactions
 */
const estimateGas = async (req, res, next) => {
    try {
        if (!req.body.transactionData) {
            return next();
        }

        const gasEstimate = await web3Service.estimateGas(req.body.transactionData);
        req.gasEstimate = gasEstimate;

        logger.debug('Gas estimate calculated', { gasEstimate });
        next();
    } catch (error) {
        logger.error('Gas estimation error:', error);
        // Continue without gas estimate
        next();
    }
};

/**
 * Middleware to validate contract interaction
 */
const validateContractInteraction = async (req, res, next) => {
    try {
        const { contractAddress, functionName, parameters } = req.body;

        if (!contractAddress || !functionName) {
            return next();
        }

        // Validate contract address
        if (!web3Service.isValidAddress(contractAddress)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid contract address'
            });
        }

        // Check if contract is deployed
        const code = await web3Service.getCode(contractAddress);
        if (code === '0x') {
            return res.status(400).json({
                success: false,
                message: 'No contract deployed at this address'
            });
        }

        // Validate function exists (basic check)
        const contract = web3Service.getContract(contractAddress);
        if (!contract.methods[functionName]) {
            return res.status(400).json({
                success: false,
                message: `Function ${functionName} not found in contract`
            });
        }

        req.contract = contract;
        next();
    } catch (error) {
        logger.error('Contract validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Contract validation failed'
        });
    }
};

/**
 * Middleware to handle transaction confirmation
 */
const waitForTransaction = async (req, res, next) => {
    try {
        const { transactionHash, confirmations = 1 } = req.body;

        if (!transactionHash) {
            return next();
        }

        logger.info('Waiting for transaction confirmation', { transactionHash, confirmations });

        const receipt = await web3Service.waitForTransaction(transactionHash, confirmations);
        
        if (!receipt.status) {
            return res.status(400).json({
                success: false,
                message: 'Transaction failed',
                transactionHash: receipt.transactionHash
            });
        }

        req.transactionReceipt = receipt;
        logger.info('Transaction confirmed', { 
            transactionHash, 
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed 
        });

        next();
    } catch (error) {
        logger.error('Transaction confirmation error:', error);
        res.status(500).json({
            success: false,
            message: 'Transaction confirmation failed',
            error: error.message
        });
    }
};

/**
 * Middleware to check network status
 */
const checkNetworkStatus = async (req, res, next) => {
    try {
        const isConnected = await web3Service.isConnected();
        
        if (!isConnected) {
            return res.status(503).json({
                success: false,
                message: 'Blockchain network unavailable'
            });
        }

        const networkId = await web3Service.getNetworkId();
        const expectedNetwork = process.env.NETWORK_ID || '1'; // Mainnet by default

        if (networkId.toString() !== expectedNetwork) {
            logger.warn('Wrong network detected', { 
                expected: expectedNetwork, 
                actual: networkId 
            });

            return res.status(400).json({
                success: false,
                message: 'Wrong network detected',
                details: {
                    expectedNetwork: getNetworkName(expectedNetwork),
                    actualNetwork: getNetworkName(networkId.toString())
                }
            });
        }

        req.networkId = networkId;
        next();
    } catch (error) {
        logger.error('Network status check error:', error);
        res.status(503).json({
            success: false,
            message: 'Unable to connect to blockchain network'
        });
    }
};

/**
 * Middleware to rate limit blockchain interactions
 */
const rateLimitBlockchain = (req, res, next) => {
    // Simple in-memory rate limiting (use Redis in production)
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const WINDOW_SIZE = 60000; // 1 minute
    const MAX_REQUESTS = 30; // 30 requests per minute

    if (!global.rateLimit) {
        global.rateLimit = {};
    }

    if (!global.rateLimit[clientIP]) {
        global.rateLimit[clientIP] = [];
    }

    // Clean old requests
    global.rateLimit[clientIP] = global.rateLimit[clientIP].filter(
        timestamp => now - timestamp < WINDOW_SIZE
    );

    // Check rate limit
    if (global.rateLimit[clientIP].length >= MAX_REQUESTS) {
        return res.status(429).json({
            success: false,
            message: 'Too many blockchain requests',
            details: {
                maxRequests: MAX_REQUESTS,
                windowSize: '1 minute',
                retryAfter: '60 seconds'
            }
        });
    }

    // Record this request
    global.rateLimit[clientIP].push(now);

    next();
};

// Helper function to get network name
function getNetworkName(networkId) {
    const networks = {
        '1': 'Ethereum Mainnet',
        '3': 'Ropsten Testnet',
        '4': 'Rinkeby Testnet',
        '5': 'Goerli Testnet',
        '42': 'Kovan Testnet',
        '137': 'Polygon Mainnet',
        '80001': 'Mumbai Testnet'
    };
    return networks[networkId] || `Network ${networkId}`;
}

module.exports = {
    validateEthAddress,
    checkWalletBalance,
    estimateGas,
    validateContractInteraction,
    waitForTransaction,
    checkNetworkStatus,
    rateLimitBlockchain
};