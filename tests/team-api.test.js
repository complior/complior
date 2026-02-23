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

const MOCK_MEMBER = {
  id: 2,
  organizationId: 10,
  email: 'member@example.com',
  fullName: 'Member User',
  active: true,
  roles: ['member'],
  locale: 'en',
};

const MOCK_VIEWER = {
  id: 3,
  organizationId: 10,
  email: 'viewer@example.com',
  fullName: 'Viewer User',
  active: true,
  roles: ['viewer'],
  locale: 'en',
};

const MOCK_INVITATION = {
  invitationId: 100,
  email: 'invited@example.com',
  role: 'member',
  status: 'pending',
  invitedBy: 'Owner User',
  invitedById: 1,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  organizationId: 10,
};

const createMockDb = (currentUser = MOCK_OWNER) => {
  const permissions = [
    { role: 'owner', resource: 'User', action: 'manage' },
    { role: 'admin', resource: 'User', action: 'manage' },
    { role: 'member', resource: 'AITool', action: 'read' },
    { role: 'viewer', resource: 'AITool', action: 'read' },
  ];

  return {
    _currentUser: currentUser,
    query: async (sql, params) => {
      // Permissions query
      if (sql.includes('FROM "Permission"')) {
        return { rows: permissions };
      }
      // User query (resolveSession)
      if (sql.includes('FROM "User" u') && sql.includes('workosUserId')) {
        return { rows: [currentUser] };
      }
      // Members query (listTeamMembers)
      if (sql.includes('FROM "User" u') && sql.includes('LEFT JOIN "UserRole"') && sql.includes('LEFT JOIN "Role"')) {
        return {
          rows: [
            { id: 1, email: 'owner@example.com', fullName: 'Owner User', active: true, lastLoginAt: '2026-02-01T00:00:00Z', role: 'owner' },
            { id: 2, email: 'member@example.com', fullName: 'Member User', active: true, lastLoginAt: '2026-02-02T00:00:00Z', role: 'member' },
            { id: 3, email: 'viewer@example.com', fullName: 'Viewer User', active: true, lastLoginAt: null, role: 'viewer' },
          ],
        };
      }
      // Invitations query (listTeamMembers)
      if (sql.includes('FROM "Invitation"') && sql.includes('pending')) {
        return {
          rows: [MOCK_INVITATION],
        };
      }
      // Subscription + Plan query (limits)
      if (sql.includes('FROM "Subscription"') && sql.includes('JOIN "Plan"')) {
        return { rows: [{ maxUsers: 5 }] };
      }
      return { rows: [] };
    },
  };
};

describe('Team API — US-034: List Team Members', () => {
  let server;

  before(async () => {
    const mockDb = createMockDb(MOCK_OWNER);
    const { api } = await buildFullSandbox(mockDb);

    server = fastify({ logger: false });
    initRequestId(server);
    initErrorHandler(server);

    server.addHook('onRequest', (req, _reply, done) => {
      req.session = {
        user: {
          id: 'wos-owner-123',
          email: MOCK_OWNER.email,
          firstName: 'Owner',
          lastName: 'User',
        },
      };
      done();
    });

    registerSandboxRoutes(server, { team: api.team });
    await server.ready();
  });

  after(async () => {
    await server.close();
  });

  it('returns members with roles sorted owner-first', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/team/members',
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert(Array.isArray(body.members));
    assert.strictEqual(body.members.length, 3);
    assert.strictEqual(body.members[0].role, 'owner');
    assert.strictEqual(body.members[1].role, 'member');
    assert.strictEqual(body.members[2].role, 'viewer');
  });

  it('includes pending invitations', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/team/members',
    });
    const body = JSON.parse(res.payload);
    assert(Array.isArray(body.invitations));
    assert.strictEqual(body.invitations.length, 1);
    assert.strictEqual(body.invitations[0].email, 'invited@example.com');
    assert.strictEqual(body.invitations[0].status, 'pending');
  });

  it('returns plan limits', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/team/members',
    });
    const body = JSON.parse(res.payload);
    assert(body.limits);
    assert.strictEqual(body.limits.current, 3);
    assert.strictEqual(body.limits.pending, 1);
    assert.strictEqual(body.limits.max, 5);
  });

  it('rejects unauthorized users (viewer without User.read)', async () => {
    const viewerDb = createMockDb(MOCK_VIEWER);
    const { api: viewerApi } = await buildFullSandbox(viewerDb);

    const viewerServer = fastify({ logger: false });
    initRequestId(viewerServer);
    initErrorHandler(viewerServer);

    viewerServer.addHook('onRequest', (req, _reply, done) => {
      req.session = {
        user: {
          id: 'wos-viewer-456',
          email: MOCK_VIEWER.email,
          firstName: 'Viewer',
          lastName: 'User',
        },
      };
      done();
    });

    registerSandboxRoutes(viewerServer, { team: viewerApi.team });
    await viewerServer.ready();

    const res = await viewerServer.inject({
      method: 'GET',
      url: '/api/team/members',
    });
    assert.strictEqual(res.statusCode, 403);
    await viewerServer.close();
  });
});
