// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Configurations
const serverConfig = require('./src/config/server');
const databaseConfig = require('./src/config/database');

// Services
const web3Service = require('./src/services/web3Service');
const emailService = require('./src/services/emailService');
const healthCheck = require('./src/utils/healthcheck');

// Middleware
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const biometricRoutes = require('./src/routes/biometricRoutes');
const nftRoutes = require('./src/routes/nftRoutes');
const daoRoutes = require('./src/routes/daoRoutes');
const healthRoutes = require('./src/routes/healthRoutes');

// Utils
const logger = require('./src/utils/logger');

class NeuroCreditServer {
    constructor() {
        this.app = express();
        this.server = null;
        this.isShuttingDown = false;
        
        this.initializeServer();
    }

    /**
     * Initialize the Express server
     */
    initializeServer() {
        // Create uploads directory if it doesn't exist
        this.createRequiredDirectories();

        // Apply middleware
        this.applyMiddleware();

        // Apply routes
        this.applyRoutes();

        // Apply error handling
        this.applyErrorHandling();

        // Initialize services
        this.initializeServices();
    }

    /**
     * Create required directories
     */
    createRequiredDirectories() {
        const directories = [
            path.join(__dirname, 'logs'),
            path.join(__dirname, 'uploads', 'temp'),
            path.join(__dirname, 'uploads', 'permanent'),
            path.join(__dirname, 'tmp')
        ];

        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                logger.info(`Created directory: ${dir}`);
            }
        });
    }

    /**
     * Apply all middleware
     */
    applyMiddleware() {
        // Security middleware
        this.app.use(helmet(serverConfig.security.helmet));

        // CORS configuration
        this.app.use(cors(serverConfig.api.cors));

        // Rate limiting
        const limiter = rateLimit(serverConfig.api.rateLimit);
        this.app.use(limiter);

        // Compression
        this.app.use(compression(serverConfig.performance.compression));

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Static files
        this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
        this.app.use('/public', express.static(path.join(__dirname, 'public')));

        // Logging middleware
        if (serverConfig.logging.console.enabled) {
            this.app.use(morgan(serverConfig.logging.format, {
                stream: { write: message => logger.info(message.trim()) }
            }));
        }

        // Remove X-Powered-By header
        this.app.disable('x-powered-by');

        // Trust proxy (if behind reverse proxy)
        if (serverConfig.production.behindProxy) {
            this.app.set('trust proxy', serverConfig.production.trustProxy);
        }

        // Request logging middleware
        this.app.use((req, res, next) => {
            req.startTime = Date.now();
            logger.http(`${req.method} ${req.originalUrl}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                contentType: req.get('Content-Type')
            });
            next();
        });

        // Response logging middleware
        this.app.use((req, res, next) => {
            const originalSend = res.send;
            res.send = function(data) {
                const responseTime = Date.now() - req.startTime;
                logger.http(`Response ${res.statusCode}`, {
                    method: req.method,
                    url: req.originalUrl,
                    statusCode: res.statusCode,
                    responseTime: `${responseTime}ms`,
                    contentLength: res.get('Content-Length')
                });
                originalSend.call(this, data);
            };
            next();
        });

        logger.info('Middleware applied successfully');
    }

    /**
     * Apply all routes
     */
    applyRoutes() {
        // Health check routes (no authentication required)
        this.app.use('/health', healthRoutes);

        // API routes
        this.app.use(`${serverConfig.api.prefix}/${serverConfig.api.version}/auth`, authRoutes);
        this.app.use(`${serverConfig.api.prefix}/${serverConfig.api.version}/users`, userRoutes);
        this.app.use(`${serverConfig.api.prefix}/${serverConfig.api.version}/biometric`, biometricRoutes);
        this.app.use(`${serverConfig.api.prefix}/${serverConfig.api.version}/nft`, nftRoutes);
        this.app.use(`${serverConfig.api.prefix}/${serverConfig.api.version}/dao`, daoRoutes);

        // API documentation route
        if (serverConfig.development.swagger.enabled) {
            this.setupSwagger();
        }

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                message: '🚀 NeuroCredit API Server',
                version: serverConfig.server.version,
                environment: serverConfig.server.env,
                timestamp: new Date().toISOString(),
                endpoints: {
                    health: '/health',
                    api: `${serverConfig.api.prefix}/${serverConfig.api.version}`,
                    documentation: serverConfig.development.swagger.enabled ? '/api-docs' : null
                },
                links: {
                    github: 'https://github.com/neurocredit/neurocredit-api',
                    documentation: 'https://docs.neurocredit.io'
                }
            });
        });

        // 404 handler for API routes
        this.app.use(`${serverConfig.api.prefix}/*`, notFound);

        logger.info('Routes applied successfully');
    }

    /**
     * Setup Swagger documentation
     */
    setupSwagger() {
        try {
            const swaggerJsdoc = require('swagger-jsdoc');
            const swaggerUi = require('swagger-ui-express');

            const options = {
                definition: {
                    openapi: '3.0.0',
                    info: {
                        title: 'NeuroCredit API',
                        version: serverConfig.server.version,
                        description: 'Sybil-resistant identity and DAO platform API',
                        contact: {
                            name: 'API Support',
                            email: 'support@neurocredit.io'
                        },
                        license: {
                            name: 'MIT',
                            url: 'https://opensource.org/licenses/MIT'
                        }
                    },
                    servers: [
                        {
                            url: `http://localhost:${serverConfig.server.port}`,
                            description: 'Development server'
                        },
                        {
                            url: 'https://api.neurocredit.io',
                            description: 'Production server'
                        }
                    ],
                    components: {
                        securitySchemes: {
                            bearerAuth: {
                                type: 'http',
                                scheme: 'bearer',
                                bearerFormat: 'JWT'
                            }
                        }
                    },
                    security: [{
                        bearerAuth: []
                    }]
                },
                apis: ['./src/routes/*.js', './src/models/*.js'] // Path to API docs
            };

            const specs = swaggerJsdoc(options);
            this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
                explorer: true,
                customCss: '.swagger-ui .topbar { display: none }',
                customSiteTitle: 'NeuroCredit API Documentation'
            }));

            logger.info('Swagger documentation available at /api-docs');
        } catch (error) {
            logger.warn('Swagger setup failed:', error.message);
        }
    }

    /**
     * Apply error handling middleware
     */
    applyErrorHandling() {
        // 404 handler for non-API routes
        this.app.use('*', notFound);

        // Global error handler
        this.app.use(errorHandler);

        logger.info('Error handling middleware applied');
    }

    /**
     * Initialize external services
     */
    async initializeServices() {
        try {
            // Initialize database connection
            await this.initializeDatabase();

            // Initialize Web3 service
            await this.initializeWeb3();

            // Initialize email service
            await this.initializeEmailService();

            // Run initial health check
            await this.runInitialHealthCheck();

            logger.info('All services initialized successfully');
        } catch (error) {
            logger.error('Service initialization failed:', error);
            process.exit(1);
        }
    }

    /**
     * Initialize database connection
     */
    async initializeDatabase() {
        try {
            mongoose.set('autoIndex', databaseConfig.mongoose.autoIndex);
            
            await mongoose.connect(
                databaseConfig.connection.url, 
                databaseConfig.connection.options
            );

            logger.info('✅ MongoDB connected successfully', {
                host: mongoose.connection.host,
                port: mongoose.connection.port,
                database: mongoose.connection.name
            });

            // Database event handlers
            mongoose.connection.on('error', (error) => {
                logger.error('MongoDB connection error:', error);
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB disconnected');
            });

            mongoose.connection.on('reconnected', () => {
                logger.info('MongoDB reconnected');
            });

        } catch (error) {
            logger.error('❌ MongoDB connection failed:', error);
            throw error;
        }
    }

    /**
     * Initialize Web3 service
     */
    async initializeWeb3() {
        try {
            // Web3 service auto-initializes, just check connection
            const isConnected = await web3Service.isConnected();
            
            if (isConnected) {
                const networkId = await web3Service.getNetworkId();
                logger.info('✅ Web3 service connected', {
                    network: web3Service.getNetworkName(networkId),
                    networkId: networkId,
                    account: web3Service.account ? web3Service.account.address : 'No account configured'
                });
            } else {
                throw new Error('Web3 service connection failed');
            }
        } catch (error) {
            logger.error('❌ Web3 service initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize email service
     */
    async initializeEmailService() {
        try {
            const status = await emailService.verifyConnection();
            
            if (status.success) {
                logger.info('✅ Email service initialized', emailService.getStats());
            } else {
                logger.warn('⚠️ Email service has issues:', status.message);
            }
        } catch (error) {
            logger.warn('⚠️ Email service initialization warning:', error.message);
            // Don't throw error for email service - it's not critical
        }
    }

    /**
     * Run initial health check
     */
    async runInitialHealthCheck() {
        try {
            const health = await healthCheck.runAllChecks();
            
            if (health.status === 'healthy') {
                logger.info('✅ Initial health check passed');
            } else {
                logger.warn('⚠️ Initial health check warnings:', {
                    status: health.status,
                    failedChecks: Object.entries(health.checks)
                        .filter(([_, check]) => check.status !== 'healthy')
                        .map(([key]) => key)
                });
            }
        } catch (error) {
            logger.error('Initial health check failed:', error);
        }
    }

    /**
     * Start the server
     */
    async start() {
        try {
            this.server = this.app.listen(serverConfig.server.port, serverConfig.server.host, () => {
                logger.info(`🚀 NeuroCredit Server started successfully`, {
                    environment: serverConfig.server.env,
                    port: serverConfig.server.port,
                    host: serverConfig.server.host,
                    version: serverConfig.server.version,
                    pid: process.pid,
                    nodeVersion: process.version
                });

                // Log important URLs
                console.log('\n📊 Server Information:');
                console.log(`   Environment: ${serverConfig.server.env}`);
                console.log(`   Server: http://${serverConfig.server.host}:${serverConfig.server.port}`);
                console.log(`   Health: http://${serverConfig.server.host}:${serverConfig.server.port}/health`);
                
                if (serverConfig.development.swagger.enabled) {
                    console.log(`   API Docs: http://${serverConfig.server.host}:${serverConfig.server.port}/api-docs`);
                }

                console.log('\n🔗 Available Endpoints:');
                console.log(`   API Base: ${serverConfig.api.prefix}/${serverConfig.api.version}`);
                console.log(`   Authentication: /auth`);
                console.log(`   Users: /users`);
                console.log(`   Biometric: /biometric`);
                console.log(`   NFT: /nft`);
                console.log(`   DAO: /dao`);
                console.log('');

                // Emit server started event
                this.emit('started');
            });

            // Handle server errors
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    logger.error(`Port ${serverConfig.server.port} is already in use`);
                    process.exit(1);
                } else {
                    logger.error('Server error:', error);
                }
            });

            // Setup graceful shutdown
            this.setupGracefulShutdown();

            return this.server;
        } catch (error) {
            logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    /**
     * Setup graceful shutdown handlers
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            if (this.isShuttingDown) return;
            this.isShuttingDown = true;

            logger.info(`Received ${signal}, starting graceful shutdown...`);

            // Close server to new connections
            if (this.server) {
                this.server.close(() => {
                    logger.info('HTTP server closed');
                });
            }

            // Close database connection
            if (mongoose.connection.readyState === 1) {
                await mongoose.connection.close();
                logger.info('MongoDB connection closed');
            }

            // Close other connections (Redis, etc.)
            // Add any other cleanup here

            logger.info('Graceful shutdown completed');
            process.exit(0);
        };

        // Handle different shutdown signals
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            shutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            shutdown('unhandledRejection');
        });
    }

    /**
     * Stop the server
     */
    async stop() {
        if (this.server) {
            this.server.close();
            logger.info('Server stopped');
        }
    }

    /**
     * Get Express app instance (for testing)
     */
    getApp() {
        return this.app;
    }

    /**
     * Get server status
     */
    getStatus() {
        return {
            started: !!this.server,
            environment: serverConfig.server.env,
            port: serverConfig.server.port,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            connections: this.server ? this.server._connections : 0
        };
    }
}

// Create and export server instance
const server = new NeuroCreditServer();

// Start server if this file is run directly
if (require.main === module) {
    server.start().catch(error => {
        logger.error('Failed to start server:', error);
        process.exit(1);
    });
}

module.exports = server;