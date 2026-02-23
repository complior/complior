'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createTestSandbox, loadAppModule } = require('./helpers/test-sandbox.js');

const createMockDb = (userData = null) => ({
  query: async (sql, params) => {
    if (sql.includes('FROM "User"') && sql.includes('"workosUserId"')) {
      if (userData) return { rows: [userData] };
      return { rows: [] };
    }
    return { rows: [] };
  },
});

describe('resolveSession with WorkOS', () => {
  it('resolves user by workosUserId', async () => {
    const mockUser = {
      id: 1,
      workosUserId: 'user_01ABC',
      email: 'test@example.com',
      fullName: 'Test User',
      active: true,
      organizationId: 10,
      locale: 'en',
      lastLoginAt: '2026-01-01',
      roles: ['owner'],
    };
    const db = createMockDb(mockUser);
    const sandbox = createTestSandbox(db);
    const resolveSession = await loadAppModule('application/iam/resolveSession.js', sandbox);

    const user = await resolveSession.resolveUser({
      user: { id: 'user_01ABC' },
    });
    assert.strictEqual(user.id, 1);
    assert.strictEqual(user.email, 'test@example.com');
    assert.strictEqual(user.workosUserId, 'user_01ABC');
  });

  it('throws for missing session', async () => {
    const db = createMockDb();
    const sandbox = createTestSandbox(db);
    const resolveSession = await loadAppModule('application/iam/resolveSession.js', sandbox);

    await assert.rejects(
      () => resolveSession.resolveUser(null),
      (err) => err.statusCode === 401,
    );
  });

  it('throws for session without user', async () => {
    const db = createMockDb();
    const sandbox = createTestSandbox(db);
    const resolveSession = await loadAppModule('application/iam/resolveSession.js', sandbox);

    await assert.rejects(
      () => resolveSession.resolveUser({}),
      (err) => err.statusCode === 401,
    );
  });

  it('returns null when user not found in DB', async () => {
    const db = createMockDb(null);
    const sandbox = createTestSandbox(db);
    const resolveSession = await loadAppModule('application/iam/resolveSession.js', sandbox);

    const result = await resolveSession.resolveUser({
      user: { id: 'user_nonexistent' },
    });
    assert.strictEqual(result, null);
  });

  it('throws for deactivated user', async () => {
    const mockUser = {
      id: 1,
      workosUserId: 'user_01ABC',
      email: 'test@example.com',
      fullName: 'Test User',
      active: false,
      organizationId: 10,
      locale: 'en',
      roles: ['owner'],
    };
    const db = createMockDb(mockUser);
    const sandbox = createTestSandbox(db);
    const resolveSession = await loadAppModule('application/iam/resolveSession.js', sandbox);

    await assert.rejects(
      () => resolveSession.resolveUser({ user: { id: 'user_01ABC' } }),
      (err) => err.statusCode === 401,
    );
  });
});
