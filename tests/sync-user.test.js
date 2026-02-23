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
      if (sql.includes('FROM "User" WHERE "workosUserId"')) {
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
      if (sql.includes('FROM "User" WHERE "workosUserId"')) {
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

describe('syncUserFromWorkOS', () => {
  describe('syncUser', () => {
    it('creates new user with org, role, and subscription', async () => {
      const db = createMockDb();
      const sandbox = createTestSandbox(db);
      const sync = await loadAppModule('application/iam/syncUserFromWorkOS.js', sandbox);
      const result = await sync.syncUser({
        id: 'user_01H',
        email: 'new@example.com',
        firstName: 'Max',
        lastName: 'Mustermann',
      });
      assert.strictEqual(result.created, true);
      assert.strictEqual(result.user.id, 20);
      assert.strictEqual(result.user.organizationId, 10);
    });

    it('returns existing user and updates lastLoginAt', async () => {
      const existing = { id: 5, organizationId: 3 };
      const db = createMockDb(existing);
      const sandbox = createTestSandbox(db);
      const sync = await loadAppModule('application/iam/syncUserFromWorkOS.js', sandbox);
      const result = await sync.syncUser({
        id: 'user_existing',
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User',
      });
      assert.strictEqual(result.created, false);
      assert.strictEqual(result.user.id, 5);
    });

    it('throws on missing workosUserId', async () => {
      const db = createMockDb();
      const sandbox = createTestSandbox(db);
      const sync = await loadAppModule('application/iam/syncUserFromWorkOS.js', sandbox);
      await assert.rejects(
        sync.syncUser({ email: 'test@example.com' }),
        (err) => err.statusCode === 400,
      );
    });

    it('throws on missing email', async () => {
      const db = createMockDb();
      const sandbox = createTestSandbox(db);
      const sync = await loadAppModule('application/iam/syncUserFromWorkOS.js', sandbox);
      await assert.rejects(
        sync.syncUser({ id: 'user_01' }),
        (err) => err.statusCode === 400,
      );
    });
  });
});
