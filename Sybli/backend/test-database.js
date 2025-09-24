require('dotenv').config({ path: '.env.backend' });
const mongoose = require('mongoose');

console.log('🧪 Testing Database Connection...');

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connected successfully');
        console.log('✅ Database name:', mongoose.connection.name);
        return mongoose.connection.db.admin().listDatabases();
    })
    .then(dbs => {
        console.log('✅ Available databases:', dbs.databases.map(db => db.name));
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    });