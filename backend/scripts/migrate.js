/**
 * Database Migration Script
 * 
 * Run this script to apply non-destructive schema setup:
 * node scripts/migrate.js
 * 
 * Environment variables required:
 * - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */

import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });
import { sequelize } from '../api/models/index.js';
import { readFile } from 'fs/promises';

const migrate = async () => {
  try {
    if (process.argv.includes('--force')) {
      throw new Error('Refusing destructive migration: --force is disabled. Create an explicit reviewed migration instead.');
    }

    console.log('Starting database migration...');
    console.log('Database:', `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established.');

    const schemaPath = new URL('./schema.postgres.sql', import.meta.url);
    const schemaSql = await readFile(schemaPath, 'utf8');
    await sequelize.query(schemaSql);
    
    console.log('Database migration completed successfully!');
    console.log('\nSchema ensured without dropping or recreating existing tables:');
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
