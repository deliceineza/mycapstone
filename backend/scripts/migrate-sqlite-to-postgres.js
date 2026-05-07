/**
 * One-time SQLite to PostgreSQL data importer.
 *
 * Runtime no longer depends on SQLite. If you need to import the old local DB,
 * install the SQLite driver temporarily:
 * npm install --no-save sqlite3
 *
 * Usage:
 * node scripts/migrate-sqlite-to-postgres.js ./database.db
 */

import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

import {
  sequelize,
  User,
  Property,
  Unit,
  Lease,
  Payment,
  Conversation,
  Message,
  Notification,
  MaintenanceRequest
} from '../api/models/index.js';

const sqliteFile = process.argv[2] || './database.db';

const tableImports = [
  { table: 'users', model: User, jsonFields: ['notificationPreferences'], booleanFields: ['isActive', 'mustChangePassword'] },
  { table: 'properties', model: Property, jsonFields: ['amenities', 'images'], booleanFields: ['isActive'] },
  { table: 'units', model: Unit, jsonFields: ['features', 'images'] },
  { table: 'leases', model: Lease, jsonFields: ['documents'], booleanFields: ['autoRenew'] },
  { table: 'payments', model: Payment, jsonFields: ['metadata'] },
  { table: 'conversations', model: Conversation, jsonFields: ['metadata'], booleanFields: ['isArchived'] },
  { table: 'messages', model: Message, jsonFields: ['attachments', 'metadata'], booleanFields: ['isRead'] },
  { table: 'notifications', model: Notification, jsonFields: ['data', 'sentVia'], booleanFields: ['isRead'] },
  { table: 'maintenance_requests', model: MaintenanceRequest, jsonFields: ['images', 'vendorInfo'] }
];

const parseJson = (value) => {
  if (value === null || value === undefined || value === '') return value;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeRow = (row, { jsonFields = [], booleanFields = [] }) => {
  const normalized = { ...row };

  for (const field of jsonFields) {
    if (field in normalized) {
      normalized[field] = parseJson(normalized[field]);
    }
  }

  for (const field of booleanFields) {
    if (field in normalized && normalized[field] !== null && normalized[field] !== undefined) {
      normalized[field] = Boolean(normalized[field]);
    }
  }

  return normalized;
};

const loadSqlite = async () => {
  try {
    return await import('sqlite3');
  } catch {
    throw new Error('sqlite3 is required only for this import script. Run: npm install --no-save sqlite3');
  }
};

const all = (db, sql) => new Promise((resolve, reject) => {
  db.all(sql, (error, rows) => {
    if (error) reject(error);
    else resolve(rows);
  });
});

const close = (db) => new Promise((resolve, reject) => {
  db.close((error) => {
    if (error) reject(error);
    else resolve();
  });
});

const migrate = async () => {
  const sqlite3Module = await loadSqlite();
  const sqlite3 = sqlite3Module.default || sqlite3Module;
  const db = new sqlite3.Database(sqliteFile);

  try {
    await sequelize.authenticate();
    await sequelize.sync();

    for (const tableImport of tableImports) {
      const rows = await all(db, `SELECT * FROM ${tableImport.table}`);

      if (rows.length === 0) {
        console.log(`[skip] ${tableImport.table}: no rows`);
        continue;
      }

      const normalizedRows = rows.map((row) => normalizeRow(row, tableImport));
      await tableImport.model.bulkCreate(normalizedRows, {
        validate: true,
        ignoreDuplicates: true
      });

      console.log(`[ok] ${tableImport.table}: imported ${rows.length} rows`);
    }
  } finally {
    await close(db);
    await sequelize.close();
  }
};

migrate()
  .then(() => {
    console.log('SQLite data import completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('SQLite data import failed:', error.message);
    process.exit(1);
  });
