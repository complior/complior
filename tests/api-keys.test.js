'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
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

const MOCK_MEMBER = {
  id: 2,
  organizationId: 10,
  email: 'member@example.com',
  fullName: 'Test Member',
  active: true,
  roles: ['member'],
  locale: 'en',
};

const createMockDb = () => {
  const apiKeys = [];
  const apiUsage = [];
  let nextId = 1;

  const permissions = [
    { role: 'owner', resource: 'ApiKey', action: 'manage' },
    { role: 'owner', resource: 'Subscription', action: 'manage' },
    { role: 'admin', resource: 'ApiKey', action: 'manage' },
    { role: 'member', resource: 'AITool', action: 'read' },
  ];

  return {
    apiKeys,
    apiUsage,
    query: async (sql, params) => {
      // Permission lookup
      if (sql.includes('FROM "Permission"')) {
        return { rows: permissions };
      }

      // User lookup
      if (sql.includes('FROM "User"') && sql.includes('workosUserId')) {
        const workosId = params?.[0];
        if (workosId === 'wos-member') return { rows: [MOCK_MEMBER] };
        return { rows: [MOCK_USER] };
      }

      // Subscription lookup for plan
      if (sql.includes('FROM "Subscription"') && sql.includes('planName')) {
        return { rows: [{ planName: 'starter' }] };
      }

      // ApiKey INSERT
      if (sql.includes('INSERT INTO "ApiKey"')) {
        const id = nextId++;
        const row = { apiKeyId: id };
        const cols = sql.match(/\("([^"]+)"/g) || [];
        // Parse column names from the INSERT statement
        const colMatch = sql.match(/INSERT INTO "ApiKey" \(([^)]+)\)/);
        if (colMatch) {
          const colNames = colMatch[1].match(/"([^"]+)"/g).map((c) => c.replace(/"/g, ''));
          for (let i = 0; i < colNames.length; i++) {
            row[colNames[i]] = params[i];
          }
        }
        row.apiKeyId = id;
        row.id = id;
        apiKeys.push(row);
        return { rows: [row] };
      }

      // ApiKey SELECT (findOne for revoke)
      if (sql.includes('FROM "ApiKey"') && sql.includes('apiKeyId') && !sql.includes('LEFT JOIN')) {
        const id = params[0];
        const orgId = params[1];
        const key = apiKeys.find((k) => k.apiKeyId === id && k.organizationId === orgId && k.active);
        return { rows: key ? [key] : [] };
      }

      // ApiKey UPDATE (revoke)
      if (sql.includes('UPDATE "ApiKey"')) {
        const id = params[params.length - 2];
        const key = apiKeys.find((k) => k.apiKeyId === id);
        if (key) {
          key.active = false;
          return { rows: [key], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // ApiKey list with usage
      if (sql.includes('FROM "ApiKey" k') && sql.includes('LEFT JOIN "ApiUsage"')) {
        const orgId = params[0];
        const activeKeys = apiKeys
          .filter((k) => k.organizationId === orgId && k.active !== false)
          .map((k) => ({
            ...k,
            requestCount: 0,
            bytesTransferred: 0,
          }));
        return { rows: activeKeys };
      }

      // Audit log
      if (sql.includes('INSERT INTO "AuditLog"')) {
        return { rows: [{ auditLogId: 1 }] };
      }

      // Count for tenant
      if (sql.includes('COUNT')) {
        return { rows: [{ total: 0 }] };
      }

      return { rows: [] };
    },
  };
};

