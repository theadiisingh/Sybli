// backend/src/config/server.js
const path = require('path');

module.exports = {
    // Server basic configuration
    server: {
        port: process.env.PORT || 5000,
        host: process.env.HOST || '0.0.0.0',
        env: process.env.NODE_ENV || 'development',
        name: 'NeuroCredit API Server',
        version: process.env.npm_package_version || '1.0.0'
    },

    // API configuration
    api: {
        prefix: '/api',
        version: 'v1',
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: process.env.NODE_ENV === 'development' ? 1000 : 100,
            message: 'Too many requests from this IP, please try again later.'
        },
        cors: {
            origin: process.env.CORS_ORIGIN || [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'https://neurocredit.vercel.app'
            ],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'X-Requested-With',
                'Accept',
                'X-API-Key'
            ],
            credentials: true,
            maxAge: 86400 // 24 hours
        }
    },

    // Security configuration
    security: {
        jwt: {
            secret: process.env.JWT_SECRET || 'neurocredit-hackathon-super-secret-key-2024',
            algorithm: 'HS256',
            expiresIn: '7d', // 7 days
            refreshExpiresIn: '30d', // 30 days
            issuer: 'neurocredit-api',
            audience: 'neurocredit-users'
        },
        bcrypt: {
            saltRounds: 12
        },
        helmet: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }
    },

    // Session configuration
    session: {
        secret: process.env.SESSION_SECRET || 'neurocredit-session-secret-2024',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'lax'
        }
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.NODE_ENV === 'production' ? 'json' : 'simple',
        file: {
            enabled: true,
            path: path.join(__dirname, '../../logs'),
            maxSize: '10m',
            maxFiles: '10d'
        },
        console: {
            enabled: process.env.NODE_ENV !== 'test'
        }
    },

    // Upload configuration
    upload: {
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
            files: 1
        },
        destinations: {
            temp: path.join(__dirname, '../../uploads/temp'),
            permanent: path.join(__dirname, '../../uploads/permanent')
        },
        allowedTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'video/mp4',
            'video/webm'
        ]
    },

    // Cache configuration
    cache: {
        redis: {
            enabled: process.env.REDIS_URL !== undefined,
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            ttl: 3600 // 1 hour
        },
        memory: {
            enabled: true,
            ttl: 300, // 5 minutes
            max: 1000 // max items
        }
    },

    // WebSocket configuration
    websocket: {
        enabled: true,
        path: '/ws',
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            methods: ['GET', 'POST']
        }
    },

    // Monitoring and health checks
    monitoring: {
        enabled: true,
        path: '/health',
        metrics: {
            enabled: true,
            path: '/metrics',
            collectDefaultMetrics: true
        },
        readiness: {
            path: '/ready',
            checks: ['database', 'redis', 'blockchain']
        }
    },

    // Performance optimization
    performance: {
        compression: {
            enabled: true,
            threshold: 1024
        },
        etag: true,
        poweredBy: false // Remove X-Powered-By header
    },

    // Development-specific settings
    development: {
        swagger: {
            enabled: true,
            path: '/api-docs',
            options: {
                info: {
                    title: 'NeuroCredit API',
                    version: '1.0.0',
                    description: 'Sybil-resistant identity and DAO platform'
                },
                security: [{
                    bearerAuth: []
                }]
            }
        },
        debug: true,
        verboseErrors: true
    },

    // Production-specific settings
    production: {
        cluster: {
            enabled: false,
            workers: require('os').cpus().length
        },
        behindProxy: true,
        trustProxy: 1
    }
};