require('dotenv').config({ path: '.env.backend' });

console.log('🧪 Running Complete Integration Test...\n');

async function runAllTests() {
    const tests = [
        { name: 'Environment Variables', file: 'test-env.js' },
        { name: 'Database Connection', file: 'test-database.js' },
        { name: 'Server Configuration', file: 'test-server-config.js' },
        { name: 'Authentication Services', file: 'test-auth-service.js' },
        { name: 'Biometric Services', file: 'test-biometric-service.js' },
        { name: 'Constants', file: 'test-constants.js' },
        { name: 'Server Startup', file: 'test-server-start.js' }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            console.log(`\n📋 Running ${test.name}...`);
            require(`./${test.file}`);
            console.log(`✅ ${test.name} - PASSED`);
            passed++;
        } catch (error) {
            console.log(`❌ ${test.name} - FAILED:`, error.message);
            failed++;
        }
    }

    console.log('\n📊 TEST SUMMARY:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

    if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Your backend is ready for development.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
}

runAllTests();