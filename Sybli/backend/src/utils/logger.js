// backend/src/utils/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Simple format for console logging
const consoleFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        
        if (stack) {
            log += `\n${stack}`;
        }
        
        if (Object.keys(meta).length > 0) {
            log += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
        return log;
    })
);

// Create the logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { 
        service: 'neurocredit-api',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        // Error logs
        new winston.transports.File({ 
            filename: path.join(logsDir, 'error.log'), 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        
        // Combined logs
        new winston.transports.File({ 
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        
        // Console output (only in development)
        ...(process.env.NODE_ENV !== 'production' ? [
            new winston.transports.Console({
                format: consoleFormat,
                level: 'debug'
            })
        ] : [])
    ],
});

// If we're in production, also log to console with simple format
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Add a stream for Morgan (HTTP logging)
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

// Helper methods for different log levels
logger.debug = (message, meta = {}) => {
    logger.log('debug', message, meta);
};

logger.info = (message, meta = {}) => {
    logger.log('info', message, meta);
};

logger.warn = (message, meta = {}) => {
    logger.log('warn', message, meta);
};

logger.error = (message, meta = {}) => {
    logger.log('error', message, meta);
};

// Special method for API requests
logger.api = (method, route, statusCode, responseTime, userAgent = '') => {
    logger.info('API Request', {
        method,
        route,
        statusCode,
        responseTime: `${responseTime}ms`,
        userAgent
    });
};

// Special method for blockchain transactions
logger.blockchain = (action, transactionHash, status, gasUsed = null) => {
    logger.info(`Blockchain ${action}`, {
        transactionHash,
        status,
        gasUsed
    });
};

// Special method for biometric operations
logger.biometric = (action, userId, status, details = {}) => {
    logger.info(`Biometric ${action}`, {
        userId,
        status,
        ...details
    });
};

// Special method for NFT operations
logger.nft = (action, tokenId, userId, status, details = {}) => {
    logger.info(`NFT ${action}`, {
        tokenId,
        userId,
        status,
        ...details
    });
};

module.exports = logger;