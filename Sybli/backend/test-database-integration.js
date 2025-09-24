/**
 * Database Integration Test
 */

require('dotenv').config({ path: '.env.backend' });
const { 
    initializeDatabase, 
    closeDatabase, 
    healthCheck,
    User,
    BiometricHash 
} = require('./database');

async function testDatabaseIntegration() {
    try {
        console.log('🧪 Testing Database Integration...\n');

        // Test database connection
        console.log('1. Testing database connection...');
        await initializeDatabase();
        console.log('✅ Database connected successfully');

        // Test health check
        console.log('2. Testing health check...');
        const health = await healthCheck();
        console.log('✅ Health check:', health.healthy);

        // Test User model
        console.log('3. Testing User model...');
        const testUser = new User({
            walletAddress: '0xtest1234567890abcdef1234567890abcdef123456',
            username: 'testuser'
        });
        await testUser.save();
        console.log('✅ User creation test passed');

        // Test BiometricHash model
        console.log('4. Testing BiometricHash model...');
        const testBiometric = new BiometricHash({
            userId: testUser._id,
            hash: '$2b$12$testhash1234567890abcdefghijkl',
            patternType: 'facial',
            qualityScore: 0.9
        });
        await testBiometric.save();
        console.log('✅ BiometricHash creation test passed');

        // Test queries
        console.log('5. Testing queries...');
        const foundUser = await User.findByWalletAddress('0xtest1234567890abcdef1234567890abcdef123456');
        console.log('✅ User query test passed:', !!foundUser);

        // Cleanup test data
        await BiometricHash.deleteMany({ userId: testUser._id });
        await User.deleteMany({ walletAddress: '0xtest1234567890abcdef1234567890abcdef123456' });
        console.log('✅ Test data cleanup completed');

        console.log('\n🎉 All database tests passed!');

    } catch (error) {
        console.error('❌ Database test failed:', error.message);
    } finally {
        await closeDatabase();
    }
}

testDatabaseIntegration();