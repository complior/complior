'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { initRequestId, initErrorHandler, registerSandboxRoutes } = require('../server/src/http.js');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const createMockDb = () => {
  const mockClient = {
    query: async (sql) => {
      if (sql.includes('FROM "User" WHERE "workosUserId"')) return { rows: [] };
      if (sql.includes('INSERT INTO "Organization"')) return { rows: [{ id: 1 }] };
      if (sql.includes('INSERT INTO "User"')) return { rows: [{ id: 1 }] };
      if (sql.includes('FROM "Role" WHERE "name"')) return { rows: [{ roleId: 1 }] };
      if (sql.includes('INSERT INTO "UserRole"')) return { rows: [{ userRoleId: 1 }] };
      if (sql.includes('FROM "Plan" WHERE "name"')) return { rows: [{ planId: 1 }] };
      if (sql.includes('INSERT INTO "Subscription"')) return { rows: [{ id: 1 }] };
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      return { rows: [] };
    },
    release: () => {},
  };

  return {
    query: async (sql) => {
      if (sql.includes('FROM "User" WHERE "workosUserId"')) return { rows: [] };
      return { rows: [] };
    },
    connect: async () => mockClient,
  };
};

describe('GET /api/auth/callback', () => {
  let server;

  before(async () => {
    const mockDb = createMockDb();
    const mockWorkos = {
      getAuthorizationUrl: () => 'https://authkit.workos.com/test',
      authenticateWithCode: async (code) => {
        if (code === 'valid-code') {
          return {
            user: { id: 'user_01ABC', email: 'new@example.com', firstName: 'Max', lastName: 'Mustermann' },
            sealedSession: 'sealed-session-data-xyz',
          };
        }
        throw new Error('Invalid code');
      },
      verifySessionCookie: async () => ({ authenticated: true, user: { id: 'user_01ABC' } }),
      deleteUser: async () => {},
    };
    const { api } = await buildFullSandbox(mockDb, { workos: mockWorkos });

    server = fastify({ logger: false });
    await server.register(require('@fastify/cookie'));
    initRequestId(server);
    initErrorHandler(server);
    registerSandboxRoutes(server, { auth: { callback: api.auth.callback } });
    await server.ready();
  });

  after(async () => {
    await server.close();
  });

  it('creates user and redirects on valid code', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/auth/callback?code=valid-code',
    });
    assert.strictEqual(res.statusCode, 302);
  });

  it('redirects to login with error for missing code', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/auth/callback',
    });
    assert.strictEqual(res.statusCode, 302);
    assert.ok(res.headers.location.includes('/auth/login?error=missing_code'));
  });

  it('redirects to login with error for invalid code', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/auth/callback?code=invalid-code',
    });
    assert.strictEqual(res.statusCode, 302);
    assert.ok(res.headers.location.includes('/auth/login?error=auth_failed'));
  });
});
