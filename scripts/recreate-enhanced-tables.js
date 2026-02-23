#!/usr/bin/env node
'use strict';

const pg = require('pg');
const path = require('path');

// Load .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const recreateTables = async () => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  try {
    console.log('=== Пересоздание расширенных таблиц ===\n');

    // Drop tables that need to be recreated with enhanced schemas
    console.log('Удаление старых таблиц...');
    await pool.query('DROP TABLE IF EXISTS "Obligation" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "RegistryTool" CASCADE');
    console.log('✓ Таблицы удалены\n');

    // Now we need to re-run setup.js to recreate them
    console.log('Теперь запустите: node -r dotenv/config app/setup.js');
    console.log('Это пересоздаст таблицы с расширенными схемами.');

  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

recreateTables().catch((err) => {
  console.error(err);
  process.exit(1);
});
