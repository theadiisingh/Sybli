/**
 * MongoDB Connection Manager
 */

const mongoose = require('mongoose');
const config = require('../config');
const { logDatabaseEvent } = require('../../src/utils/logger');

class MongoDBConnection {
    constructor() {
        this.connection = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 5;
    }

    /**
     * Connect to MongoDB
     */
    async connect() {
        try {
            if (this.isConnected) {
                return this.connection;
            }

            logDatabaseEvent('database_connection_attempt', { 
                attempt: this.connectionAttempts + 1 
            });

            // Close existing connection if exists
            if (this.connection) {
                await mongoose.disconnect();
            }

            // Set mongoose options
            mongoose.set('strictQuery', false);

            // Connect to MongoDB
            this.connection = await mongoose.connect(config.url, config.options);
            
            this.isConnected = true;
            this.connectionAttempts = 0;

            logDatabaseEvent('database_connected', {
                database: this.connection.connection.name,
                host: this.connection.connection.host,
                port: this.connection.connection.port
            });

            // Set up event listeners
            this.setupEventListeners();

            return this.connection;
        } catch (error) {
            this.connectionAttempts++;
            logDatabaseEvent('database_connection_error', { 
                error: error.message,
                attempt: this.connectionAttempts
            });

            if (this.connectionAttempts >= this.maxConnectionAttempts) {
                throw new Error(`Failed to connect to database after ${this.maxConnectionAttempts} attempts`);
            }

            // Retry after delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            return this.connect();
        }
    }

    /**
     * Setup database event listeners
     */
    setupEventListeners() {
        mongoose.connection.on('connected', () => {
            logDatabaseEvent('database_connected');
        });

        mongoose.connection.on('error', (error) => {
            logDatabaseEvent('database_error', { error: error.message });
        });

        mongoose.connection.on('disconnected', () => {
            this.isConnected = false;
            logDatabaseEvent('database_disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            this.isConnected = true;
            logDatabaseEvent('database_reconnected');
        });

        // Close connection on app termination
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    /**
     * Disconnect from MongoDB
     */
    async disconnect() {
        try {
            if (this.isConnected) {
                await mongoose.disconnect();
                this.isConnected = false;
                this.connection = null;
                logDatabaseEvent('database_disconnected_cleanup');
            }
        } catch (error) {
            logDatabaseEvent('database_disconnect_error', { error: error.message });
        }
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            database: this.connection?.connection?.name,
            host: this.connection?.connection?.host,
            readyState: mongoose.connection.readyState
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { healthy: false, error: 'Not connected to database' };
            }

            // Simple query to check database responsiveness
            await mongoose.connection.db.admin().ping();
            return { healthy: true, timestamp: new Date() };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }
}

// Create singleton instance
const mongoDBConnection = new MongoDBConnection();

module.exports = mongoDBConnection;