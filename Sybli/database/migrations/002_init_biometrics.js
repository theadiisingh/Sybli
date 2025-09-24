module.exports = {
    async up(db) {
        await db.createCollection('biometrichashes');
        await db.collection('biometrichashes').createIndex({ userId: 1 }, { unique: true });
        await db.collection('biometrichashes').createIndex({ isActive: 1 });
    },

    async down(db) {
        await db.collection('biometrichashes').drop();
    }
};
