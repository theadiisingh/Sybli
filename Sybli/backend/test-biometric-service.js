require('dotenv').config({ path: '.env.backend' });
const biometricService = require('./src/services/biometricService');

console.log('🧪 Testing Biometric Services...');

async function testBiometricService() {
    try {
        // Test facial pattern extraction (simulated)
        const videoData = { frames: 30, resolution: '1080p' };
        const result = await biometricService.extractFacialPattern(videoData);
        console.log('✅ Facial pattern extraction working');
        console.log('✅ Pattern quality:', result.quality);
        
        // Test behavioral pattern extraction
        const behavioralData = {
            mouseMovements: [{x: 100, y: 200}, {x: 150, y: 250}],
            typingData: { speed: 45, accuracy: 0.95 }
        };
        const behavioralResult = await biometricService.extractBehavioralPattern(behavioralData);
        console.log('✅ Behavioral pattern extraction working');
        
        // Test pattern hashing
        const testPattern = { landmarks: [], features: [] };
        const hash = await biometricService.hashBiometricPattern(testPattern);
        console.log('✅ Biometric pattern hashing working');
        
        // Test pattern comparison
        const isMatch = await biometricService.compareBiometricPatterns(testPattern, hash);
        console.log('✅ Pattern comparison working:', isMatch);
        
        console.log('🎉 Biometric services test completed!');
    } catch (error) {
        console.error('❌ Biometric test failed:', error.message);
    }
}

testBiometricService();