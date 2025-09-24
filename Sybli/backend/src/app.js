/**
 * Express Application Setup
 * Main application configuration and middleware setup for NeuroCredit
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const morgan = require('morgan');
const compression = require('compression');

// Import configurations
const serverConfig = require('./config/server');

// Import database
const { 
    initializeDatabase, 
    closeDatabase, 
    healthCheck,
    mongodbConnection 
} = require('../../database');

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const nftRoutes = require('./routes/nftRoutes');
const userRoutes = require('./routes/userRoutes');
const daoRoutes = require('./routes/daoRoutes');

// Import services
const web3Service = require('./services/web3Service');
const { logServerEvent } = require('./utils/logger');

class App {
    constructor() {
        this.app = express();
        this.server = null;
        this.isShuttingDown = false;
    }

    /**
     * Setup all middleware
     */
    setupMiddleware() {
        // Security middleware
        this.app.use(helmet(serverConfig.security.helmet));

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

        // Session configuration
        this.app.use(session(serverConfig.session));

        // Logging middleware
        if (serverConfig.isDevelopment()) {
            this.app.use(morgan('dev'));
        } else {
            this.app.use(morgan('combined', {
                stream: { write: message => logServerEvent('http_request', { message }) }
            }));
        }

        // Custom request logger
        this.app.use(requestLogger);

        // Static files
        this.app.use(express.static('public', {
            maxAge: serverConfig.isProduction() ? '1d' : '0'
        }));

        // Database connection middleware
        this.app.use(this.databaseMiddleware.bind(this));
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

            // Add database connection to request context
            req.db = {
                connection: mongodbConnection,
                models: {
                    User: require('../../database/models/User'),
                    BiometricHash: require('../../database/models/BiometricHash'),
                    NFTRecord: require('../../database/models/NFTRecord')
                }
            };

            next();
        } catch (error) {
            logServerEvent('database_middleware_error', { 
                error: error.message,
                path: req.path 
            });
            
            res.status(503).json({
                success: false,
                error: 'Database temporarily unavailable',
                message: 'Please try again shortly'
            });
        }
    }

    /**
     * Setup all routes
     */
    setupRoutes() {
        // Health check endpoints
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                environment: serverConfig.server.nodeEnv,
                version: serverConfig.api.version,
                uptime: process.uptime()
            });
        });

        this.app.get('/health/db', async (req, res) => {
            try {
                const dbHealth = await healthCheck();
                const web3Health = await web3Service.getConnectionStatus();
                
                res.status(200).json({
                    status: 'OK',
                    timestamp: new Date().toISOString(),
                    database: dbHealth,
                    blockchain: web3Health,
                    memory: {
                        used: process.memoryUsage().heapUsed / 1024 / 1024,
                        total: process.memoryUsage().heapTotal / 1024 / 1024
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

        // API status endpoint
        this.app.get('/api/status', (req, res) => {
            res.json({
                success: true,
                message: 'NeuroCredit API is running',
                version: serverConfig.api.version,
                environment: serverConfig.server.nodeEnv,
                timestamp: new Date().toISOString()
            });
        });

        // API routes with versioning
        this.app.use(`/api/${serverConfig.api.version}/auth`, authRoutes);
        this.app.use(`/api/${serverConfig.api.version}/biometric`, biometricRoutes);
        this.app.use(`/api/${serverConfig.api.version}/nft`, nftRoutes);
        this.app.use(`/api/${serverConfig.api.version}/user`, userRoutes);
        this.app.use(`/api/${serverConfig.api.version}/dao`, daoRoutes);

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

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                message: 'Welcome to NeuroCredit Backend API',
                version: serverConfig.api.version,
                documentation: '/api/docs',
                health: '/health',
                status: '/api/status'
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
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // Catch 404 and forward to error handler
        this.app.use((req, res, next) => {
            const error = new Error(`Route not found: ${req.originalUrl}`);
            error.status = 404;
            next(error);
        });

        // Global error handler
        this.app.use(errorHandler);

        // Process error handlers
        this.app.use((error, req, res, next) => {
            logServerEvent('unhandled_error', {
                error: error.message,
                stack: error.stack,
                url: req.originalUrl,
                method: req.method
            });

            // MongoDB duplicate key error
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    error: 'Duplicate entry',
                    message: 'A record with this information already exists'
                });
            }

            // MongoDB validation error
            if (error.name === 'ValidationError') {
                const errors = Object.values(error.errors).map(err => err.message);
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    message: 'Please check your input data',
                    details: errors
                });
            }

            // JWT errors
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid token',
                    message: 'Please provide a valid authentication token'
                });
            }

            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired',
                    message: 'Please login again'
                });
            }

            // Default error response
            const statusCode = error.status || 500;
            res.status(statusCode).json({
                success: false,
                error: serverConfig.isProduction() && statusCode === 500 ? 
                    'Internal server error' : error.message,
                message: 'An unexpected error occurred',
                ...(serverConfig.isDevelopment() && { stack: error.stack })
            });
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logServerEvent('unhandled_rejection', {
                reason: reason?.message || reason,
                promise: promise.toString()
            });
            
            // In production, you might want to exit the process
            if (serverConfig.isProduction()) {
                console.error('Unhandled Rejection at:', promise, 'reason:', reason);
                process.exit(1);
            }
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logServerEvent('uncaught_exception', {
                error: error.message,
                stack: error.stack
            });
            
            console.error('Uncaught Exception:', error);
            if (serverConfig.isProduction()) {
                process.exit(1);
            }
        });
    }

    /**
     * Initialize services
     */
    async initializeServices() {
        try {
            logServerEvent('service_initialization_start');

            // Initialize database
            await initializeDatabase();
            logServerEvent('database_initialized');

            // Initialize Web3 service
            await web3Service.connect();
            logServerEvent('web3_service_initialized');

            logServerEvent('service_initialization_complete');
        } catch (error) {
            logServerEvent('service_initialization_failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Graceful shutdown handler
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            if (this.isShuttingDown) return;
            
            this.isShuttingDown = true;
            logServerEvent('shutdown_initiated', { signal });

            console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

            // Close HTTP server
            if (this.server) {
                this.server.close((err) => {
                    if (err) {
                        console.error('Error closing server:', err);
                        process.exit(1);
                    }
                });
            }

            // Close database connections
            try {
                await closeDatabase();
                logServerEvent('database_disconnected');
            } catch (error) {
                console.error('Error closing database:', error);
            }

            // Close other services
            try {
                await web3Service.disconnect();
                logServerEvent('web3_service_disconnected');
            } catch (error) {
                console.error('Error disconnecting Web3:', error);
            }

            logServerEvent('shutdown_complete');
            console.log('✅ Graceful shutdown completed');
            process.exit(0);
        };

        // Handle different shutdown signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
    }

    /**
     * Start the application
     */
    async start() {
        try {
            console.log('🚀 Starting NeuroCredit Backend Server...\n');

            // Initialize services
            await this.initializeServices();

            // Setup middleware
            this.setupMiddleware();

            // Setup routes
            this.setupRoutes();

            // Setup error handling
            this.setupErrorHandling();

            // Setup graceful shutdown
            this.setupGracefulShutdown();

            const port = serverConfig.server.port;
            const host = serverConfig.server.host;

            // Start server
            this.server = this.app.listen(port, host, () => {
                console.log('✅ Server started successfully!');
                console.log(`📍 Server running on: http://${host}:${port}`);
                console.log(`🌍 Environment: ${serverConfig.server.nodeEnv}`);
                console.log(`📚 API Version: ${serverConfig.api.version}`);
                console.log(`🔗 Health check: http://${host}:${port}/health`);
                console.log(`📊 DB Health: http://${host}:${port}/health/db`);
                console.log(`🚀 API Status: http://${host}:${port}/api/status`);
                console.log('\n📋 Available Endpoints:');
                console.log(`   🔐 Authentication: /api/${serverConfig.api.version}/auth`);
                console.log(`   👤 Biometric: /api/${serverConfig.api.version}/biometric`);
                console.log(`   🎨 NFT: /api/${serverConfig.api.version}/nft`);
                console.log(`   👥 User: /api/${serverConfig.api.version}/user`);
                console.log(`   🏛️  DAO: /api/${serverConfig.api.version}/dao`);
                console.log('\n⚡ Server is ready to accept requests!');

                logServerEvent('server_started', {
                    host,
                    port,
                    environment: serverConfig.server.nodeEnv
                });
            });

            // Handle server errors
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`❌ Port ${port} is already in use`);
                    process.exit(1);
                } else {
                    logServerEvent('server_error', { error: error.message });
                    throw error;
                }
            });

            return this.server;
        } catch (error) {
            console.error('❌ Failed to start server:', error.message);
            logServerEvent('server_start_failed', { error: error.message });
            process.exit(1);
        }
    }

    /**
     * Stop the application
     */
    async stop() {
        try {
            console.log('🛑 Stopping server...');
            
            if (this.server) {
                this.server.close();
            }
            
            await closeDatabase();
            console.log('✅ Server stopped successfully');
        } catch (error) {
            console.error('Error stopping server:', error);
            throw error;
        }
    }

    /**
     * Get Express app instance for testing
     */
    getApp() {
        return this.app;
    }
}

// Create singleton instance
const app = new App();

// Export for testing and programmatic use
module.exports = {
    App,
    appInstance: app,
    start: () => app.start(),
    stop: () => app.stop(),
    getApp: () => app.getApp()
};

// Start server if this file is run directly
if (require.main === module) {
    app.start().catch(error => {
        console.error('Failed to start application:', error);
        process.exit(1);
    });
}