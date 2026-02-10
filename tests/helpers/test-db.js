'use strict';

const { Pool } = require('pg');
const { initDatabase } = require('../../app/setup.js');

const TEST_DB_URL = process.env.TEST_DATABASE_URL
  || 'postgres://postgres:postgres@localhost:5432/aiact_test';

let pool = null;

const getPool = () => {
  if (!pool) {
    const parsed = new URL(TEST_DB_URL);
    pool = new Pool({
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 5432,
      database: parsed.pathname.slice(1),
      user: parsed.username,
      password: parsed.password,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
};

const setupTestDb = async () => {
  const p = getPool();
  await initDatabase(p);
  return p;
};

const cleanupTestDb = async () => {
  if (!pool) return;
  // Clean user-created data (not seeds) in reverse dependency order
  const tables = [
    'AuditLog', 'Notification', 'ChatMessage', 'Conversation',
    'ImpactAssessment', 'FRIASection', 'FRIAAssessment',
    'LiteracyCompletion', 'LiteracyRequirement',
    'ChecklistItem', 'DocumentSection', 'ComplianceDocument',
    'ToolRequirement', 'ClassificationLog', 'RiskClassification',
    'AIToolDiscovery', 'AITool', 'TrainingModule', 'TrainingCourse',
    'Subscription', 'UserRole', 'Permission', 'Role',
    'User', 'Organization',
  ];
  const client = await pool.connect();
  try {
    for (const table of tables) {
      await client.query(`DELETE FROM "${table}"`);
    }
  } finally {
    client.release();
  }
};

const closeTestDb = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

module.exports = { getPool, setupTestDb, cleanupTestDb, closeTestDb };
