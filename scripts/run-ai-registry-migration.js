#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const pg = require('pg');

// Load .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const runMigration = async () => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  try {
    // Wrapper для совместимости с seed скриптом
    const db = {
      query: async (sql, params) => {
        const result = await pool.query(sql, params);
        return result.rows;
      },
    };

    // Загрузить и выполнить seed скрипт
    const seedScript = require('../app/seeds/migrate-ai-registry.js');

    console.log('⏱️  Starting AI Registry migration (this will take 10-20 minutes)...\n');
    const startTime = Date.now();

    await seedScript({ db });

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`\n⏱️  Migration completed in ${duration} minutes`);

  } catch (error) {
    console.error('\n❌ Ошибка миграции:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

runMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
