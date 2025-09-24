/**
 * Migration: 003_init_dao
 * Description: Create DAO-related tables for decentralized governance
 */

exports.up = function(knex) {
    return knex.schema
        // DAOs table
        .createTable('daos', function(table) {
            // Primary Key
            table.increments('id').primary();
            
            // DAO identification
            table.string('name', 100).notNullable();
            table.string('symbol', 10).notNullable();
            table.string('contract_address', 42).unique().notNullable();
            table.string('description', 500);
            
            // DAO configuration
            table.string('governance_token_address', 42);
            table.decimal('proposal_threshold', 18, 8); // Minimum tokens needed to create proposal
            table.decimal('quorum_threshold', 5, 2); // Percentage needed for quorum
            table.integer('voting_period_days').defaultTo(7); // Default 7 days voting period
            table.integer('execution_delay_hours').defaultTo(24); // Delay before execution
            
            // DAO metadata
            table.string('logo_url');
            table.string('website_url');
            table.json('social_links');
            table.json('tags'); // Array of tags/categories
            
            // DAO status
            table.enu('status', ['active', 'paused', 'archived']).defaultTo('active');
            table.boolean('is_public').defaultTo(true);
            
            // Creator reference
            table.integer('creator_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('users')
                .onDelete('CASCADE');
            
            // Timestamps
            table.timestamps(true, true);
            
            // Indexes
            table.index('contract_address');
            table.index('creator_id');
            table.index('status');
            table.index('is_public');
        })
        
        // DAO Members table (junction table for users and DAOs)
        .createTable('dao_members', function(table) {
            // Primary Key
            table.increments('id').primary();
            
            // Foreign Keys
            table.integer('user_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('users')
                .onDelete('CASCADE');
                
            table.integer('dao_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('daos')
                .onDelete('CASCADE');
            
            // Membership details
            table.decimal('token_balance', 18, 8).defaultTo(0); // Governance token balance
            table.enu('role', ['member', 'moderator', 'admin']).defaultTo('member');
            table.enu('status', ['active', 'pending', 'suspended']).defaultTo('active');
            
            // Membership dates
            table.timestamp('joined_at').defaultTo(knex.fn.now());
            table.timestamp('last_active_at').defaultTo(knex.fn.now());
            
            // Indexes and unique constraints
            table.unique(['user_id', 'dao_id']);
            table.index('user_id');
            table.index('dao_id');
            table.index('role');
            table.index('status');
        })
        
        // Proposals table
        .createTable('proposals', function(table) {
            // Primary Key
            table.increments('id').primary();
            
            // Proposal identification
            table.string('title', 200).notNullable();
            table.text('description').notNullable();
            table.string('proposal_id').notNullable(); // On-chain proposal ID
            
            // Foreign Keys
            table.integer('dao_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('daos')
                .onDelete('CASCADE');
                
            table.integer('proposer_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('users')
                .onDelete('CASCADE');
            
            // Proposal details
            table.json('actions'); // Array of on-chain actions to execute
            table.decimal('value', 18, 8).defaultTo(0); // ETH value to send with proposal
            table.string('target_contract', 42); // Contract address to call
            
            // Voting parameters
            table.timestamp('voting_start_at').notNullable();
            table.timestamp('voting_end_at').notNullable();
            table.decimal('quorum_threshold', 5, 2); // Override DAO default if needed
            
            // Proposal status
            table.enu('status', [
                'pending',
                'active',
                'succeeded',
                'defeated',
                'executed',
                'canceled',
                'expired'
            ]).defaultTo('pending');
            
            // Voting results
            table.decimal('for_votes', 18, 8).defaultTo(0);
            table.decimal('against_votes', 18, 8).defaultTo(0);
            table.decimal('abstain_votes', 18, 8).defaultTo(0);
            table.decimal('total_votes', 18, 8).defaultTo(0);
            
            // Execution details
            table.timestamp('executed_at');
            table.string('transaction_hash'); // TX hash of execution
            
            // Timestamps
            table.timestamps(true, true);
            
            // Indexes
            table.index('dao_id');
            table.index('proposer_id');
            table.index('proposal_id');
            table.index('status');
            table.index('voting_start_at');
            table.index('voting_end_at');
            table.unique(['dao_id', 'proposal_id']);
        })
        
        // Votes table
        .createTable('votes', function(table) {
            // Primary Key
            table.increments('id').primary();
            
            // Foreign Keys
            table.integer('proposal_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('proposals')
                .onDelete('CASCADE');
                
            table.integer('user_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('users')
                .onDelete('CASCADE');
            
            // Vote details
            table.enu('vote_type', ['for', 'against', 'abstain']).notNullable();
            table.decimal('vote_weight', 18, 8).notNullable(); // Weight of the vote
            table.text('reason'); // Optional reason for vote
            
            // On-chain verification
            table.string('transaction_hash');
            table.integer('block_number');
            
            // Timestamps
            table.timestamp('voted_at').defaultTo(knex.fn.now());
            
            // Indexes and unique constraints
            table.unique(['proposal_id', 'user_id']);
            table.index('proposal_id');
            table.index('user_id');
            table.index('vote_type');
            table.index('voted_at');
        });
};

exports.down = function(knex) {
    return knex.schema
        .dropTableIfExists('votes')
        .dropTableIfExists('proposals')
        .dropTableIfExists('dao_members')
        .dropTableIfExists('daos');
};

exports.config = { transaction: true };