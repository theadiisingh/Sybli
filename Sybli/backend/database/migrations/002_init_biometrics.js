/**
 * Migration: 002_init_biometrics
 * Description: Create biometrics table for user health and fitness data
 */

exports.up = function(knex) {
    return knex.schema.createTable('biometrics', function(table) {
        // Primary Key
        table.increments('id').primary();
        
        // Foreign Key to users table
        table.integer('user_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');
        
        // Basic biometric data
        table.decimal('height_cm', 5, 2); // Height in centimeters
        table.decimal('weight_kg', 5, 2); // Weight in kilograms
        table.decimal('bmi', 4, 2); // Body Mass Index
        
        // Body measurements (in cm)
        table.decimal('chest_circumference', 5, 2);
        table.decimal('waist_circumference', 5, 2);
        table.decimal('hip_circumference', 5, 2);
        table.decimal('arm_circumference', 5, 2);
        table.decimal('thigh_circumference', 5, 2);
        
        // Fitness metrics
        table.integer('resting_heart_rate'); // BPM
        table.integer('vo2_max'); // Maximum oxygen consumption
        table.decimal('body_fat_percentage', 4, 2);
        table.decimal('muscle_mass_kg', 5, 2);
        
        // Health markers
        table.decimal('blood_pressure_systolic', 3, 0);
        table.decimal('blood_pressure_diastolic', 3, 0);
        table.decimal('blood_sugar', 4, 2); // mmol/L
        table.decimal('cholesterol_total', 4, 2);
        table.decimal('cholesterol_hdl', 4, 2);
        table.decimal('cholesterol_ldl', 4, 2);
        
        // Activity level and goals
        table.enu('activity_level', ['sedentary', 'light', 'moderate', 'active', 'very_active']);
        table.integer('daily_calorie_goal');
        table.integer('daily_step_goal');
        
        // Additional metrics storage for flexibility
        table.json('additional_metrics');
        
        // Record metadata
        table.date('measurement_date').notNullable();
        table.text('notes');
        
        // Timestamps
        table.timestamps(true, true);
        
        // Indexes for better query performance
        table.index('user_id');
        table.index('measurement_date');
        table.index(['user_id', 'measurement_date']);
        
        // Unique constraint to prevent duplicate entries for same user and date
        table.unique(['user_id', 'measurement_date']);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('biometrics');
};

exports.config = { transaction: true };