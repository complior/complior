'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { initRequestId, initErrorHandler, initRoutes } = require('../src/http.js');
const createCatalogSearch = require('../src/application/inventory/searchCatalog.js');
const createCatalogHandlers = require('../src/api/tools/catalog.js');

const MOCK_CATALOG = [
  {
    id: 1, name: 'ChatGPT', vendor: 'OpenAI', vendorCountry: 'US',
    category: 'chatbot', defaultRiskLevel: 'limited', active: true,
    domains: ['customer_service'], description: 'General-purpose AI assistant',
    websiteUrl: 'https://chat.openai.com', dataResidency: 'US',
  },
  {
    id: 2, name: 'Claude', vendor: 'Anthropic', vendorCountry: 'US',
    category: 'chatbot', defaultRiskLevel: 'limited', active: true,
    domains: ['coding'], description: 'AI assistant focused on safety',
    websiteUrl: 'https://claude.ai', dataResidency: 'US',
  },
  {
    id: 3, name: 'HireVue', vendor: 'HireVue', vendorCountry: 'US',
    category: 'recruitment', defaultRiskLevel: 'high', active: true,
    domains: ['employment'], description: 'AI-powered video interviewing',
    websiteUrl: 'https://hirevue.com', dataResidency: 'US',
  },
];

const createMockDb = () => ({
  query: async (sql, params) => {
    if (sql.includes('COUNT')) {
      let filtered = MOCK_CATALOG;
      if (params.some((p) => typeof p === 'string' && p.startsWith('%'))) {
        const q = params[0].replace(/%/g, '').toLowerCase();
        filtered = filtered.filter((t) =>
          t.name.toLowerCase().includes(q) || t.vendor.toLowerCase().includes(q),
        );
      }
      if (sql.includes('"category"')) {
        const cat = params.find((p) => MOCK_CATALOG.some((t) => t.category === p));
        if (cat) filtered = filtered.filter((t) => t.category === cat);
      }
      return { rows: [{ total: filtered.length }] };
    }
    if (sql.includes('FROM "AIToolCatalog" WHERE "aIToolCatalogId"')) {
      const id = params[0];
      const tool = MOCK_CATALOG.find((t) => t.id === id);
      return { rows: tool ? [tool] : [] };
    }
    // Search query
    let filtered = [...MOCK_CATALOG];
    return { rows: filtered };
  },
});

describe('AI Tool Catalog API', () => {
  let server;

  before(async () => {
    const mockDb = createMockDb();
    const catalogSearch = createCatalogSearch(mockDb);
    const catalogRoutes = createCatalogHandlers(catalogSearch);

    server = fastify({ logger: false });
    initRequestId(server);
    initErrorHandler(server);
    initRoutes(server, catalogRoutes);
    await server.ready();
  });

  after(async () => {
    await server.close();
  });

  describe('GET /api/tools/catalog/search', () => {
    it('returns paginated catalog results', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tools/catalog/search',
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert(body.data);
      assert(body.pagination);
      assert.strictEqual(body.pagination.page, 1);
    });

    it('accepts search query parameter', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tools/catalog/search?q=ChatGPT',
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert(body.data);
    });

    it('accepts category filter', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tools/catalog/search?category=chatbot',
      });
      assert.strictEqual(res.statusCode, 200);
    });

    it('accepts risk level filter', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tools/catalog/search?riskLevel=high',
      });
      assert.strictEqual(res.statusCode, 200);
    });

    it('accepts pagination parameters', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tools/catalog/search?page=2&pageSize=10',
      });
      assert.strictEqual(res.statusCode, 200);
    });

    it('rejects pageSize over 100', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tools/catalog/search?pageSize=500',
      });
      assert.strictEqual(res.statusCode, 400);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/tools/catalog/:id', () => {
    it('returns single catalog entry', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tools/catalog/1',
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.name, 'ChatGPT');
    });

    it('returns 404 for non-existent entry', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/tools/catalog/9999',
      });
      assert.strictEqual(res.statusCode, 404);
    });
  });
});
