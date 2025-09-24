// backend/scripts/start.js
require('dotenv').config();
const server = require('../server');

// Handle uncaught exceptions before server starts
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception during startup:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection during startup at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
server.start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});