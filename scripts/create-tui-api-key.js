'use strict';

/**
 * Create a CLI API key with cpl_ prefix format.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/create-tui-api-key.js
 *   DATABASE_URL=postgres://... node scripts/create-tui-api-key.js "My CLI Key"
 *
 * Inserts an API key with `cpl_` prefix into the ApiKey table.
 * The key can be used as: Authorization: Bearer cpl_xxxxx
 * Or via x-api-key header.
 *
 * NOTE: /v1/registry/tools and /v1/registry/stats are public endpoints —
 * no key is strictly required. The key provides rate-limit tracking only.
 */

const crypto = require('node:crypto');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const keyName = process.argv[2] || 'Complior CLI';

(async () => {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Generate cpl_ key: cpl_ + 40 hex chars = 44 chars total
    const rawBytes = crypto.randomBytes(20).toString('hex');
    const fullKey = `cpl_${rawBytes}`;
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
    const keyPrefix = fullKey.slice(0, 12); // 'cpl_xxxxxxxx'

    // Find any organization to attach key to (use first active org, or create orphan)
    const orgResult = await pool.query(
      `SELECT "organizationId" FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1`,
    );

    if (orgResult.rows.length === 0) {
      console.error('ERROR: No organizations found in database.');
      console.error('Create an organization first, then run this script.');
      process.exit(1);
    }

    const organizationId = orgResult.rows[0].organizationId;

    // Insert the key
    const insertResult = await pool.query(
      `INSERT INTO "ApiKey"
         ("organizationId", "keyHash", "keyPrefix", "name", "plan", "rateLimit", "active", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'scale', 10000, true, NOW(), NOW())
       RETURNING "apiKeyId"`,
      [organizationId, keyHash, keyPrefix, keyName],
    );

    const apiKeyId = insertResult.rows[0].apiKeyId;

    console.log('\n✅ API key created successfully!\n');
    console.log('─'.repeat(60));
    console.log(`Key ID   : ${apiKeyId}`);
    console.log(`Name     : ${keyName}`);
    console.log(`Org ID   : ${organizationId}`);
    console.log(`Plan     : scale (10,000 req/day)`);
    console.log(`Prefix   : ${keyPrefix}`);
    console.log('─'.repeat(60));
    console.log(`\n🔑 FULL KEY (save this — shown only once):\n`);
    console.log(`   ${fullKey}\n`);
    console.log('─'.repeat(60));
    console.log('\nAdd to ~/.config/complior/credentials:');
    console.log(`   COMPLIOR_API_KEY=${fullKey}\n`);
    console.log('Or use as HTTP header:');
    console.log(`   Authorization: Bearer ${fullKey}`);
    console.log(`   x-api-key: ${fullKey}\n`);

  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
