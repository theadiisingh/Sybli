/**
 * Migration: 001_init_users
 * Description: Initial migration to create users table
 */

exports.up = function(knex) {
    return knex.schema.createTable('users', function(table) {
        // Primary Key
        table.increments('id').primary();
        
        // Authentication fields
        table.string('wallet_address', 42).unique().notNullable();
        table.string('email', 255).unique();
        table.string('username', 50).unique().notNullable();
        
        // User profile fields
        table.string('display_name', 100);
        table.text('bio');
        table.string('profile_picture_url');
        table.string('cover_photo_url');
        
        // Social links (stored as JSON for flexibility)
        table.json('social_links');
        
        // User status and preferences
        table.enu('status', ['active', 'inactive', 'suspended']).defaultTo('active');
        table.boolean('is_verified').defaultTo(false);
        table.boolean('email_verified').defaultTo(false);
        table.json('preferences');
        
        // Timestamps
        table.timestamp('last_login_at');
        table.timestamps(true, true); // created_at and updated_at
        
        // Indexes for better query performance
        table.index('wallet_address');
        table.index('email');
        table.index('username');
        table.index('status');
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('users');
};

exports.config = { transaction: true };