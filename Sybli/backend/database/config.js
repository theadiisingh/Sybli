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

    // Migration settings
    migrations: {
        directory: './migrations',
        collection: 'migrations'
    },

    // Seed settings
    seeds: {
        directory: './seeds'
    }
};
