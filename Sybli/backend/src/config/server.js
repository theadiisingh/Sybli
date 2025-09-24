/**
 * Server Configuration
 * Server settings and configuration
 */
require('dotenv').config({ path: '.env.backend' });

const config = {
    // Server settings
    server: {
        port: process.env.PORT || 5000,
        host: process.env.HOST || 'localhost',
        nodeEnv: process.env.NODE_ENV || 'development'
    },

    // JWT Configuration
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
    },

    // Database Configuration
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/neurocredit',
        name: process.env.DB_NAME || 'neurocredit',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 27017
    },

    // Web3/Blockchain Configuration
    web3: {
        providerUrl: process.env.WEB3_PROVIDER_URL || 'http://localhost:8545',
        gasLimit: process.env.GAS_LIMIT || 300000,
        gasPrice: process.env.GAS_PRICE || '20000000000' // 20 gwei
    },

    // CORS settings
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },

    // Rate limiting
    rateLimit: {
        windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV === 'production' ? 
             parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 : 
             parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
        message: 'Too many requests from this IP, please try again later.'
    },

    // Session configuration
    session: {
        secret: process.env.SESSION_SECRET || 'neurocredit-session-secret-2024',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    },

    // File upload settings
    upload: {
        maxSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024, // 10MB
        allowedTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'text/plain',
            'video/mp4',
            'video/webm'
        ],
        uploadDir: './public/uploads'
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.NODE_ENV === 'production' ? 'json' : 'dev',
        file: process.env.LOG_FILE || './logs/app.log'
    },

    // Security settings
    security: {
        helmet: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            }
        },
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
        encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars-long'
    },

    // Biometric Configuration
    biometric: {
        hashSaltRounds: parseInt(process.env.BIOMETRIC_HASH_SALT_ROUNDS) || 12,
        patternThreshold: parseFloat(process.env.BIOMETRIC_PATTERN_THRESHOLD) || 0.8,
        minQualityScore: parseFloat(process.env.BIOMETRIC_MIN_QUALITY) || 0.6
    },

    // Contract Addresses (to be set after deployment)
    contracts: {
        humanityRegistry: process.env.HUMANITY_REGISTRY_ADDRESS || '',
        humanityNFT: process.env.HUMANITY_NFT_ADDRESS || '',
        daoContract: process.env.DAO_CONTRACT_ADDRESS || ''
    },

    // External Services
    external: {
        infuraProjectId: process.env.INFURA_PROJECT_ID || '',
        alchemyApiKey: process.env.ALCHEMY_API_KEY || '',
        sendgridApiKey: process.env.SENDGRID_API_KEY || ''
    },

    // API Configuration
    api: {
        version: process.env.API_VERSION || 'v1',
        prefix: process.env.API_PREFIX || '/api',
        timeout: parseInt(process.env.API_TIMEOUT) || 30000 // 30 seconds
    },

    // Cache Configuration
    cache: {
        ttl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
        checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD) || 120 // 2 minutes
    }
};

// Validate required environment variables
const requiredEnvVars = [
    'JWT_ACCESS_SECRET', 
    'JWT_REFRESH_SECRET',
    'MONGODB_URI'
];

const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(envVar => {
        console.error(`   - ${envVar}`);
    });
    
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    } else {
        console.warn('⚠️  Continuing in development mode with default values');
    }
}

// Environment-specific configurations
const environmentConfigs = {
    development: {
        logLevel: 'debug',
        corsOrigin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        database: {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/neurocredit_dev'
        }
    },
    
    production: {
        logLevel: 'warn',
        corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['https://yourdomain.com'],
        database: {
            uri: process.env.MONGODB_URI
        },
        security: {
            ...config.security,
            helmet: {
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
                        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
                        imgSrc: ["'self'", "data:", "https:"],
                        connectSrc: ["'self'", "https://api.yourdomain.com"]
                    }
                }
            }
        }
    },
    
    test: {
        logLevel: 'error',
        corsOrigin: ['http://localhost:3000'],
        database: {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/neurocredit_test'
        }
    }
};

// Merge environment-specific config
const environment = process.env.NODE_ENV || 'development';
const envConfig = environmentConfigs[environment] || {};

// Deep merge function
const deepMerge = (target, source) => {
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    Object.assign(target, source);
    return target;
};

// Apply environment-specific configuration
const finalConfig = deepMerge(config, envConfig);

// Helper methods
finalConfig.isDevelopment = () => finalConfig.server.nodeEnv === 'development';
finalConfig.isProduction = () => finalConfig.server.nodeEnv === 'production';
finalConfig.isTest = () => finalConfig.server.nodeEnv === 'test';

// Get database connection options
finalConfig.getDatabaseOptions = () => ({
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    ...(finalConfig.isProduction() ? {
        auth: {
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        },
        replicaSet: process.env.DB_REPLICA_SET
    } : {})
});

// Get CORS configuration
finalConfig.getCorsConfig = () => ({
    origin: finalConfig.cors.origin,
    credentials: finalConfig.cors.credentials,
    methods: finalConfig.cors.methods,
    allowedHeaders: finalConfig.cors.allowedHeaders
});

// Get rate limit configuration
finalConfig.getRateLimitConfig = () => ({
    windowMs: finalConfig.rateLimit.windowMs,
    max: finalConfig.rateLimit.max,
    message: finalConfig.rateLimit.message,
    standardHeaders: true,
    legacyHeaders: false
});

// Validate configuration
finalConfig.validate = () => {
    const issues = [];

    // Validate JWT secrets
    if (finalConfig.jwt.accessSecret.length < 32) {
        issues.push('JWT_ACCESS_SECRET should be at least 32 characters long');
    }
    if (finalConfig.jwt.refreshSecret.length < 32) {
        issues.push('JWT_REFRESH_SECRET should be at least 32 characters long');
    }

    // Validate MongoDB URI
    if (!finalConfig.database.uri.includes('mongodb://') && 
        !finalConfig.database.uri.includes('mongodb+srv://')) {
        issues.push('MONGODB_URI should be a valid MongoDB connection string');
    }

    // Validate biometric thresholds
    if (finalConfig.biometric.patternThreshold < 0 || finalConfig.biometric.patternThreshold > 1) {
        issues.push('BIOMETRIC_PATTERN_THRESHOLD should be between 0 and 1');
    }

    return issues;
};

// Configuration validation on startup
const validationIssues = finalConfig.validate();
if (validationIssues.length > 0) {
    console.warn('⚠️  Configuration issues found:');
    validationIssues.forEach(issue => console.warn(`   - ${issue}`));
    
    if (finalConfig.isProduction()) {
        console.error('❌ Cannot start production server with configuration issues');
        process.exit(1);
    }
}

console.log(`🚀 Server configuration loaded for ${environment} environment`);

module.exports = finalConfig;