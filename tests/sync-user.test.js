'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createTestSandbox, loadAppModule } = require('./helpers/test-sandbox.js');

const createMockDb = (existingUser = null) => {
  const mockClient = {
    query: async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('FROM "User" WHERE "oryId"')) {
        return { rows: existingUser ? [existingUser] : [] };
      }
      if (sql.includes('INSERT INTO "Organization"')) {
        return { rows: [{ id: 10 }] };
      }
      if (sql.includes('INSERT INTO "User"')) {
        return { rows: [{ id: 20 }] };
      }
      if (sql.includes('FROM "Role"')) {
        return { rows: [{ roleId: 1 }] };
      }
      if (sql.includes('INSERT INTO "UserRole"')) {
        return { rows: [] };
      }
      if (sql.includes('FROM "Plan"')) {
        return { rows: [{ planId: 1 }] };
      }
      if (sql.includes('INSERT INTO "Subscription"')) {
        return { rows: [] };
      }
      return { rows: [] };
    },
    release: () => {},
  };

  return {
    query: async (sql) => {
      if (sql.includes('FROM "User" WHERE "oryId"')) {
        return { rows: existingUser ? [existingUser] : [] };
      }
      if (sql.includes('UPDATE "User"')) {
        return { rows: existingUser ? [existingUser] : [] };
      }
      return { rows: [] };
    },
    connect: async () => mockClient,
  };
};

describe('syncUserFromOry', () => {
  describe('syncFromWebhook', () => {
    it('creates new user with org, role, and subscription', async () => {
      const db = createMockDb();
      const sandbox = createTestSandbox(db);
      const sync = await loadAppModule('application/iam/syncUserFromOry.js', sandbox);
      const result = await sync.syncFromWebhook({
        identity_id: 'ory-new',
        email: 'new@example.com',
        name: { first: 'Max', last: 'Mustermann' },
        locale: 'de',
      });
      assert.strictEqual(result.created, true);
      assert.strictEqual(result.user.id, 20);
      assert.strictEqual(result.user.organizationId, 10);
    });

    it('returns existing user without creating duplicate', async () => {
      const existing = { id: 5, organizationId: 3 };
      const db = createMockDb(existing);
      const sandbox = createTestSandbox(db);
      const sync = await loadAppModule('application/iam/syncUserFromOry.js', sandbox);
      const result = await sync.syncFromWebhook({
        identity_id: 'ory-existing',
        email: 'existing@example.com',
      });
      assert.strictEqual(result.created, false);
      assert.strictEqual(result.user.id, 5);
    });

    it('throws on missing oryId', async () => {
      const db = createMockDb();
      const sandbox = createTestSandbox(db);
      const sync = await loadAppModule('application/iam/syncUserFromOry.js', sandbox);
      await assert.rejects(
        sync.syncFromWebhook({ email: 'test@example.com' }),
        (err) => err.statusCode === 400,
      );
    });

    it('throws on missing email', async () => {
      const db = createMockDb();
      const sandbox = createTestSandbox(db);
      const sync = await loadAppModule('application/iam/syncUserFromOry.js', sandbox);
      await assert.rejects(
        sync.syncFromWebhook({ identity_id: 'ory-1' }),
        (err) => err.statusCode === 400,
      );
    });
  });

  describe('syncOnLogin', () => {
    it('returns existing user and updates lastLoginAt', async () => {
      const existing = {
        id: 5, organizationId: 3, email: 'e@test.com',
        fullName: 'Test', active: true, locale: 'de', roles: ['owner'],
      };
      const db = createMockDb(existing);
      const sandbox = createTestSandbox(db);
      sandbox.application = {
        iam: { syncUserFromOry: await loadAppModule('application/iam/syncUserFromOry.js', sandbox) },
      };
      const sync = sandbox.application.iam.syncUserFromOry;
      const user = await sync.syncOnLogin({
        identity: { id: 'ory-5', traits: { email: 'e@test.com' } },
      });
      assert.strictEqual(user.id, 5);
    });

    it('returns null for invalid session', async () => {
      const db = createMockDb();
      const sandbox = createTestSandbox(db);
      const sync = await loadAppModule('application/iam/syncUserFromOry.js', sandbox);
      const user = await sync.syncOnLogin(null);
      assert.strictEqual(user, null);
    });
  });
});
