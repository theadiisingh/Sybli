require('dotenv').config({ path: '.env.backend' });

console.log('🔧 Environment Variables Check:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_ACCESS_SECRET:', process.env.JWT_ACCESS_SECRET ? '✅ Set' : '❌ Missing');
console.log('MONGODB_URI:', process.env.MONGODB_URI);

// Test database connection
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connection successful'))
    .catch(err => console.log('❌ MongoDB connection failed:', err.message));