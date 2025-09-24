module.exports = {
    async up(db) {
        await db.createCollection('users');
        await db.collection('users').createIndex({ walletAddress: 1 }, { unique: true });
        await db.collection('users').createIndex({ nonceExpiresAt: 1 });
    },

    async down(db) {
        await db.collection('users').drop();
    }
};
