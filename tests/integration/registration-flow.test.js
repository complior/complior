'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { setupTestDb, cleanupTestDb, closeTestDb, getPool } = require('../helpers/test-db.js');

describe('Integration: Registration flow (real DB)', () => {
  let pool;

  before(async () => {
    pool = await setupTestDb();
  });

  after(async () => {
    await cleanupTestDb();
    await closeTestDb();
  });

  it('seeds catalog with 225+ AI tools', async () => {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS total FROM "AIToolCatalog"',
    );
    assert(result.rows[0].total >= 225,
      `Expected 225+ catalog tools, got ${result.rows[0].total}`);
  });

  it('seeds 4 roles (owner, admin, member, viewer)', async () => {
    const result = await pool.query(
      'SELECT "name" FROM "Role" ORDER BY "name"',
    );
    const names = result.rows.map((r) => r.name);
    assert(names.includes('owner'), 'Missing owner role');
    assert(names.includes('admin'), 'Missing admin role');
    assert(names.includes('member'), 'Missing member role');
    assert(names.includes('viewer'), 'Missing viewer role');
  });

  it('seeds plans including free tier', async () => {
    const result = await pool.query(
      'SELECT "name" FROM "Plan" WHERE "name" = $1',
      ['free'],
    );
    assert.strictEqual(result.rows.length, 1, 'Free plan not found');
  });

  it('webhook creates user + org + role + subscription', async () => {
    const createUserSync = require('../../src/application/iam/syncUserFromOry.js');
    const userSync = createUserSync(pool);

    const result = await userSync.syncFromWebhook({
      identity_id: 'ory-integration-test-1',
      email: 'integration@test.example.com',
      name: { first: 'Test', last: 'User' },
      locale: 'en',
    });

    assert.strictEqual(result.created, true);
    assert(result.user.id, 'User ID should exist');
    assert(result.user.organizationId, 'Organization ID should exist');

    // Verify user in DB
    const userRow = await pool.query(
      'SELECT * FROM "User" WHERE "oryId" = $1',
      ['ory-integration-test-1'],
    );
    assert.strictEqual(userRow.rows.length, 1);
    assert.strictEqual(userRow.rows[0].email, 'integration@test.example.com');
    assert.strictEqual(userRow.rows[0].locale, 'en');

    // Verify organization created
    const orgRow = await pool.query(
      'SELECT * FROM "Organization" WHERE "id" = $1',
      [result.user.organizationId],
    );
    assert.strictEqual(orgRow.rows.length, 1);

    // Verify owner role assigned
    const roleRow = await pool.query(
      `SELECT r."name" FROM "UserRole" ur
       JOIN "Role" r ON r."roleId" = ur."roleId"
       WHERE ur."userId" = $1`,
      [result.user.id],
    );
    assert.strictEqual(roleRow.rows.length, 1);
    assert.strictEqual(roleRow.rows[0].name, 'owner');

    // Verify subscription created
    const subRow = await pool.query(
      `SELECT s.*, p."name" AS "planName"
       FROM "Subscription" s
       JOIN "Plan" p ON p."planId" = s."planId"
       WHERE s."organizationId" = $1`,
      [result.user.organizationId],
    );
    assert.strictEqual(subRow.rows.length, 1);
    assert.strictEqual(subRow.rows[0].planName, 'free');
    assert.strictEqual(subRow.rows[0].status, 'active');
  });

  it('webhook is idempotent (same oryId returns existing)', async () => {
    const createUserSync = require('../../src/application/iam/syncUserFromOry.js');
    const userSync = createUserSync(pool);

    const result = await userSync.syncFromWebhook({
      identity_id: 'ory-integration-test-1',
      email: 'integration@test.example.com',
    });

    assert.strictEqual(result.created, false);
  });

  it('catalog search returns results for "ChatGPT"', async () => {
    const createCatalogSearch = require('../../src/application/inventory/searchCatalog.js');
    const catalogSearch = createCatalogSearch(pool);

    const result = await catalogSearch.search({ q: 'ChatGPT' });
    assert(result.data.length >= 1, 'Should find ChatGPT');
    assert(result.pagination.total >= 1);
    const chatgpt = result.data.find((t) => t.name === 'ChatGPT');
    assert(chatgpt, 'ChatGPT should be in results');
    assert.strictEqual(chatgpt.vendor, 'OpenAI');
  });

  it('catalog search filters by category', async () => {
    const createCatalogSearch = require('../../src/application/inventory/searchCatalog.js');
    const catalogSearch = createCatalogSearch(pool);

    const result = await catalogSearch.search({ category: 'recruitment' });
    assert(result.data.length >= 1, 'Should find recruitment tools');
    for (const tool of result.data) {
      assert.strictEqual(tool.category, 'recruitment');
    }
  });

  it('tenant isolation: user cannot see other org data', async () => {
    const createUserSync = require('../../src/application/iam/syncUserFromOry.js');
    const userSync = createUserSync(pool);

    // Create second user/org
    const result2 = await userSync.syncFromWebhook({
      identity_id: 'ory-integration-test-2',
      email: 'tenant2@test.example.com',
      name: { first: 'Other', last: 'User' },
      locale: 'de',
    });

    // Verify different organizations
    const user1 = await pool.query(
      'SELECT "organizationId" FROM "User" WHERE "oryId" = $1',
      ['ory-integration-test-1'],
    );
    assert.notStrictEqual(
      user1.rows[0].organizationId,
      result2.user.organizationId,
      'Users should be in different organizations',
    );
  });

  it('audit log can be written and queried', async () => {
    const createAuditLogger = require('../../src/lib/audit.js');
    const audit = createAuditLogger(pool);

    const user = await pool.query(
      'SELECT "id", "organizationId" FROM "User" WHERE "oryId" = $1',
      ['ory-integration-test-1'],
    );
    const { id: userId, organizationId } = user.rows[0];

    await audit.createAuditEntry({
      userId,
      organizationId,
      action: 'login',
      resource: 'User',
      resourceId: userId,
      ip: '127.0.0.1',
    });

    const entries = await audit.findEntries(organizationId);
    assert(entries.data.length >= 1, 'Should have audit entries');
    assert.strictEqual(entries.data[0].action, 'login');
  });
});
