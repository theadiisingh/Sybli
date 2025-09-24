module.exports = {
    async up(db) {
        await db.createCollection('daoproposals');
        await db.collection('daoproposals').createIndex({ proposalId: 1 }, { unique: true });
        await db.collection('daoproposals').createIndex({ proposer: 1 });
        await db.collection('daoproposals').createIndex({ status: 1 });
    },

    async down(db) {
        await db.collection('daoproposals').drop();
    }
};
