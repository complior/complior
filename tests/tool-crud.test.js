'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { initRequestId, initErrorHandler, registerSandboxRoutes } = require('../server/src/http.js');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const MOCK_USER = {
  id: 1,
  organizationId: 10,
  email: 'test@example.com',
  fullName: 'Test User',
  active: true,
  roles: ['owner'],
  locale: 'en',
};

const MOCK_CATALOG_ENTRY = {
  aIToolCatalogId: 100,
  name: 'ChatGPT',
  vendor: 'OpenAI',
  vendorCountry: 'US',
  description: 'AI assistant',
  websiteUrl: 'https://chat.openai.com',
  dataResidency: 'US',
  defaultRiskLevel: 'limited',
  active: true,
};

const createdTools = [];
let nextId = 1;

const createMockDb = () => {
  const permissions = [
    { role: 'owner', resource: 'AITool', action: 'manage' },
    { role: 'member', resource: 'AITool', action: 'create' },
    { role: 'member', resource: 'AITool', action: 'read' },
  ];

  return {
    query: async (sql, params) => {
      // Permissions query
      if (sql.includes('FROM "Permission"')) {
        return { rows: permissions };
      }
      // User query (syncOnLogin)
      if (sql.includes('FROM "User"') && sql.includes('oryId')) {
        return { rows: [MOCK_USER] };
      }
      // Update lastLoginAt
      if (sql.includes('UPDATE "User"')) {
        return { rows: [], rowCount: 1 };
      }
      // Catalog query
      if (sql.includes('FROM "AIToolCatalog"')) {
        if (params?.[0] === 100) return { rows: [MOCK_CATALOG_ENTRY] };
        return { rows: [] };
      }
      // Count
      if (sql.includes('COUNT')) {
        return { rows: [{ total: createdTools.length }] };
      }
      // INSERT AITool
      if (sql.includes('INSERT INTO "AITool"')) {
        const id = nextId++;
        const tool = { id, ...params.reduce((acc, v, i) => { acc[`col${i}`] = v; return acc; }, {}) };
        createdTools.push(tool);
        return { rows: [{ id, ...tool }] };
      }
      // INSERT AuditLog
      if (sql.includes('INSERT INTO "AuditLog"')) {
        return { rows: [{ auditLogId: 1 }] };
      }
      // SELECT AITool by PK
      if (sql.includes('FROM "AITool"') && (sql.includes('"aIToolId"') || sql.includes('"id"'))) {
        return { rows: createdTools.filter((t) => (t.id || t.aIToolId) === params?.[0]) };
      }
      // SELECT all tools
      if (sql.includes('FROM "AITool"')) {
        return { rows: createdTools };
      }
      // UPDATE
      if (sql.includes('UPDATE "AITool"')) {
        return { rows: createdTools.length > 0 ? [createdTools[0]] : [], rowCount: 1 };
      }
      // DELETE
      if (sql.includes('DELETE FROM "AITool"')) {
        return { rowCount: 1 };
      }
      return { rows: [] };
    },
  };
};

describe('AI Tool CRUD API', () => {
  let server;

  before(async () => {
    const mockDb = createMockDb();
    const { api } = await buildFullSandbox(mockDb);

    server = fastify({ logger: false });
    initRequestId(server);
    initErrorHandler(server);

    // Inject mock session
    server.addHook('onRequest', (req, _reply, done) => {
      req.session = {
        identity: {
          id: 'ory-123',
          traits: { email: MOCK_USER.email, name: { first: 'Test', last: 'User' } },
        },
      };
      done();
    });

    registerSandboxRoutes(server, { tools: api.tools });
    await server.ready();
  });

  after(async () => {
    await server.close();
  });

  describe('POST /api/tools', () => {
    it('creates a new AI tool', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/tools',
        payload: { name: 'Test Tool', vendorName: 'Test Vendor' },
      });
      assert.strictEqual(res.statusCode, 201);
      const body = JSON.parse(res.payload);
      assert(body.id);
    });

    it('rejects missing name', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/tools',
        payload: { vendorName: 'Test' },
      });
      assert.strictEqual(res.statusCode, 400);
    });

    it('rejects missing vendorName', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/tools',
        payload: { name: 'Test' },
      });
      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('PATCH /api/tools/:id', () => {
    it('updates tool with step 2 data', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: '/api/tools/1',
        payload: {
          step: 2,
          purpose: 'Customer support chatbot',
          domain: 'customer_service',
        },
      });
      assert.strictEqual(res.statusCode, 200);
    });

    it('rejects missing step', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: '/api/tools/1',
        payload: { purpose: 'test' },
      });
      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('GET /api/tools', () => {
    it('returns paginated tool list', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tools',
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert(body.data);
      assert(body.pagination);
    });

    it('accepts filter parameters', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tools?riskLevel=high&domain=employment',
      });
      assert.strictEqual(res.statusCode, 200);
    });

    it('rejects invalid pageSize', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tools?pageSize=500',
      });
      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('GET /api/tools/:id', () => {
    it('returns tool detail with classification and requirements', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tools/1',
      });
      assert.strictEqual(res.statusCode, 200);
    });
  });

  describe('DELETE /api/tools/:id', () => {
    it('deletes a tool', async () => {
      const res = await server.inject({
        method: 'DELETE',
        url: '/api/tools/1',
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.success, true);
    });
  });
});
