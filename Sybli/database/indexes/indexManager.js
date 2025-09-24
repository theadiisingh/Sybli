/**
 * Database Index Manager
 */

const mongoose = require('mongoose');

class IndexManager {
    /**
     * Create all required indexes
     */
    async createIndexes() {
        try {
            console.log('🔧 Creating database indexes...');
            
            // User indexes
            await mongoose.model('User').createIndexes();
            
            // BiometricHash indexes
            await mongoose.model('BiometricHash').createIndexes();
            
            // NFTRecord indexes
            await mongoose.model('NFTRecord').createIndexes();
            
            console.log('✅ Database indexes created successfully');
        } catch (error) {
            console.error('❌ Index creation failed:', error.message);
            throw error;
        }
    }

    /**
     * Get index information
     */
    async getIndexInfo() {
        try {
            const collections = ['users', 'biometrichashes', 'nftrecords'];
            const indexInfo = {};
            
            for (const collection of collections) {
                const indexes = await mongoose.connection.db.collection(collection).indexes();
                indexInfo[collection] = indexes.map(idx => ({
                    name: idx.name,
                    fields: idx.key,
                    unique: idx.unique || false
                }));
            }
            
            return indexInfo;
        } catch (error) {
            throw new Error(`Index info retrieval failed: ${error.message}`);
        }
    }
}

module.exports = new IndexManager();