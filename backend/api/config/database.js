import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

let sequelize;

// Check if using SQLite or PostgreSQL
if (databaseUrl.startsWith('sqlite:')) {
  // SQLite configuration
  const dbPath = databaseUrl.replace('sqlite:', '');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  });
} else {
  // PostgreSQL configuration
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  });
}

export default sequelize;