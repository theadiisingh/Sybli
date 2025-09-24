const mongoose = require('mongoose');
const config = require('./config');

async function connectDatabase() {
    try {
        await mongoose.connect(config.mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
}

async function disconnectDatabase() {
    try {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Database disconnection error:', error);
    }
}

module.exports = {
    connectDatabase,
    disconnectDatabase
};
