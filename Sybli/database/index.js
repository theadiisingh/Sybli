/**
 * Database Module Entry Point
 */

const mongodbConnection = require('./connections/mongodb');
const IndexManager = require('./indexes/indexManager');
const DatabaseSeeder = require('./seeds/databaseSeeder');

// Export models
const User = require('./models/User');
const BiometricHash = require('./models/BiometricHash');
const NFTRecord = require('./models/NFTRecord');

module.exports = {
    // Connections
    mongodbConnection,
    
    // Management
    IndexManager,
    DatabaseSeeder,
    
    // Models
    User,
    BiometricHash,
    NFTRecord,
    
    // Utility functions
    async initializeDatabase() {
        try {
            // Connect to database
            await mongodbConnection.connect();
            
            // Create indexes
            await IndexManager.createIndexes();
            
            // Seed sample data if in development
            if (process.env.NODE_ENV === 'development' && process.env.SEED_DATABASE === 'true') {
                await DatabaseSeeder.seed();
            }
            
            console.log('✅ Database initialization completed');
            return true;
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            throw error;
        }
    },
    
    async closeDatabase() {
        await mongodbConnection.disconnect();
    },
    
    async healthCheck() {
        return await mongodbConnection.healthCheck();
    }
};