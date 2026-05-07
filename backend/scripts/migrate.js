/**
 * Database Migration Script
 * 
 * Run this script to create all database tables:
 * node scripts/migrate.js
 * 
 * Environment variables required:
 * - DATABASE_URL: PostgreSQL connection string
 */

import dotenv from 'dotenv';
dotenv.config({ path: new URL('../api/.env', import.meta.url).pathname });
import { sequelize } from '../api/models/index.js';

const migrate = async () => {
  try {
    console.log('Starting database migration...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Connected' : 'Not set');

    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Sync all models (creates tables)
    await sequelize.sync({ force: process.argv.includes('--force') });
    
    console.log('Database migration completed successfully!');
    console.log('\nTables created:');
    console.log('- users');
    console.log('- properties');
    console.log('- units');
    console.log('- leases');
    console.log('- payments');
    console.log('- conversations');
    console.log('- messages');
    console.log('- notifications');
    console.log('- maintenance_requests');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
