require('dotenv').config({ path: '.env.backend' });
const app = require('./src/app');
const http = require('http');

console.log('🧪 Testing Server Startup...');

const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`✅ Server started successfully on port ${PORT}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV}`);
    
    // Test basic middleware
    console.log('✅ Express app loaded successfully');
    
    // Close server after test
    setTimeout(() => {
        server.close(() => {
            console.log('🎉 Server startup test completed!');
            process.exit(0);
        });
    }, 2000);
});

server.on('error', (error) => {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
});