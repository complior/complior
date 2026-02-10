'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { initRequestId, initErrorHandler, registerSandboxRoutes } = require('../server/src/http.js');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const createMockDb = () => {
  const mockClient = {
    query: async (sql) => {
      if (sql.includes('FROM "User" WHERE "oryId"')) return { rows: [] };
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
      if (sql.includes('FROM "User" WHERE "oryId"')) return { rows: [] };
      return { rows: [] };
    },
    connect: async () => mockClient,
  };
};

describe('POST /api/auth/webhook', () => {
  let server;

  before(async () => {
    const mockDb = createMockDb();
    const mockOry = {
      verifyWebhookSecret: (secret) => secret === 'test-secret',
      verifySession: async () => ({ identity: { id: 'ory-123' } }),
    };
    const { api } = await buildFullSandbox(mockDb, { ory: mockOry });

    server = fastify({ logger: false });
    initRequestId(server);
    initErrorHandler(server);
    registerSandboxRoutes(server, { auth: { webhook: api.auth.webhook } });
    await server.ready();
  });

  after(async () => {
    await server.close();
  });

  it('rejects request without valid webhook secret', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/webhook',
      headers: { 'x-webhook-secret': 'wrong-secret' },
      payload: { event: 'registration', identity_id: 'ory-123', email: 'test@example.com' },
    });
    assert.strictEqual(res.statusCode, 401);
  });

  it('creates user on valid registration webhook', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/webhook',
      headers: { 'x-webhook-secret': 'test-secret' },
      payload: {
        event: 'registration',
        identity_id: 'ory-456',
        email: 'new@example.com',
        name: { first: 'Max', last: 'Mustermann' },
        locale: 'de',
      },
    });
    assert.strictEqual(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.status, 'created');
    assert(body.userId);
    assert(body.organizationId);
  });

  it('ignores non-registration events', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/webhook',
      headers: { 'x-webhook-secret': 'test-secret' },
      payload: { event: 'login', identity_id: 'ory-789' },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.status, 'ignored');
  });

  it('returns 400 for missing identity_id', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/webhook',
      headers: { 'x-webhook-secret': 'test-secret' },
      payload: { event: 'registration', email: 'test@example.com' },
    });
    assert.strictEqual(res.statusCode, 400);
  });
});
