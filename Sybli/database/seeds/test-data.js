const seedDemoUsers = require('./demo-users');
const seedDemoProposals = require('./demo-proposals');

async function seedTestData() {
    console.log('Starting test data seeding...');
    await seedDemoUsers();
    await seedDemoProposals();
    console.log('Test data seeding completed.');
}

module.exports = seedTestData;

// Run if called directly
if (require.main === module) {
    seedTestData().then(() => process.exit(0)).catch(console.error);
}
