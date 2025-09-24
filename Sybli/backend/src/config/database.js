// backend/src/config/database.js
const path = require('path');

module.exports = {
    // Main database connection
    connection: {
        url: process.env.MONGODB_URI || 'mongodb://localhost:27017/neurocredit',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 30000,
            retryWrites: true,
            w: 'majority'
        }
    },

    // Database-specific settings
    database: {
        name: 'neurocredit',
        collections: {
            users: 'users',
            nfts: 'nfts',
            proposals: 'proposals',
            votes: 'votes',
            biometrics: 'biometric_hashes',
            sessions: 'sessions',
            audit: 'audit_logs'
        }
    },

    // Index configurations
    indexes: {
        users: [
            { fields: { walletAddress: 1 }, options: { unique: true } },
            { fields: { username: 1 }, options: { unique: true, sparse: true } },
            { fields: { email: 1 }, options: { unique: true, sparse: true } },
            { fields: { isBiometricVerified: 1 } },
            { fields: { hasHumanityNFT: 1 } },
            { fields: { createdAt: -1 } }
        ],
        nfts: [
            { fields: { tokenId: 1 }, options: { unique: true } },
            { fields: { userId: 1 } },
            { fields: { contractAddress: 1 } },
            { fields: { bioHash: 1 }, options: { unique: true } },
            { fields: { mintedAt: -1 } }
        ],
        proposals: [
            { fields: { proposalId: 1 }, options: { unique: true } },
            { fields: { createdBy: 1 } },
            { fields: { status: 1 } },
            { fields: { endTime: 1 } },
            { fields: { createdAt: -1 } }
        ],
        votes: [
            { fields: { proposalId: 1, userId: 1 }, options: { unique: true } },
            { fields: { proposalId: 1, optionIndex: 1 } },
            { fields: { userId: 1 } },
            { fields: { votedAt: -1 } }
        ],
        biometrics: [
            { fields: { bioHash: 1 }, options: { unique: true } },
            { fields: { userId: 1 } },
            { fields: { createdAt: -1 } }
        ]
    },

    // Mongoose configuration
    mongoose: {
        autoIndex: process.env.NODE_ENV === 'development',
        bufferCommands: true,
        bufferTimeoutMS: 30000,
        maxTimeMS: 30000
    },

    // Connection pooling
    pool: {
        max: 10,
        min: 2,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100
    },

    // Backup and maintenance
    maintenance: {
        autoBackup: false,
        backupInterval: '0 2 * * *', // 2 AM daily
        backupRetention: 7, // days
        compactInterval: '0 3 * * 0' // 3 AM every Sunday
    },

    // Performance tuning
    performance: {
        queryTimeout: 30000,
        aggregationTimeout: 60000,
        batchSize: 1000,
        readPreference: 'primary',
        writeConcern: {
            w: 'majority',
            j: true,
            wtimeout: 5000
        }
    },

    // Security
    security: {
        ssl: process.env.DB_SSL === 'true',
        sslValidate: false, // Set to true in production with proper CA
        authSource: 'admin',
        retryWrites: true
    },

    // Development and testing
    development: {
        useMock: process.env.NODE_ENV === 'test',
        autoCreateIndex: true,
        debug: process.env.DB_DEBUG === 'true',
        dropDatabase: false // NEVER set to true in production!
    },

    // Error handling
    errors: {
        maxReconnectAttempts: 5,
        reconnectInterval: 5000,
        connectionTimeout: 30000
    }
};