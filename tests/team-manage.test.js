'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { initRequestId, initErrorHandler, registerSandboxRoutes } = require('../server/src/http.js');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const MOCK_OWNER = {
  id: 1,
  organizationId: 10,
  email: 'owner@example.com',
  fullName: 'Owner User',
  active: true,
  roles: ['owner'],
  locale: 'en',
};

const MOCK_ADMIN = {
  id: 4,
  organizationId: 10,
  email: 'admin@example.com',
  fullName: 'Admin User',
  active: true,
  roles: ['admin'],
  locale: 'en',
};

const MOCK_MEMBER_TARGET = {
  id: 2,
  email: 'member@example.com',
  fullName: 'Member User',
  active: true,
  role: 'member',
  organizationId: 10,
};

const MOCK_OWNER_TARGET = {
  id: 1,
  email: 'owner@example.com',
  fullName: 'Owner User',
  active: true,
  role: 'owner',
  organizationId: 10,
};

const MOCK_INVITATION = {
  invitationId: 100,
  id: 100,
  email: 'invited@example.com',
  role: 'member',
  status: 'pending',
  token: '550e8400-e29b-41d4-a716-446655440000',
  invitedById: 1,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  organizationId: 10,
};

const MOCK_ACCEPTED_INVITATION = {
  ...MOCK_INVITATION,
  invitationId: 101,
  id: 101,
  status: 'accepted',
};

const createMockDb = (currentUser = MOCK_OWNER) => {
  const permissions = [
    { role: 'owner', resource: 'User', action: 'manage' },
    { role: 'admin', resource: 'User', action: 'manage' },
    { role: 'member', resource: 'AITool', action: 'read' },
  ];

  const handleQuery = (sql, params) => {
    // Permissions query
    if (sql.includes('FROM "Permission"')) {
      return { rows: permissions };
    }
    // User query (resolveSession)
    if (sql.includes('FROM "User" u') && sql.includes('workosUserId') && sql.includes('GROUP BY')) {
      return { rows: [currentUser] };
    }
    // Target user query (changeRole / removeMember)
    if (sql.includes('FROM "User" u') && sql.includes('LEFT JOIN "UserRole"') && sql.includes('u."id" = $1')) {
      const targetId = params?.[0];
      if (targetId === 2) return { rows: [MOCK_MEMBER_TARGET] };
      if (targetId === 1) return { rows: [MOCK_OWNER_TARGET] };
      return { rows: [] };
    }
    // Members list query (listTeamMembers)
    if (sql.includes('FROM "User" u') && sql.includes('LEFT JOIN "UserRole"') && sql.includes('LEFT JOIN "Role"')) {
      return { rows: [MOCK_OWNER_TARGET, MOCK_MEMBER_TARGET] };
    }
    // Invitations list query
    if (sql.includes('FROM "Invitation" i') && sql.includes('pending')) {
      return { rows: [MOCK_INVITATION] };
    }
    // Subscription + Plan
    if (sql.includes('FROM "Subscription"') && sql.includes('JOIN "Plan"')) {
      return { rows: [{ maxUsers: 5 }] };
    }
    // Role lookup
    if (sql.includes('FROM "Role"') && sql.includes('"name"')) {
      return { rows: [{ roleId: 3 }] };
    }
    // DELETE UserRole
    if (sql.includes('DELETE FROM "UserRole"')) {
      return { rowCount: 1 };
    }
    // INSERT UserRole
    if (sql.includes('INSERT INTO "UserRole"')) {
      return { rows: [{ userId: params?.[0], roleId: params?.[1] }] };
    }
    // UPDATE User (remove member)
    if (sql.includes('UPDATE "User"') && sql.includes('"active"')) {
      return { rows: [], rowCount: 1 };
    }
    // Invitation findOne (SELECT * FROM "Invitation" WHERE "invitationId")
    if (sql.includes('FROM "Invitation"') && sql.includes('"invitationId"')) {
      const invId = params?.[0];
      if (invId === 100) return { rows: [MOCK_INVITATION] };
      if (invId === 101) return { rows: [MOCK_ACCEPTED_INVITATION] };
      return { rows: [] };
    }
    // UPDATE Invitation
    if (sql.includes('UPDATE "Invitation"')) {
      return { rows: [{ ...MOCK_INVITATION, status: 'revoked' }], rowCount: 1 };
    }
    // INSERT AuditLog
    if (sql.includes('INSERT INTO "AuditLog"')) {
      return { rows: [{ auditLogId: 1 }] };
    }
    return { rows: [] };
  };

  return {
    query: async (sql, params) => handleQuery(sql, params),
    connect: async () => ({
      query: async (sql, params) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] };
        }
        return handleQuery(sql, params);
      },
      release: () => {},
    }),
  };
};

const buildServer = async (currentUser) => {
  const mockDb = createMockDb(currentUser);
  const { api } = await buildFullSandbox(mockDb);

  const server = fastify({ logger: false });
  initRequestId(server);
  initErrorHandler(server);

  server.addHook('onRequest', (req, _reply, done) => {
    req.session = {
      user: { id: `wos-${currentUser.id}` },
    };
    done();
  });

  registerSandboxRoutes(server, { team: api.team });
  await server.ready();
  return server;
};

describe('Team Management — US-035', () => {
  let ownerServer;

  before(async () => {
    ownerServer = await buildServer(MOCK_OWNER);
  });

  after(async () => {
    await ownerServer.close();
  });

  describe('PATCH /api/team/members/:userId — Change Role', () => {
    it('owner can change member role to admin', async () => {
      const res = await ownerServer.inject({
        method: 'PATCH',
        url: '/api/team/members/2',
        payload: { role: 'admin' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.role, 'admin');
    });

    it('cannot change own role', async () => {
      const res = await ownerServer.inject({
        method: 'PATCH',
        url: '/api/team/members/1',
        payload: { role: 'member' },
      });
      assert.strictEqual(res.statusCode, 403);
    });

    it('cannot change owner role', async () => {
      // build server as admin trying to change owner
      const adminServer = await buildServer(MOCK_ADMIN);
      const res = await adminServer.inject({
        method: 'PATCH',
        url: '/api/team/members/1',
        payload: { role: 'member' },
      });
      assert.strictEqual(res.statusCode, 403);
      await adminServer.close();
    });

    it('admin cannot assign admin role', async () => {
      const adminServer = await buildServer(MOCK_ADMIN);
      const res = await adminServer.inject({
        method: 'PATCH',
        url: '/api/team/members/2',
        payload: { role: 'admin' },
      });
      assert.strictEqual(res.statusCode, 403);
      await adminServer.close();
    });

    it('rejects invalid role value', async () => {
      const res = await ownerServer.inject({
        method: 'PATCH',
        url: '/api/team/members/2',
        payload: { role: 'owner' },
      });
      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('DELETE /api/team/members/:userId — Remove Member', () => {
    it('owner can remove a member', async () => {
      const res = await ownerServer.inject({
        method: 'DELETE',
        url: '/api/team/members/2',
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.success, true);
    });

    it('cannot remove owner', async () => {
      const adminServer = await buildServer(MOCK_ADMIN);
      const res = await adminServer.inject({
        method: 'DELETE',
        url: '/api/team/members/1',
      });
      assert.strictEqual(res.statusCode, 403);
      await adminServer.close();
    });
  });

  describe('DELETE /api/team/invitations/:invitationId — Revoke', () => {
    it('revokes a pending invitation', async () => {
      const res = await ownerServer.inject({
        method: 'DELETE',
        url: '/api/team/invitations/100',
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.success, true);
    });
  });
});
