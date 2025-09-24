const mongoose = require('mongoose');
const DAOProposal = require('../models/DAOProposal');

const demoProposals = [
    {
        proposalId: 'prop-001',
        title: 'Implement Biometric Verification',
        description: 'Add biometric authentication to enhance security',
        proposer: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
        votesFor: 10,
        votesAgainst: 2,
        status: 'approved',
        createdAt: new Date('2023-01-15')
    },
    {
        proposalId: 'prop-002',
        title: 'Upgrade NFT Metadata Standard',
        description: 'Update to latest NFT metadata standards',
        proposer: '0x742d35cc6634c0532925a3b844bc454e4438f44f',
        votesFor: 5,
        votesAgainst: 3,
        status: 'pending',
        createdAt: new Date('2023-03-01')
    }
];

async function seedDemoProposals() {
    try {
        await DAOProposal.insertMany(demoProposals);
        console.log('Demo proposals seeded successfully');
    } catch (error) {
        console.error('Error seeding demo proposals:', error);
    }
}

module.exports = seedDemoProposals;
