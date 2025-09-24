/**
 * Database Seeder for Sample Data
 */

require('dotenv').config({ path: '.env.backend' });
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const BiometricHash = require('../models/BiometricHash');

class DatabaseSeeder {
    constructor() {
        this.sampleData = {
            users: [],
            biometricHashes: []
        };
    }

    /**
     * Seed database with sample data
     */
    async seed() {
        try {
            console.log('🌱 Seeding database with sample data...');
            
            // Connect to database
            await mongoose.connect(config.url, config.options);
            
            // Clear existing data
            await this.clearDatabase();
            
            // Create sample users
            await this.createSampleUsers();
            
            // Create sample biometric data
            await this.createSampleBiometricData();
            
            console.log('✅ Database seeding completed successfully');
        } catch (error) {
            console.error('❌ Database seeding failed:', error.message);
            throw error;
        } finally {
            await mongoose.disconnect();
        }
    }

    /**
     * Clear existing data
     */
    async clearDatabase() {
        try {
            await User.deleteMany({});
            await BiometricHash.deleteMany({});
            console.log('✅ Database cleared');
        } catch (error) {
            throw new Error(`Database clearance failed: ${error.message}`);
        }
    }

    /**
     * Create sample users
     */
    async createSampleUsers() {
        const sampleUsers = [
            {
                walletAddress: '0x742e4d6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c',
                hasBiometric: true,
                isVerified: true,
                biometricTypes: ['facial', 'behavioral'],
                verificationScore: 95,
                loginCount: 10,
                username: 'neurouser1'
            },
            {
                walletAddress: '0x853f5d7c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c',
                hasBiometric: false,
                isVerified: false,
                verificationScore: 0,
                loginCount: 2,
                username: 'neurouser2'
            }
        ];

        try {
            this.sampleData.users = await User.insertMany(sampleUsers);
            console.log(`✅ Created ${this.sampleData.users.length} sample users`);
        } catch (error) {
            throw new Error(`User creation failed: ${error.message}`);
        }
    }

    /**
     * Create sample biometric data
     */
    async createSampleBiometricData() {
        if (this.sampleData.users.length === 0) {
            console.log('⚠️  No users found for biometric data');
            return;
        }

        const user = this.sampleData.users[0]; // Use first user
        const sampleBiometricData = [
            {
                userId: user._id,
                hash: '$2b$12$examplehashforfacialpattern12345',
                patternType: 'facial',
                qualityScore: 0.95,
                fingerprint: { featureCount: 156, complexity: 0.87 },
                metadata: {
                    patternSize: 2048,
                    features: 156,
                    complexity: 0.87,
                    algorithmVersion: '1.0'
                },
                verificationCount: 15,
                successfulVerifications: 14
            },
            {
                userId: user._id,
                hash: '$2b$12$examplehashforbehavioralpattern67890',
                patternType: 'behavioral',
                qualityScore: 0.88,
                fingerprint: { featureCount: 89, complexity: 0.76 },
                metadata: {
                    patternSize: 1024,
                    features: 89,
                    complexity: 0.76,
                    algorithmVersion: '1.0'
                },
                verificationCount: 8,
                successfulVerifications: 7
            }
        ];

        try {
            this.sampleData.biometricHashes = await BiometricHash.insertMany(sampleBiometricData);
            console.log(`✅ Created ${this.sampleData.biometricHashes.length} sample biometric records`);
        } catch (error) {
            throw new Error(`Biometric data creation failed: ${error.message}`);
        }
    }

    /**
     * Get sample data for testing
     */
    getSampleData() {
        return this.sampleData;
    }
}

module.exports = new DatabaseSeeder();

// Run seeder if called directly
if (require.main === module) {
    const seeder = new DatabaseSeeder();
    seeder.seed().catch(console.error);
}