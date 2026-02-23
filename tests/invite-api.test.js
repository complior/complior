'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { initRequestId, initErrorHandler, registerSandboxRoutes } = require('../server/src/http.js');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const MOCK_USER = {
  id: 1,
  organizationId: 10,
  email: 'owner@example.com',
  fullName: 'Test Owner',
  active: true,
  roles: ['owner'],
  locale: 'en',
};

const createMockDb = (overrides = {}) => {
  const {
    maxUsers = 3,
    currentUsers = 1,
    pendingInvites = 0,
    existingMemberEmail = null,
    existingInviteEmail = null,
  } = overrides;

  const createdInvitations = [];
  let nextInvitationId = 100;

  return {
    query: async (sql, params) => {
      // Permissions
      if (sql.includes('FROM "Permission"')) {
        return {
          rows: [
            { role: 'owner', resource: 'User', action: 'manage' },
            { role: 'owner', resource: 'Invitation', action: 'manage' },
            { role: 'owner', resource: 'Organization', action: 'manage' },
            { role: 'member', resource: 'AITool', action: 'create' },
          ],
        };
      }
      // Resolve user (syncOnLogin)
      if (sql.includes('FROM "User"') && sql.includes('workosUserId')) {
        return { rows: [MOCK_USER] };
      }
      // Update lastLoginAt
      if (sql.includes('UPDATE "User"') && sql.includes('lastLoginAt')) {
        return { rows: [], rowCount: 1 };
      }
      // Check existing member
      if (sql.includes('FROM "User"') && sql.includes('"email"') && sql.includes('"organizationId"')) {
        if (existingMemberEmail && params[0] === existingMemberEmail) {
          return { rows: [{ id: 99 }] };
        }
        return { rows: [] };
      }
      // Subscription+Plan
      if (sql.includes('FROM "Subscription"') && sql.includes('JOIN "Plan"')) {
        return { rows: [{ maxUsers }] };
      }
      // Count users
      if (sql.includes('COUNT') && sql.includes('"User"')) {
        return { rows: [{ total: currentUsers }] };
      }
      // Count or SELECT invitations
      if (sql.includes('COUNT') && sql.includes('"Invitation"')) {
        return { rows: [{ total: pendingInvites }] };
      }
      if (sql.includes('FROM "Invitation"') && sql.includes('"email"')) {
        if (existingInviteEmail && params) {
          const emailParam = params.find((p) => p === existingInviteEmail);
          if (emailParam) return { rows: [{ invitationId: 50, email: emailParam }] };
        }
        return { rows: [] };
      }
      // INSERT Invitation
      if (sql.includes('INSERT INTO "Invitation"')) {
        const id = nextInvitationId++;
        const inv = { invitationId: id, id };
        createdInvitations.push(inv);
        return { rows: [inv] };
      }
      // Get org name
      if (sql.includes('FROM "Organization"') && sql.includes('"name"')) {
        return { rows: [{ name: 'Test Org' }] };
      }
      // AuditLog
      if (sql.includes('INSERT INTO "AuditLog"')) {
        return { rows: [{ auditLogId: 1 }] };
      }
      return { rows: [] };
    },
  };
};

describe('POST /api/team/invite', () => {
  let server;

  const buildServer = async (dbOverrides = {}) => {
    const mockDb = createMockDb(dbOverrides);
    const { api } = await buildFullSandbox(mockDb);

    const srv = fastify({ logger: false });
    initRequestId(srv);
    initErrorHandler(srv);

    srv.addHook('onRequest', (req, _reply, done) => {
      req.session = {
        user: { id: 'wos-123' },
      };
      done();
    });

    registerSandboxRoutes(srv, { team: api.team });
    await srv.ready();
    return srv;
  };

  it('creates a pending invitation', async () => {
    server = await buildServer();
    const res = await server.inject({
      method: 'POST',
      url: '/api/team/invite',
      payload: { email: 'new@example.com', role: 'member' },
    });
    assert.strictEqual(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert(body.id || body.invitationId);
    await server.close();
  });

  it('rejects invalid email', async () => {
    server = await buildServer();
    const res = await server.inject({
      method: 'POST',
      url: '/api/team/invite',
      payload: { email: 'not-an-email', role: 'member' },
    });
    assert.strictEqual(res.statusCode, 400);
    await server.close();
  });

  it('rejects invalid role', async () => {
    server = await buildServer();
    const res = await server.inject({
      method: 'POST',
      url: '/api/team/invite',
      payload: { email: 'new@example.com', role: 'superadmin' },
    });
    assert.strictEqual(res.statusCode, 400);
    await server.close();
  });

  it('returns 409 when email is already a member', async () => {
    server = await buildServer({ existingMemberEmail: 'existing@example.com' });
    const res = await server.inject({
      method: 'POST',
      url: '/api/team/invite',
      payload: { email: 'existing@example.com', role: 'member' },
    });
    assert.strictEqual(res.statusCode, 409);
    await server.close();
  });

  it('returns 409 when pending invitation exists', async () => {
    server = await buildServer({ existingInviteEmail: 'pending@example.com' });
    const res = await server.inject({
      method: 'POST',
      url: '/api/team/invite',
      payload: { email: 'pending@example.com', role: 'member' },
    });
    assert.strictEqual(res.statusCode, 409);
    await server.close();
  });

  it('returns 403 when plan user limit exceeded', async () => {
    server = await buildServer({ maxUsers: 1, currentUsers: 1, pendingInvites: 0 });
    const res = await server.inject({
      method: 'POST',
      url: '/api/team/invite',
      payload: { email: 'new@example.com', role: 'member' },
    });
    assert.strictEqual(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.error.code, 'PLAN_LIMIT_EXCEEDED');
    await server.close();
  });
});
