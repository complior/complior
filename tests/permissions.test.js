'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createTestSandbox, loadAppModule } = require('./helpers/test-sandbox.js');

const createMockDb = () => ({
  query: async (sql) => {
    if (sql.includes('FROM "Permission"')) {
      return {
        rows: [
          { role: 'owner', resource: 'Organization', action: 'manage' },
          { role: 'owner', resource: 'AITool', action: 'manage' },
          { role: 'owner', resource: 'AuditLog', action: 'read' },
          { role: 'admin', resource: 'AITool', action: 'manage' },
          { role: 'admin', resource: 'AuditLog', action: 'read' },
          { role: 'member', resource: 'AITool', action: 'read' },
          { role: 'member', resource: 'AITool', action: 'create' },
          { role: 'viewer', resource: 'AITool', action: 'read' },
        ],
      };
    }
    return { rows: [] };
  },
});

describe('permissions', () => {
  it('owner has manage (wildcard) access to Organization', async () => {
    const db = createMockDb();
    const sandbox = createTestSandbox(db);
    const { checkPermission } = await loadAppModule('lib/permissions.js', sandbox);
    const user = { roles: ['owner'] };
    await checkPermission(user, 'Organization', 'read');
    await checkPermission(user, 'Organization', 'create');
    await checkPermission(user, 'Organization', 'update');
    await checkPermission(user, 'Organization', 'delete');
  });

  it('manage action grants all CRUD actions', async () => {
    const db = createMockDb();
    const sandbox = createTestSandbox(db);
    const { checkPermission } = await loadAppModule('lib/permissions.js', sandbox);
    const user = { roles: ['admin'] };
    await checkPermission(user, 'AITool', 'read');
    await checkPermission(user, 'AITool', 'create');
    await checkPermission(user, 'AITool', 'update');
    await checkPermission(user, 'AITool', 'delete');
  });

  it('member can read AITool but not delete', async () => {
    const db = createMockDb();
    const sandbox = createTestSandbox(db);
    const { checkPermission } = await loadAppModule('lib/permissions.js', sandbox);
    const user = { roles: ['member'] };
    await checkPermission(user, 'AITool', 'read');
    await assert.rejects(
      checkPermission(user, 'AITool', 'delete'),
      (err) => err.statusCode === 403,
    );
  });

  it('viewer can only read AITool', async () => {
    const db = createMockDb();
    const sandbox = createTestSandbox(db);
    const { checkPermission } = await loadAppModule('lib/permissions.js', sandbox);
    const user = { roles: ['viewer'] };
    await checkPermission(user, 'AITool', 'read');
    await assert.rejects(
      checkPermission(user, 'AITool', 'create'),
      (err) => err.statusCode === 403,
    );
  });

  it('throws when user has no roles', async () => {
    const db = createMockDb();
    const sandbox = createTestSandbox(db);
    const { checkPermission } = await loadAppModule('lib/permissions.js', sandbox);
    await assert.rejects(
      checkPermission({ roles: [] }, 'AITool', 'read'),
      (err) => err.statusCode === 403,
    );
  });

  it('hasPermission returns boolean without throwing', async () => {
    const db = createMockDb();
    const sandbox = createTestSandbox(db);
    const { hasPermission } = await loadAppModule('lib/permissions.js', sandbox);
    const owner = { roles: ['owner'] };
    const viewer = { roles: ['viewer'] };
    assert.strictEqual(await hasPermission(owner, 'Organization', 'delete'), true);
    assert.strictEqual(await hasPermission(viewer, 'Organization', 'delete'), false);
  });
});
