require('dotenv').config({ path: '.env.backend' });

console.log('🔧 Validating NeuroCredit Environment Variables...\n');

const requiredVars = [
  'NODE_ENV', 'PORT', 'MONGODB_URI',
  'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET',
  'WEB3_PROVIDER_URL'
];

let allValid = true;

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    console.log(`❌ Missing: ${varName}`);
    allValid = false;
  } else {
    console.log(`✅ ${varName}=${varName.includes('SECRET') ? '***' : process.env[varName]}`);
  }
});

console.log('\n📊 Configuration Summary:');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Database: ${process.env.MONGODB_URI ? 'Configured' : 'Missing'}`);
console.log(`Blockchain: ${process.env.WEB3_PROVIDER_URL ? 'Configured' : 'Missing'}`);

if (allValid) {
  console.log('\n🎉 All required environment variables are set!');
} else {
  console.log('\n⚠️  Please fix the missing environment variables.');
  process.exit(1);
}