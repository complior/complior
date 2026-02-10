'use strict';

const { describe, it, before, after, mock } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { initRequestId, initErrorHandler, initRoutes } = require('../src/http.js');

// Mock database
const createMockDb = () => {
  const queries = [];
  let connectCalls = 0;
  const mockClient = {
    query: async (sql, params) => {
      queries.push({ sql, params });

      if (sql.includes('FROM "User" WHERE "oryId"')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO "Organization"')) {
        return { rows: [{ id: 1 }] };
      }
      if (sql.includes('INSERT INTO "User"')) {
        return { rows: [{ id: 1 }] };
      }
      if (sql.includes('FROM "Role" WHERE "name"')) {
        return { rows: [{ id: 1 }] };
      }
      if (sql.includes('INSERT INTO "UserRole"')) {
        return { rows: [{ id: 1 }] };
      }
      if (sql.includes('FROM "Plan" WHERE "name"')) {
        return { rows: [{ id: 1 }] };
      }
      if (sql.includes('INSERT INTO "Subscription"')) {
        return { rows: [{ id: 1 }] };
      }
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      return { rows: [] };
    },
    release: () => {},
  };

  return {
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (sql.includes('FROM "User" WHERE "oryId"')) {
        return { rows: [] };
      }
      return { rows: [] };
    },
    connect: async () => {
      connectCalls++;
      return mockClient;
    },
    getQueries: () => queries,
    getConnectCalls: () => connectCalls,
  };
};

const createMockOryClient = (validSecret = 'test-secret') => ({
  verifyWebhookSecret: (secret) => secret === validSecret,
  verifySession: async () => ({ identity: { id: 'ory-123' } }),
});

describe('POST /api/auth/webhook', () => {
  let server;
  let mockDb;

  before(async () => {
    mockDb = createMockDb();
    const mockOryClient = createMockOryClient();

    const createUserSync = require('../src/application/iam/syncUserFromOry.js');
    const userSync = createUserSync(mockDb);

    const createWebhookHandler = require('../src/api/auth/webhook.js');
    const webhookRoute = createWebhookHandler(mockDb, mockOryClient, userSync);

    server = fastify({ logger: false });
    initRequestId(server);
    initErrorHandler(server);
    initRoutes(server, [webhookRoute]);
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
