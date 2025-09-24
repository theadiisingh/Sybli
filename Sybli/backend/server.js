/**
 * NeuroCredit Backend Server
 * Main server entry point with comprehensive service integration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import configurations
const serverConfig = require('./src/config/server');

// Import database
const { 
    initializeDatabase, 
    closeDatabase, 
    healthCheck,
    mongodbConnection,
    User,
    BiometricHash,
    NFTRecord
} = require('./database');

// Import services
const web3Service = require('./src/services/web3Service');
const hashingService = require('./src/services/hashingService');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');
const requestLogger = require('./src/middleware/requestLogger');
const authMiddleware = require('./src/middleware/authMiddleware');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const biometricRoutes = require('./src/routes/biometricRoutes');
const nftRoutes = require('./src/routes/nftRoutes');
const daoRoutes = require('./src/routes/daoRoutes');

// Import utils
const Logger = require('./src/utils/logger');

class NeuroCreditServer {
    constructor() {
        this.app = express();
        this.server = null;
        this.isShuttingDown = false;
        this.startTime = new Date();
        
        this.initializeServer();
    }

    /**
     * Initialize the Express server
     */
    initializeServer() {
        try {
            // Create required directories
            this.createRequiredDirectories();

            // Apply middleware
            this.applyMiddleware();

            // Apply routes
            this.applyRoutes();

            // Apply error handling
            this.applyErrorHandling();

            Logger.info('Server initialization completed');
        } catch (error) {
            Logger.error('SERVER_INIT', error);
            throw error;
        }
    }

    /**
     * Create required directories
     */
    createRequiredDirectories() {
        const directories = [
            path.join(__dirname, 'logs'),
            path.join(__dirname, 'public', 'uploads'),
            path.join(__dirname, 'tmp'),
            path.join(__dirname, 'database', 'backups')
        ];

        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                Logger.debug(`Created directory: ${dir}`);
            }
        });

        Logger.info('Required directories created');
    }

    /**
     * Apply all middleware
     */
    applyMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            },
            crossOriginEmbedderPolicy: false
        }));

        // CORS configuration
        this.app.use(cors(serverConfig.getCorsConfig()));

        // Rate limiting
        const limiter = rateLimit(serverConfig.getRateLimitConfig());
        this.app.use(limiter);

        // Compression
        this.app.use(compression());

        // Body parsing middleware with increased limits for biometric data
        this.app.use(express.json({ 
            limit: serverConfig.upload.maxSize,
            verify: (req, res, buf) => {
                req.rawBody = buf;
            }
        }));
        
        this.app.use(express.urlencoded({ 
            extended: true, 
            limit: serverConfig.upload.maxSize 
        }));

        // Static files
        this.app.use(express.static('public', {
            maxAge: serverConfig.isProduction() ? '1d' : '0'
        }));

        // Logging middleware
        if (serverConfig.isDevelopment()) {
            this.app.use(morgan('dev'));
        } else {
            this.app.use(morgan('combined', {
                stream: { write: message => Logger.info('HTTP_REQUEST', { message: message.trim() }) }
            }));
        }

        // Custom request logger
        this.app.use(requestLogger);

        // Database connection middleware
        this.app.use(this.databaseMiddleware.bind(this));

        // Add server start time to all requests
        this.app.use((req, res, next) => {
            req.serverStartTime = this.startTime;
            next();
        });

        Logger.info('All middleware applied successfully');
    }

    /**
     * Database connection middleware
     */
    async databaseMiddleware(req, res, next) {
        try {
            // Skip database for health checks
            if (req.path === '/health' || req.path === '/health/db') {
                return next();
            }

            // Ensure database connection
            if (!mongodbConnection.isConnected) {
                await mongodbConnection.connect();
            }

            // Add database models to request context
            req.db = {
                User,
                BiometricHash,
                NFTRecord,
                connection: mongodbConnection
            };

            next();
        } catch (error) {
            Logger.error('DATABASE_MIDDLEWARE', error, {
                path: req.path,
                method: req.method
            });
            
            res.status(503).json({
                success: false,
                error: 'Database temporarily unavailable',
                message: 'Please try again shortly',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Apply all routes
     */
    applyRoutes() {
        // Health check endpoints
        this.app.get('/health', async (req, res) => {
            try {
                const dbHealth = await mongodbConnection.healthCheck();
                const web3Health = await web3Service.getConnectionStatus();
                
                res.status(200).json({
                    status: 'OK',
                    timestamp: new Date().toISOString(),
                    environment: serverConfig.server.nodeEnv,
                    version: serverConfig.api.version,
                    uptime: process.uptime(),
                    services: {
                        database: dbHealth,
                        blockchain: web3Health
                    },
                    memory: {
                        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
                        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
                    }
                });
            } catch (error) {
                res.status(503).json({
                    status: 'ERROR',
                    timestamp: new Date().toISOString(),
                    error: error.message
                });
            }
        });

        this.app.get('/health/db', async (req, res) => {
            try {
                const health = await mongodbConnection.healthCheck();
                res.json({
                    success: true,
                    database: health,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(503).json({
                    success: false,
                    error: 'Database health check failed',
                    message: error.message
                });
            }
        });

        // API status endpoint
        this.app.get('/api/status', (req, res) => {
            res.json({
                success: true,
                message: 'NeuroCredit API is running',
                version: serverConfig.api.version,
                environment: serverConfig.server.nodeEnv,
                timestamp: new Date().toISOString(),
                endpoints: {
                    auth: `/api/${serverConfig.api.version}/auth`,
                    biometric: `/api/${serverConfig.api.version}/biometric`,
                    nft: `/api/${serverConfig.api.version}/nft`,
                    user: `/api/${serverConfig.api.version}/user`,
                    dao: `/api/${serverConfig.api.version}/dao`
                }
            });
        });

        // API routes with versioning
        this.app.use(`/api/${serverConfig.api.version}/auth`, authRoutes);
        this.app.use(`/api/${serverConfig.api.version}/biometric`, biometricRoutes);
        this.app.use(`/api/${serverConfig.api.version}/nft`, nftRoutes);
        this.app.use(`/api/${serverConfig.api.version}/user`, userRoutes);
        this.app.use(`/api/${serverConfig.api.version}/dao`, daoRoutes);

        // API documentation route
        if (serverConfig.isDevelopment()) {
            this.setupDevelopmentRoutes();
        }

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                message: '🚀 Welcome to NeuroCredit Backend API',
                version: serverConfig.api.version,
                environment: serverConfig.server.nodeEnv,
                timestamp: new Date().toISOString(),
                documentation: 'https://docs.neurocredit.io',
                health: '/health',
                status: '/api/status',
                serverStartTime: this.startTime
            });
        });

        // 404 handler for API routes
        this.app.use(`/api/${serverConfig.api.version}/*`, (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                message: `API endpoint ${req.originalUrl} not found`,
                availableEndpoints: [
                    `/api/${serverConfig.api.version}/auth`,
                    `/api/${serverConfig.api.version}/biometric`,
                    `/api/${serverConfig.api.version}/nft`,
                    `/api/${serverConfig.api.version}/user`,
                    `/api/${serverConfig.api.version}/dao`
                ]
            });
        });

        // 404 handler for all other routes
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Route not found',
                message: `Route ${req.originalUrl} not found`,
                timestamp: new Date().toISOString()
            });
        });

        Logger.info('All routes applied successfully');
    }

    /**
     * Setup development-only routes
     */
    setupDevelopmentRoutes() {
        // Development info endpoint
        this.app.get('/dev/info', (req, res) => {
            res.json({
                environment: 'development',
                serverConfig: {
                    port: serverConfig.server.port,
                    host: serverConfig.server.host,
                    nodeEnv: serverConfig.server.nodeEnv
                },
                database: {
                    connected: mongodbConnection.isConnected,
                    status: mongodbConnection.getStatus()
                },
                services: {
                    web3: web3Service.isInitialized()
                },
                memory: process.memoryUsage(),
                uptime: process.uptime()
            });
        });

        // Database sample data endpoint
        this.app.post('/dev/seed', async (req, res) => {
            try {
                const { DatabaseSeeder } = require('./database/seeds/databaseSeeder');
                const seeder = new DatabaseSeeder();
                await seeder.seed();
                
                res.json({
                    success: true,
                    message: 'Sample data seeded successfully',
                    data: seeder.getSampleData()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Seeding failed',
                    message: error.message
                });
            }
        });

        Logger.info('Development routes enabled');
    }

    /**
     * Apply error handling middleware
     */
    applyErrorHandling() {
        // Global error handler
        this.app.use(errorHandler);

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            Logger.error('UNHANDLED_REJECTION', new Error(reason), {
                promise: promise.toString(),
                reason: reason?.message || reason
            });
            
            if (serverConfig.isProduction()) {
                process.exit(1);
            }
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            Logger.error('UNCAUGHT_EXCEPTION', error);
            if (serverConfig.isProduction()) {
                process.exit(1);
            }
        });

        Logger.info('Error handling middleware applied');
    }

    /**
     * Initialize external services
     */
    async initializeServices() {
        try {
            Logger.logStartup('database', 'started');
            
            // Initialize database connection
            await initializeDatabase();
            Logger.logStartup('database', 'success');

            // Initialize Web3 service
            Logger.logStartup('web3', 'started');
            await web3Service.connect();
            Logger.logStartup('web3', 'success');

            // Test hashing service
            Logger.logStartup('hashing', 'started');
            await this.testHashingService();
            Logger.logStartup('hashing', 'success');

            // Run initial health check
            await this.runInitialHealthCheck();

            Logger.info('All services initialized successfully');
        } catch (error) {
            Logger.error('SERVICE_INITIALIZATION', error);
            throw error;
        }
    }

    /**
     * Test hashing service functionality
     */
    async testHashingService() {
        try {
            // Test password hashing
            const testPassword = 'TestPassword123!';
            const hash = await hashingService.hashPassword(testPassword);
            const isValid = await hashingService.verifyPassword(testPassword, hash);
            
            if (!isValid) {
                throw new Error('Hashing service test failed');
            }

            // Test JWT generation
            const payload = { test: true };
            const token = hashingService.generateAuthTokens(payload);
            
            if (!token.accessToken) {
                throw new Error('JWT generation test failed');
            }

            Logger.debug('Hashing service tests passed');
        } catch (error) {
            throw new Error(`Hashing service test failed: ${error.message}`);
        }
    }

    /**
     * Run initial health check
     */
    async runInitialHealthCheck() {
        try {
            const dbHealth = await mongodbConnection.healthCheck();
            const web3Health = await web3Service.getConnectionStatus();

            if (dbHealth.healthy && web3Health.connected) {
                Logger.info('Initial health check passed', {
                    database: dbHealth,
                    blockchain: web3Health
                });
            } else {
                Logger.warn('Initial health check has warnings', {
                    database: dbHealth,
                    blockchain: web3Health
                });
            }
        } catch (error) {
            Logger.error('INITIAL_HEALTH_CHECK', error);
        }
    }

    /**
     * Start the server
     */
    async start() {
        try {
            Logger.info('🚀 Starting NeuroCredit Server...', {
                environment: serverConfig.server.nodeEnv,
                version: serverConfig.api.version,
                port: serverConfig.server.port
            });

            // Initialize services
            await this.initializeServices();

            const port = serverConfig.server.port;
            const host = serverConfig.server.host;

            // Start server
            this.server = this.app.listen(port, host, () => {
                Logger.info('✅ Server started successfully', {
                    host,
                    port,
                    environment: serverConfig.server.nodeEnv,
                    version: serverConfig.api.version,
                    pid: process.pid
                });

                // Console output for better visibility
                console.log('\n🎉 NeuroCredit Server Started Successfully!');
                console.log('============================================');
                console.log(`📍 Server URL: http://${host}:${port}`);
                console.log(`🌍 Environment: ${serverConfig.server.nodeEnv}`);
                console.log(`📚 API Version: ${serverConfig.api.version}`);
                console.log(`🔄 Health Check: http://${host}:${port}/health`);
                console.log(`📊 API Status: http://${host}:${port}/api/status`);
                
                if (serverConfig.isDevelopment()) {
                    console.log(`🔧 Dev Info: http://${host}:${port}/dev/info`);
                }

                console.log('\n🔗 Available API Endpoints:');
                console.log(`   🔐 Auth: http://${host}:${port}/api/${serverConfig.api.version}/auth`);
                console.log(`   👤 Biometric: http://${host}:${port}/api/${serverConfig.api.version}/biometric`);
                console.log(`   🎨 NFT: http://${host}:${port}/api/${serverConfig.api.version}/nft`);
                console.log(`   👥 User: http://${host}:${port}/api/${serverConfig.api.version}/user`);
                console.log(`   🏛️  DAO: http://${host}:${port}/api/${serverConfig.api.version}/dao`);
                console.log('\n⚡ Server is ready to accept requests!');
                console.log('============================================\n');
            });

            // Handle server errors
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    Logger.error(`Port ${port} is already in use`);
                    console.error(`❌ Error: Port ${port} is already in use.`);
                    console.error('💡 Solution: Use a different port or stop the process using this port.');
                    process.exit(1);
                } else {
                    Logger.error('SERVER_START_ERROR', error);
                    throw error;
                }
            });

            // Setup graceful shutdown
            this.setupGracefulShutdown();

            return this.server;
        } catch (error) {
            Logger.error('SERVER_START_FAILED', error);
            console.error('❌ Failed to start server:', error.message);
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

            Logger.logShutdown(signal, { pid: process.pid });
            console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

            // Close HTTP server
            if (this.server) {
                this.server.close((err) => {
                    if (err) {
                        Logger.error('SERVER_SHUTDOWN_ERROR', err);
                    } else {
                        Logger.info('HTTP server closed gracefully');
                    }
                });
            }

            // Close database connection
            try {
                await closeDatabase();
                Logger.info('Database connection closed gracefully');
            } catch (error) {
                Logger.error('DATABASE_SHUTDOWN_ERROR', error);
            }

            // Close log stream
            Logger.close();

            Logger.logShutdown('completed', { signal });
            console.log('✅ Graceful shutdown completed');
            process.exit(0);
        };

        // Handle different shutdown signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
    }

    /**
     * Stop the server
     */
    async stop() {
        try {
            if (this.server) {
                this.server.close();
                await closeDatabase();
                Logger.info('Server stopped successfully');
            }
        } catch (error) {
            Logger.error('SERVER_STOP_ERROR', error);
            throw error;
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
            environment: serverConfig.server.nodeEnv,
            port: serverConfig.server.port,
            uptime: process.uptime(),
            startTime: this.startTime,
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
            },
            database: {
                connected: mongodbConnection.isConnected,
                status: mongodbConnection.getStatus()
            }
        };
    }
}

// Create server instance
const server = new NeuroCreditServer();

// Export for testing and programmatic use
module.exports = {
    NeuroCreditServer,
    serverInstance: server,
    start: () => server.start(),
    stop: () => server.stop(),
    getApp: () => server.getApp(),
    getStatus: () => server.getStatus()
};

// Start server if this file is run directly
if (require.main === module) {
    server.start().catch(error => {
        console.error('❌ Failed to start application:', error.message);
        process.exit(1);
    });
}