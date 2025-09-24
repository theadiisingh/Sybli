const mongoose = require('mongoose');
const User = require('../models/User');

const demoUsers = [
    {
        walletAddress: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
        isVerified: true,
        authMethod: 'wallet',
        loginCount: 5,
        createdAt: new Date('2023-01-01')
    },
    {
        walletAddress: '0x742d35cc6634c0532925a3b844bc454e4438f44f',
        isVerified: false,
        authMethod: 'biometric',
        loginCount: 2,
        createdAt: new Date('2023-02-01')
    }
];

async function seedDemoUsers() {
    try {
        await User.insertMany(demoUsers);
        console.log('Demo users seeded successfully');
    } catch (error) {
        console.error('Error seeding demo users:', error);
    }
}

module.exports = seedDemoUsers;
