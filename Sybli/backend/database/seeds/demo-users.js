/**
 * Demo Users Seed Data
 * Creates sample users for testing and demonstration
 */

const { db } = require('../config/database');
const { User, BiometricHash, HumanityNFT } = require('../models');

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('votes').del();
  await knex('dao_proposals').del();
  await knex('humanity_nfts').del();
  await knex('biometric_hashes').del();
  await knex('dao_members').del();
  await knex('daos').del();
  await knex('users').del();

  // Inserts seed entries
  const users = await knex('users').insert([
    {
      wallet_address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1',
      email: 'alice.fitness@example.com',
      username: 'alice_fitness',
      display_name: 'Alice Johnson',
      bio: 'Fitness enthusiast and yoga instructor. Passionate about decentralized health governance.',
      profile_picture_url: 'https://example.com/profiles/alice.jpg',
      cover_photo_url: 'https://example.com/covers/fitness.jpg',
      social_links: JSON.stringify({
        twitter: 'https://twitter.com/alice_fitness',
        instagram: 'https://instagram.com/alice_yoga',
        website: 'https://alicefitness.com'
      }),
      status: 'active',
      is_verified: true,
      email_verified: true,
      preferences: JSON.stringify({
        theme: 'dark',
        notifications: true,
        language: 'en'
      }),
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      wallet_address: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2',
      email: 'bob.athlete@example.com',
      username: 'bob_strong',
      display_name: 'Bob Smith',
      bio: 'Professional athlete and fitness coach. Building the future of sports governance.',
      profile_picture_url: 'https://example.com/profiles/bob.jpg',
      cover_photo_url: 'https://example.com/covers/athlete.jpg',
      social_links: JSON.stringify({
        twitter: 'https://twitter.com/bob_strong',
        linkedin: 'https://linkedin.com/in/bobsmith'
      }),
      status: 'active',
      is_verified: true,
      email_verified: true,
      preferences: JSON.stringify({
        theme: 'light',
        notifications: true,
        language: 'en'
      }),
      last_login_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      wallet_address: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3',
      email: 'carol.health@example.com',
      username: 'carol_wellness',
      display_name: 'Carol Davis',
      bio: 'Nutritionist and wellness expert. Advocating for community health decisions.',
      profile_picture_url: 'https://example.com/profiles/carol.jpg',
      cover_photo_url: 'https://example.com/covers/wellness.jpg',
      social_links: JSON.stringify({
        instagram: 'https://instagram.com/carol_wellness',
        youtube: 'https://youtube.com/c/carolwellness'
      }),
      status: 'active',
      is_verified: true,
      email_verified: true,
      preferences: JSON.stringify({
        theme: 'dark',
        notifications: false,
        language: 'en'
      }),
      last_login_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      wallet_address: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4',
      email: 'dave.gym@example.com',
      username: 'dave_lifts',
      display_name: 'Dave Wilson',
      bio: 'Gym owner and powerlifting coach. Democratizing fitness facility management.',
      profile_picture_url: 'https://example.com/profiles/dave.jpg',
      cover_photo_url: 'https://example.com/covers/gym.jpg',
      social_links: JSON.stringify({
        twitter: 'https://twitter.com/dave_lifts',
        website: 'https://wilson-gym.com'
      }),
      status: 'active',
      is_verified: false,
      email_verified: true,
      preferences: JSON.stringify({
        theme: 'light',
        notifications: true,
        language: 'en'
      }),
      last_login_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      wallet_address: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5',
      email: 'eve.runner@example.com',
      username: 'eve_marathon',
      display_name: 'Eve Brown',
      bio: 'Marathon runner and endurance coach. Promoting community running events.',
      profile_picture_url: 'https://example.com/profiles/eve.jpg',
      cover_photo_url: 'https://example.com/covers/running.jpg',
      social_links: JSON.stringify({
        strava: 'https://strava.com/athletes/eve_runner',
        instagram: 'https://instagram.com/eve_marathon'
      }),
      status: 'inactive',
      is_verified: true,
      email_verified: false,
      preferences: JSON.stringify({
        theme: 'dark',
        notifications: true,
        language: 'en'
      }),
      last_login_at: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]).returning('*');

  console.log('✅ Demo users created successfully');

  // Create biometric hashes for users
  const biometricHashes = await knex('biometric_hashes').insert([
    {
      user_id: users[0].id,
      biometric_hash: 'a1b2c3d4e5f67890abc123def456ghi789jkl012mno345pqr',
      hash_type: 'composite',
      algorithm: 'sha256',
      salt: 'salt1234567890abc',
      metadata: JSON.stringify({
        device: 'iPhone 13',
        biometric_type: 'face_voice_composite',
        confidence_threshold: 0.95
      }),
      confidence_score: 0.98,
      is_verified: true,
      last_verified_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      user_id: users[1].id,
      biometric_hash: 'b2c3d4e5f67890abc123def456ghi789jkl012mno345pqr678',
      hash_type: 'face',
      algorithm: 'sha256',
      salt: 'salt234567890bcd',
      metadata: JSON.stringify({
        device: 'Android S22',
        biometric_type: 'facial_recognition',
        confidence_threshold: 0.92
      }),
      confidence_score: 0.96,
      is_verified: true,
      last_verified_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      user_id: users[2].id,
      biometric_hash: 'c3d4e5f67890abc123def456ghi789jkl012mno345pqr67890',
      hash_type: 'voice',
      algorithm: 'sha256',
      salt: 'salt34567890cde',
      metadata: JSON.stringify({
        device: 'Web Browser',
        biometric_type: 'voice_print',
        confidence_threshold: 0.88
      }),
      confidence_score: 0.91,
      is_verified: true,
      last_verified_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]).returning('*');

  console.log('✅ Biometric hashes created successfully');

  // Create Humanity NFTs for users
  const humanityNFTs = await knex('humanity_nfts').insert([
    {
      user_id: users[0].id,
      token_id: '1',
      contract_address: '0x1234567890abcdef1234567890abcdef12345678',
      metadata_uri: 'ipfs://QmXYZ1234567890abcdef/alice-nft.json',
      token_standard: 'ERC721',
      mint_transaction_hash: '0xabc123def456ghi789jkl012mno345pqr67890stu123vwx456yz',
      mint_block_number: 12345678,
      is_active: true,
      is_soulbound: true,
      traits: JSON.stringify({
        rarity: 'epic',
        background: 'fitness',
        accessory: 'yoga_mat',
        level: 5
      }),
      rarity_score: 0.87,
      governance_weight: 1.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      user_id: users[1].id,
      token_id: '2',
      contract_address: '0x1234567890abcdef1234567890abcdef12345678',
      metadata_uri: 'ipfs://QmXYZ1234567890abcdef/bob-nft.json',
      token_standard: 'ERC721',
      mint_transaction_hash: '0xdef456ghi789jkl012mno345pqr67890stu123vwx456yzabc',
      mint_block_number: 12345679,
      is_active: true,
      is_soulbound: true,
      traits: JSON.stringify({
        rarity: 'legendary',
        background: 'athletics',
        accessory: 'medal',
        level: 8
      }),
      rarity_score: 0.95,
      governance_weight: 2.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      user_id: users[2].id,
      token_id: '3',
      contract_address: '0x1234567890abcdef1234567890abcdef12345678',
      metadata_uri: 'ipfs://QmXYZ1234567890abcdef/carol-nft.json',
      token_standard: 'ERC721',
      mint_transaction_hash: '0xghi789jkl012mno345pqr67890stu123vwx456yzabcdef',
      mint_block_number: 12345680,
      is_active: true,
      is_soulbound: true,
      traits: JSON.stringify({
        rarity: 'rare',
        background: 'wellness',
        accessory: 'vitamins',
        level: 6
      }),
      rarity_score: 0.78,
      governance_weight: 1.2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      user_id: users[3].id,
      token_id: '4',
      contract_address: '0x1234567890abcdef1234567890abcdef12345678',
      metadata_uri: 'ipfs://QmXYZ1234567890abcdef/dave-nft.json',
      token_standard: 'ERC721',
      mint_transaction_hash: '0xjkl012mno345pqr67890stu123vwx456yzabcdefghi',
      mint_block_number: 12345681,
      is_active: true,
      is_soulbound: true,
      traits: JSON.stringify({
        rarity: 'common',
        background: 'gym',
        accessory: 'dumbbell',
        level: 3
      }),
      rarity_score: 0.65,
      governance_weight: 1.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]).returning('*');

  console.log('✅ Humanity NFTs created successfully');

  return {
    users,
    biometricHashes,
    humanityNFTs
  };
};