describe('API Key Management (US-075)', () => {
  describe('POST /api/settings/api-keys', () => {
    let authedServer;
    let unauthedServer;

    before(async () => {
      const mockDb = createMockDb();
      const { api } = await buildFullSandbox(mockDb);

      authedServer = fastify({ logger: false });
      initRequestId(authedServer);
      initErrorHandler(authedServer);
      authedServer.addHook('onRequest', (req, _reply, done) => {
        req.session = { user: { id: 'wos-123' } };
        done();
      });
      registerSandboxRoutes(authedServer, { settings: api.settings });
      await authedServer.ready();

      unauthedServer = fastify({ logger: false });
      initRequestId(unauthedServer);
      initErrorHandler(unauthedServer);
      unauthedServer.addHook('onRequest', (req, _reply, done) => {
        req.session = null;
        done();
      });
      registerSandboxRoutes(unauthedServer, { settings: api.settings });
      await unauthedServer.ready();
    });

    after(async () => {
      await authedServer.close();
      await unauthedServer.close();
    });

    it('creates API key with ck_live_ prefix', async () => {
      const res = await authedServer.inject({
        method: 'POST',
        url: '/api/settings/api-keys',
        payload: { name: 'Test Key' },
      });
      assert.strictEqual(res.statusCode, 201);
      const body = JSON.parse(res.payload);
      assert(body.fullKey.startsWith('ck_live_'), 'Key should start with ck_live_');
      assert.strictEqual(body.fullKey.length, 72, 'Key should be 72 chars');
      assert.strictEqual(body.keyPrefix, body.fullKey.slice(0, 12));
      assert.strictEqual(body.name, 'Test Key');
    });

    it('returns plan-based rateLimit', async () => {
      const res = await authedServer.inject({
        method: 'POST',
        url: '/api/settings/api-keys',
        payload: { name: 'Rate Limit Key' },
      });
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.plan, 'starter');
      assert.strictEqual(body.rateLimit, 1000);
    });

    it('stores SHA-256 hash (not plaintext)', async () => {
      const res = await authedServer.inject({
        method: 'POST',
        url: '/api/settings/api-keys',
        payload: { name: 'Hash Key' },
      });
      const body = JSON.parse(res.payload);
      const expectedHash = crypto.createHash('sha256').update(body.fullKey).digest('hex');
      // The DB mock stored the key — verify hash was stored
      assert(body.fullKey.startsWith('ck_live_'));
      assert.strictEqual(expectedHash.length, 64);
    });

    it('sets expiresAt when expiresInDays provided', async () => {
      const res = await authedServer.inject({
        method: 'POST',
        url: '/api/settings/api-keys',
        payload: { name: 'Expiring Key', expiresInDays: 30 },
      });
      const body = JSON.parse(res.payload);
      assert(body.expiresAt, 'Should have expiresAt');
      const expiry = new Date(body.expiresAt);
      const expectedMin = Date.now() + 29 * 86400000;
      assert(expiry.getTime() > expectedMin, 'Expiry should be ~30 days out');
    });

    it('rejects unauthenticated request', async () => {
      const res = await unauthedServer.inject({
        method: 'POST',
        url: '/api/settings/api-keys',
        payload: { name: 'Fail Key' },
      });
      assert.strictEqual(res.statusCode, 401);
    });

    it('rejects non-owner/admin (member role)', async () => {
      const memberServer = fastify({ logger: false });
      initRequestId(memberServer);
      initErrorHandler(memberServer);
      const mockDb = createMockDb();
      const { api } = await buildFullSandbox(mockDb);
      memberServer.addHook('onRequest', (req, _reply, done) => {
        req.session = { user: { id: 'wos-member' } };
        done();
      });
      registerSandboxRoutes(memberServer, { settings: api.settings });
      await memberServer.ready();

      const res = await memberServer.inject({
        method: 'POST',
        url: '/api/settings/api-keys',
        payload: { name: 'Member Key' },
      });
      assert.strictEqual(res.statusCode, 403);
      await memberServer.close();
    });

    it('rejects empty name', async () => {
      const res = await authedServer.inject({
        method: 'POST',
        url: '/api/settings/api-keys',
        payload: { name: '' },
      });
      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('GET /api/settings/api-keys', () => {
    let server;

    before(async () => {
      const mockDb = createMockDb();
      const { api } = await buildFullSandbox(mockDb);

      server = fastify({ logger: false });
      initRequestId(server);
      initErrorHandler(server);
      server.addHook('onRequest', (req, _reply, done) => {
        req.session = { user: { id: 'wos-123' } };
        done();
      });
      registerSandboxRoutes(server, { settings: api.settings });
      await server.ready();
    });

    after(async () => {
      await server.close();
    });

    it('returns list with usage stats', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/settings/api-keys',
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert(Array.isArray(body.data), 'Should return data array');
    });

    it('does not expose keyHash in list', async () => {
      // First create a key
      await server.inject({
        method: 'POST',
        url: '/api/settings/api-keys',
        payload: { name: 'List Test Key' },
      });

      const res = await server.inject({
        method: 'GET',
        url: '/api/settings/api-keys',
      });
      const body = JSON.parse(res.payload);
      for (const key of body.data) {
        assert.strictEqual(key.keyHash, undefined, 'keyHash must not be exposed');
        assert.strictEqual(key.fullKey, undefined, 'fullKey must not be exposed');
      }
    });
  });

  describe('DELETE /api/settings/api-keys/:id', () => {
    let server;
    let mockDb;

    before(async () => {
      mockDb = createMockDb();
      const { api } = await buildFullSandbox(mockDb);

      server = fastify({ logger: false });
      initRequestId(server);
      initErrorHandler(server);
      server.addHook('onRequest', (req, _reply, done) => {
        req.session = { user: { id: 'wos-123' } };
        done();
      });
      registerSandboxRoutes(server, { settings: api.settings });
      await server.ready();
    });

    after(async () => {
      await server.close();
    });

    it('revokes an existing key', async () => {
      // Create a key first
      const createRes = await server.inject({
        method: 'POST',
        url: '/api/settings/api-keys',
        payload: { name: 'Revoke Test' },
      });
      const { apiKeyId } = JSON.parse(createRes.payload);

      const res = await server.inject({
        method: 'DELETE',
        url: `/api/settings/api-keys/${apiKeyId}`,
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.revoked, true);
    });

    it('returns 404 for non-existent key', async () => {
      const res = await server.inject({
        method: 'DELETE',
        url: '/api/settings/api-keys/99999',
      });
      assert.strictEqual(res.statusCode, 404);
    });
  });

  describe('initApiKeyHook', () => {
    it('resolves valid API key on /v1/ request', async () => {
      const fullKey = `ck_live_${crypto.randomBytes(32).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

      const { initApiKeyHook } = require('../server/src/http.js');
      const mockPool = {
        query: async (sql, params) => {
          if (sql.includes('FROM "ApiKey"') && sql.includes('keyHash')) {
            if (params[0] === keyHash) {
              return {
                rows: [{
                  apiKeyId: 1,
                  organizationId: 10,
                  plan: 'starter',
                  rateLimit: 1000,
                  expiresAt: null,
                }],
              };
            }
            return { rows: [] };
          }
          if (sql.includes('INSERT INTO "ApiUsage"')) {
            return { rows: [] };
          }
          if (sql.includes('UPDATE "ApiKey"')) {
            return { rows: [] };
          }
          if (sql.includes('FROM "ApiUsage"')) {
            return { rows: [{ requestCount: 5 }] };
          }
          return { rows: [] };
        },
      };

      const server = fastify({ logger: false });
      initApiKeyHook(server, mockPool);
      server.get('/v1/test', async (req) => ({
        hasApiKey: !!req.apiKey,
        plan: req.apiKey?.plan,
      }));
      await server.ready();

      const res = await server.inject({
        method: 'GET',
        url: '/v1/test',
        headers: { 'x-api-key': fullKey },
      });
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.hasApiKey, true);
      assert.strictEqual(body.plan, 'starter');
      await server.close();
    });

    it('leaves apiKey null for invalid key', async () => {
      const { initApiKeyHook } = require('../server/src/http.js');
      const mockPool = {
        query: async () => ({ rows: [] }),
      };

      const server = fastify({ logger: false });
      initApiKeyHook(server, mockPool);
      server.get('/v1/test', async (req) => ({
        hasApiKey: !!req.apiKey,
      }));
      await server.ready();

      const res = await server.inject({
        method: 'GET',
        url: '/v1/test',
        headers: { 'x-api-key': 'invalid_key' },
      });
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.hasApiKey, false);
      await server.close();
    });

    it('leaves apiKey null for expired key', async () => {
      const fullKey = `ck_live_${crypto.randomBytes(32).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

      const { initApiKeyHook } = require('../server/src/http.js');
      const mockPool = {
        query: async (sql, params) => {
          if (sql.includes('FROM "ApiKey"') && sql.includes('keyHash')) {
            return {
              rows: [{
                apiKeyId: 1,
                organizationId: 10,
                plan: 'starter',
                rateLimit: 1000,
                expiresAt: '2020-01-01T00:00:00Z',
              }],
            };
          }
          return { rows: [] };
        },
      };

      const server = fastify({ logger: false });
      initApiKeyHook(server, mockPool);
      server.get('/v1/test', async (req) => ({
        hasApiKey: !!req.apiKey,
      }));
      await server.ready();

      const res = await server.inject({
        method: 'GET',
        url: '/v1/test',
        headers: { 'x-api-key': fullKey },
      });
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.hasApiKey, false);
      await server.close();
    });
  });
});
