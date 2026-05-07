import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize';

const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredVars.filter((name) => !process.env[name]);

if (missingVars.length > 0) {
  throw new Error(`Missing PostgreSQL configuration: ${missingVars.join(', ')}`);
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: Number(process.env.DB_POOL_MAX || 10),
      min: Number(process.env.DB_POOL_MIN || 0),
      acquire: Number(process.env.DB_POOL_ACQUIRE || 30000),
      idle: Number(process.env.DB_POOL_IDLE || 10000)
    },
    dialectOptions: {
      application_name: process.env.DB_APPLICATION_NAME || 'tenant-api',
      ...(process.env.DB_SSL === 'true' && {
        ssl: {
          require: true,
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
        }
      })
    }
  }
);

export default sequelize;
