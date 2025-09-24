/**
 * Server Entry Point
 * Main server file that starts the application
 */

require('dotenv').config({ path: '.env.backend' });
const app = require('./src/app');

// Start the server
app.start();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
