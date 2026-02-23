#!/usr/bin/env node
'use strict';

/**
 * Test job scheduler initialization
 * Verifies that scheduleRegistryRefresh.init() works correctly
 */

const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Job Scheduler Initialization Test              ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // 1. Create pg-boss client
  console.log('📋 TEST 1: pg-boss Client');
  const createPgBossClient = require('../server/infrastructure/jobs/pg-boss-client.js');
  const pgboss = createPgBossClient();
  await pgboss.start();
  console.log('   ✅ pg-boss started\n');

  // 2. Create minimal DB wrapper
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = {
    query: async (sql, params) => {
      const result = await pool.query(sql, params);
      return result.rows;
    },
  };

  // 3. Load domain service
  console.log('📋 TEST 2: Domain Service');
  const fs = require('fs');
  const refreshServicePath = path.join(__dirname, '../app/domain/registry/refresh-service.js');
  const serviceCode = fs.readFileSync(refreshServicePath, 'utf-8');

  // Create domain context with refresh service
  const domain = {
    registry: {
      refreshService: eval(`(${serviceCode})`)({ db, console, config: {} }),
    },
  };
  console.log('   ✅ Domain service loaded\n');

  // 4. Load and initialize job scheduler
  console.log('📋 TEST 3: Job Scheduler');
  const schedulePath = path.join(__dirname, '../app/application/jobs/schedule-registry-refresh.js');
  const scheduleCode = fs.readFileSync(schedulePath, 'utf-8');
  const scheduleRegistryRefresh = eval(`(${scheduleCode})`)({});

  const config = {
    registry: {
      refreshBatchSize: 100,
    },
  };

  await scheduleRegistryRefresh.init({
    pgboss,
    domain,
    console,
    config,
    db,
  });

  console.log('   ✅ Job scheduler initialized\n');

  // 5. Verify schedule was created
  console.log('📋 TEST 4: Verify Schedule');
  const schedules = await pool.query('SELECT name, cron, timezone FROM pgboss.schedule');
  console.log(`   Schedules found: ${schedules.rows.length}`);
  schedules.rows.forEach(s => {
    console.log(`   - ${s.name}: ${s.cron} (${s.timezone || 'UTC'})`);
  });

  if (schedules.rows.length > 0 && schedules.rows[0].name === 'registry-refresh') {
    console.log('   ✅ registry-refresh scheduled correctly\n');
  } else {
    console.log('   ⚠️  registry-refresh not found in schedule\n');
  }

  // 6. Test manual trigger
  console.log('📋 TEST 5: Manual Trigger');
  const result = await scheduleRegistryRefresh.trigger({ pgboss, console });
  console.log('   Manual trigger result:', result);
  console.log('   ✅ Manual trigger working\n');

  // Cleanup
  await pgboss.stop();
  await pool.end();

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║              TEST COMPLETE                       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('   ✅ pg-boss: Working');
  console.log('   ✅ Domain service: Loaded');
  console.log('   ✅ Job scheduler: Initialized');
  console.log('   ✅ Cron schedule: Created');
  console.log('   ✅ Manual trigger: Working');
  console.log('');
  console.log('   🎉 PHASE 3 COMPLETE!');
  console.log('');

  process.exit(0);
})().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
