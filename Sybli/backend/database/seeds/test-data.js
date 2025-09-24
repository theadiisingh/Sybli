/**
 * Test Data Seed
 * Creates comprehensive test data for development and testing environments
 */

exports.seed = async function(knex) {
  // Check if we're in a test environment
  const isTestEnv = process.env.NODE_ENV === 'test';
  
  if (!isTestEnv) {
    console.log('🛑 Test data seed should only run in test environment');
    return;
  }

  console.log('🌱 Seeding test data...');

  // Clean all tables
  const tables = [
    'votes',
    'dao_proposals',
    'humanity_nfts',
    'biometric_hashes',
    'dao_members',
    'daos',
    'users'
  ];

  for (const table of tables) {
    await knex(table).del();
  }

  // Create test users
  const testUsers = await knex('users').insert([
    {
      wallet_address: '0xtestuser111111111111111111111111111111111111',
      email: 'test.user1@example.com',
      username: 'test_user_1',
      display_name: 'Test User One',
      bio: 'Test user for automated testing',
      status: 'active',
      is_verified: true,
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      wallet_address: '0xtestuser222222222222222222222222222222222222',
      email: 'test.user2@example.com',
      username: 'test_user_2',
      display_name: 'Test User Two',
      bio: 'Another test user for automated testing',
      status: 'active',
      is_verified: true,
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      wallet_address: '0xtestuser333333333333333333333333333333333333',
      email: 'test.user3@example.com',
      username: 'test_user_3',
      display_name: 'Test User Three',
      bio: 'Third test user for edge case testing',
      status: 'inactive',
      is_verified: false,
      email_verified: false,