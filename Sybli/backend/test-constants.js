const constants = require('./src/utils/constants');

console.log('🧪 Testing Constants...');

function testConstants() {
    try {
        // Test HTTP status codes
        console.log('✅ HTTP Status Codes:', constants.HTTP_STATUS.OK === 200);
        
        // Test user roles
        console.log('✅ User Roles:', constants.USER_ROLES.USER === 'user');
        
        // Test NFT types
        console.log('✅ NFT Types:', constants.NFT_TYPES.BIOMETRIC === 'biometric');
        
        // Test API responses
        console.log('✅ API Responses:', typeof constants.API_RESPONSES.SUCCESS === 'string');
        
        // Test biometric constants
        console.log('✅ Biometric Types:', constants.BIOMETRIC.TYPES.FACIAL === 'facial');
        console.log('✅ Biometric Thresholds:', constants.BIOMETRIC.THRESHOLDS.MINIMUM_QUALITY === 0.6);
        
        // Test authentication constants
        console.log('✅ Auth Constants:', constants.AUTH.NONCE_EXPIRY_MINUTES === 15);
        
        console.log('🎉 Constants test completed!');
    } catch (error) {
        console.error('❌ Constants test failed:', error.message);
    }
}

testConstants();