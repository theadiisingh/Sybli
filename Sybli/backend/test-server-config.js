require('dotenv').config({ path: '.env.backend' });
const config = require('./src/config/server');

console.log('🧪 Testing Server Configuration...');

try {
    console.log('✅ Server Port:', config.server.port);
    console.log('✅ Environment:', config.server.nodeEnv);
    console.log('✅ JWT Config:', Object.keys(config.jwt));
    console.log('✅ Database URI:', config.database.uri ? 'Set' : 'Missing');
    
    // Test helper methods
    console.log('✅ Is Development:', config.isDevelopment());
    console.log('✅ Is Production:', config.isProduction());
    
    // Validate configuration
    const issues = config.validate();
    if (issues.length === 0) {
        console.log('✅ Configuration validation passed');
    } else {
        console.log('❌ Configuration issues:', issues);
    }
    
    console.log('🎉 Server configuration test completed!');
} catch (error) {
    console.error('❌ Configuration test failed:', error.message);
}