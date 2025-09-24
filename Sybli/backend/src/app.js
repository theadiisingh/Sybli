/**
 * Express Application Setup
 * Main application configuration and middleware setup
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');

// Import configurations
const serverConfig = require('./config/server');
const databaseConfig = require('./config/database');

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const routes = require('./routes');

// Import services
const web3Service = require('./services/web3Service');

class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.initializeServices();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet(serverConfig.security.helmet));

    // CORS configuration
    this.app.use(cors(serverConfig.cors));

    // Rate limiting
    const limiter = rateLimit(serverConfig.rateLimit);
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Session configuration
    this.app.use(session(serverConfig.session));

    // Static files
    this.app.use(express.static('public'));
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: serverConfig.env
      });
    });

    // API routes
    this.app.use('/api', routes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use(errorHandler);
  }

  async initializeServices() {
    try {
      // Initialize Web3 service
      await web3Service.connect();
      console.log('Web3 service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
  }

  start() {
    const port = serverConfig.port;
    const host = serverConfig.host;

    this.app.listen(port, host, () => {
      console.log(`Server running on ${host}:${port}`);
      console.log(`Environment: ${serverConfig.env}`);
      console.log(`Health check: http://${host}:${port}/health`);
    });
  }
}

module.exports = new App();
