/**
 * Database Configuration
 */

require('dotenv').config({ path: '.env.backend' });

const databaseConfig = {
    development: {
        url: process.env.MONGODB_URI || 'mongodb://localhost:27017/neurocredit_dev',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        }
    },
    production: {
        url: process.env.MONGODB_URI,
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            auth: {
                username: process.env.DB_USER,
                password: process.env.DB_PASSWORD
            },
            replicaSet: process.env.DB_REPLICA_SET
        }
    },
    test: {
        url: process.env.MONGODB_URI || 'mongodb://localhost:27017/neurocredit_test',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        }
    }
};

const environment = process.env.NODE_ENV || 'development';
const config = databaseConfig[environment];

if (!config.url) {
    console.error('❌ Database URL is required');
    process.exit(1);
}

module.exports = config;