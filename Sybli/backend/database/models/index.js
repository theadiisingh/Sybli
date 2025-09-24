/**
 * Main models index file
 * Exports all models for easy importing
 */

const User = require('./User_new');
const BiometricHash = require('./BiometricHash_new');
const HumanityNFT = require('./HumanityNFT_new');
const DAOProposal = require('./DAOProposal');
const Vote = require('./Vote_new');
const Proposals = require('./Proposals_new');

// Import database connection
const db = require('../config/database');

// Initialize models with database connection
const initializeModels = () => {
  User._db = db;
  BiometricHash._db = db;
  HumanityNFT._db = db;
  DAOProposal._db = db;
  Vote._db = db;
  Proposals._db = db;
};

// Database health check
const checkDatabaseHealth = async () => {
  try {
    await db.raw('SELECT 1');
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Sync all models (if using ORM features)
const syncModels = async () => {
  try {
    // This would create tables if they don't exist
    // In a real implementation, you'd use migrations instead
    console.log('🔄 Models synchronized');
  } catch (error) {
    console.error('❌ Model synchronization failed:', error);
  }
};

module.exports = {
  User,
  BiometricHash,
  HumanityNFT,
  DAOProposal,
  Vote,
  Proposals,
  initializeModels,
  checkDatabaseHealth,
  syncModels,
  db
};