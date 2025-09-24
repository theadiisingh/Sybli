require('dotenv').config({ path: '.env.backend' });
const hashingService = require('./src/services/hashingService');
const constants = require('./src/utils/constants');

console.log('🧪 Testing Authentication Services...');

async function testHashingService() {
    try {
        // Test password hashing
        const password = 'TestPassword123!';
        const hash = await hashingService.hashPassword(password);
        console.log('✅ Password hashing working');
        
        // Test password verification
        const isValid = await hashingService.verifyPassword(password, hash);
        console.log('✅ Password verification:', isValid);
        
        // Test JWT token generation
        const payload = { userId: 'test123', walletAddress: '0x123...' };
        const tokens = hashingService.generateAuthTokens(payload);
        console.log('✅ JWT token generation working');
        console.log('✅ Access token length:', tokens.accessToken.length);
        
        // Test token verification
        const decoded = hashingService.verifyToken(tokens.accessToken);
        console.log('✅ Token verification working');
        console.log('✅ Decoded payload:', decoded.userId === 'test123');
        
        // Test biometric token generation
        const bioToken = hashingService.generateBiometricToken();
        console.log('✅ Biometric token generation working');
        
        console.log('🎉 Authentication services test completed!');
    } catch (error) {
        console.error('❌ Authentication test failed:', error.message);
    }
}

testHashingService();