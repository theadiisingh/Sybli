// backend/database/schemas/index.js
const mongoose = require('mongoose');

// Import all schemas
const UserSchema = require('./UserSchema');
const BiometricHashSchema = require('./BiometricHashSchema');
const NFTSchema = require('./NFTSchema');
const DAOSchema = require('./DAOSchema');

// Create and export models
const User = mongoose.model('User', UserSchema);
const BiometricHash = mongoose.model('BiometricHash', BiometricHashSchema);
const NFT = mongoose.model('NFT', NFTSchema);
const DAOProposal = mongoose.model('DAOProposal', DAOSchema);

// Export schemas for potential use in subdocuments or validation
const schemas = {
    UserSchema,
    BiometricHashSchema,
    NFTSchema,
    DAOSchema
};

// Export models
const models = {
    User,
    BiometricHash,
    NFT,
    DAOProposal
};

// Utility function to create all indexes
const createIndexes = async () => {
    try {
        await User.createIndexes();
        await BiometricHash.createIndexes();
        await NFT.createIndexes();
        await DAOProposal.createIndexes();
        console.log('✅ All database indexes created successfully');
    } catch (error) {
        console.error('❌ Error creating indexes:', error);
        throw error;
    }
};

// Utility function to drop all collections (for testing)
const dropDatabase = async () => {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('Dropping database only allowed in test environment');
    }
    
    try {
        await User.deleteMany({});
        await BiometricHash.deleteMany({});
        await NFT.deleteMany({});
        await DAOProposal.deleteMany({});
        console.log('✅ Test database cleared');
    } catch (error) {
        console.error('❌ Error clearing test database:', error);
        throw error;
    }
};

// Export everything
module.exports = {
    ...models,
    schemas,
    models,
    createIndexes,
    dropDatabase
};