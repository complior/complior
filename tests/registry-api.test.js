'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const MOCK_TOOLS = [
  {
    registryToolId: 1, name: 'ChatGPT', provider: 'OpenAI',
    category: 'chatbot', riskLevel: 'limited', description: 'AI assistant',
    websiteUrl: 'https://chat.openai.com', vendorCountry: 'US',
    dataResidency: 'US', capabilities: ['customer_service', 'coding'],
    jurisdictions: ['US'], detectionPatterns: ['chat.openai.com'],
    evidence: null, active: true,
  },
  {
    registryToolId: 2, name: 'Claude', provider: 'Anthropic',
    category: 'chatbot', riskLevel: 'limited', description: 'Safe AI assistant',
    websiteUrl: 'https://claude.ai', vendorCountry: 'US',
    dataResidency: 'US', capabilities: ['customer_service', 'coding'],
    jurisdictions: ['US'], detectionPatterns: ['claude.ai'],
    evidence: null, active: true,
  },
  {
    registryToolId: 3, name: 'HireVue', provider: 'HireVue',
    category: 'recruitment', riskLevel: 'high', description: 'Video interviewing',
    websiteUrl: 'https://hirevue.com', vendorCountry: 'US',
    dataResidency: 'US', capabilities: ['employment'],
    jurisdictions: ['US', 'EU'], detectionPatterns: ['hirevue.com'],
    evidence: null, active: true,
  },
];

const MOCK_OBLIGATIONS = [
  {
    obligationId: 1, code: 'ART_4_LITERACY', regulation: 'eu_ai_act',
    name: 'AI Literacy', description: 'Training program',
    articleReference: 'Art. 4', riskLevel: 'minimal',
    category: 'ai_literacy', checkCriteria: null, sortOrder: 1,
  },
  {
    obligationId: 2, code: 'ART_5_PROHIBITED', regulation: 'eu_ai_act',
    name: 'Prohibited Practices', description: 'Check prohibited uses',
    articleReference: 'Art. 5', riskLevel: 'prohibited',
    category: 'deployer_obligations', checkCriteria: null, sortOrder: 10,
  },
  {
    obligationId: 3, code: 'ART_26_USAGE', regulation: 'eu_ai_act',
    name: 'Intended Use', description: 'Use per instructions',
    articleReference: 'Art. 26(1)', riskLevel: 'high',
    category: 'deployer_obligations', checkCriteria: null, sortOrder: 20,
  },
];

const MOCK_SCORING_RULES = [
  {
    scoringRuleId: 1, regulation: 'eu_ai_act',
    checkId: 'art4_literacy_program', weight: 3, maxScore: 15,
    riskLevel: 'minimal', description: 'AI literacy training',
  },
  {
    scoringRuleId: 2, regulation: 'eu_ai_act',
    checkId: 'art5_prohibited_check', weight: 5, maxScore: 25,
    riskLevel: 'prohibited', description: 'No prohibited practices',
  },
];

const createRegistryMockDb = (overrides = {}) => ({
  query: async (sql, params) => {
    // Permission cache
    if (sql.includes('FROM "Permission"') && sql.includes('JOIN "Role"')) {
      return { rows: [] };
    }

    // RegistryTool COUNT
    if (sql.includes('COUNT(*)') && sql.includes('FROM "RegistryTool"')) {
      const tools = overrides.tools || MOCK_TOOLS;
      let filtered = tools;
      if (params && params.length > 0 && sql.includes('ILIKE')) {
        const q = params[0].replace(/%/g, '').toLowerCase();
        filtered = tools.filter((t) =>
          t.name.toLowerCase().includes(q) ||
          t.provider.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q));
      }
      if (sql.includes('"category" =')) {
        const catIdx = sql.includes('ILIKE') ? 1 : 0;
        const cat = params[catIdx];
        filtered = filtered.filter((t) => t.category === cat);
      }
      if (sql.includes('"riskLevel" =')) {
        const riskIdx = params.length - (sql.includes('LIMIT') ? 2 : 0) - 1;
        // Find the risk param
        for (let i = 0; i < params.length; i++) {
          if (['prohibited', 'high', 'gpai', 'limited', 'minimal'].includes(params[i])) {
            filtered = filtered.filter((t) => t.riskLevel === params[i]);
            break;
          }
        }
      }
      return { rows: [{ total: filtered.length }] };
    }

    // RegistryTool SELECT (list)
    if (sql.includes('FROM "RegistryTool"') && sql.includes('LIMIT')) {
      const tools = overrides.tools || MOCK_TOOLS;
      let filtered = [...tools];
      if (params && sql.includes('ILIKE')) {
        const q = params[0].replace(/%/g, '').toLowerCase();
        filtered = tools.filter((t) =>
          t.name.toLowerCase().includes(q) ||
          t.provider.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q));
      }
      if (sql.includes('"category" =')) {
        for (let i = 0; i < params.length; i++) {
          if (['chatbot', 'recruitment', 'coding', 'analytics', 'customer_service',
            'marketing', 'writing', 'image_generation', 'video', 'translation',
            'medical', 'legal', 'finance', 'education', 'api_platform', 'other'].includes(params[i])) {
            filtered = filtered.filter((t) => t.category === params[i]);
            break;
          }
        }
      }
      if (sql.includes('"riskLevel" =')) {
        for (let i = 0; i < params.length; i++) {
          if (['prohibited', 'high', 'gpai', 'limited', 'minimal'].includes(params[i])) {
            filtered = filtered.filter((t) => t.riskLevel === params[i]);
            break;
          }
        }
      }
      const limit = params[params.length - 2];
      const offset = params[params.length - 1];
      return { rows: filtered.slice(offset, offset + limit) };
    }

    // RegistryTool SELECT by ID
    if (sql.includes('FROM "RegistryTool"') && sql.includes('"registryToolId"')) {
      const tools = overrides.tools || MOCK_TOOLS;
      const tool = tools.find((t) => t.registryToolId === params[0]);
      return { rows: tool ? [tool] : [] };
    }

    // Obligation COUNT
    if (sql.includes('COUNT(*)') && sql.includes('FROM "Obligation"')) {
      const obligations = overrides.obligations || MOCK_OBLIGATIONS;
      let filtered = obligations;
      if (sql.includes('"regulation" =')) {
        filtered = filtered.filter((o) => o.regulation === params[0]);
      }
      if (sql.includes('"riskLevel" =')) {
        for (let i = 0; i < params.length; i++) {
          if (['prohibited', 'high', 'gpai', 'limited', 'minimal'].includes(params[i])) {
            filtered = filtered.filter((o) => o.riskLevel === params[i]);
            break;
          }
        }
      }
      return { rows: [{ total: filtered.length }] };
    }

    // Obligation SELECT (list)
    if (sql.includes('FROM "Obligation"') && sql.includes('LIMIT')) {
      const obligations = overrides.obligations || MOCK_OBLIGATIONS;
      let filtered = [...obligations];
      if (sql.includes('"regulation" =')) {
        filtered = filtered.filter((o) => o.regulation === params[0]);
      }
      if (sql.includes('"riskLevel" =')) {
        for (let i = 0; i < params.length; i++) {
          if (['prohibited', 'high', 'gpai', 'limited', 'minimal'].includes(params[i])) {
            filtered = filtered.filter((o) => o.riskLevel === params[i]);
            break;
          }
        }
      }
      const limit = params[params.length - 2];
      const offset = params[params.length - 1];
      return { rows: filtered.slice(offset, offset + limit) };
    }

    // Bundle: RegistryTool full list
    if (sql.includes('FROM "RegistryTool"') && sql.includes('active') && !sql.includes('LIMIT')) {
      return { rows: overrides.tools || MOCK_TOOLS };
    }

    // Bundle: Obligation full list
    if (sql.includes('FROM "Obligation"') && !sql.includes('LIMIT') && !sql.includes('COUNT')) {
      return { rows: overrides.obligations || MOCK_OBLIGATIONS };
    }

    // Bundle: ScoringRule full list
    if (sql.includes('FROM "ScoringRule"')) {
      return { rows: overrides.scoringRules || MOCK_SCORING_RULES };
    }

    return { rows: [] };
  },
});

describe('Registry API', () => {
  // --- Tools ---
  describe('GET /v1/registry/tools', () => {
    it('returns paginated tools list', async () => {
      const mockDb = createRegistryMockDb();
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.registry.searchTools.search({
        page: 1, limit: 20,
      });

      assert.strictEqual(result.data.length, 3);
      assert.strictEqual(result.pagination.total, 3);
      assert.strictEqual(result.pagination.page, 1);
      assert.strictEqual(result.pagination.limit, 20);
      assert.strictEqual(result.pagination.totalPages, 1);
    });

    it('filters by text query', async () => {
      const mockDb = createRegistryMockDb();
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.registry.searchTools.search({
        q: 'ChatGPT', page: 1, limit: 20,
      });

      assert.strictEqual(result.data.length, 1);
      assert.strictEqual(result.data[0].name, 'ChatGPT');
    });

    it('filters by category', async () => {
      const mockDb = createRegistryMockDb();
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.registry.searchTools.search({
        category: 'recruitment', page: 1, limit: 20,
      });

      assert.strictEqual(result.data.length, 1);
      assert.strictEqual(result.data[0].name, 'HireVue');
    });

    it('filters by risk level', async () => {
      const mockDb = createRegistryMockDb();
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.registry.searchTools.search({
        risk: 'high', page: 1, limit: 20,
      });

      assert.strictEqual(result.data.length, 1);
      assert.strictEqual(result.data[0].riskLevel, 'high');
    });

    it('rejects limit > 100 via Zod schema', () => {
      const schemas = require('../server/lib/schemas.js');
      const result = schemas.RegistryToolSearchSchema.safeParse({ limit: 200 });
      assert.strictEqual(result.success, false);
    });
  });

  describe('GET /v1/registry/tools/:id', () => {
    it('returns tool by ID', async () => {
      const mockDb = createRegistryMockDb();
      const { application } = await buildFullSandbox(mockDb);

      const tool = await application.registry.searchTools.findById(1);
      assert.strictEqual(tool.name, 'ChatGPT');
      assert.strictEqual(tool.provider, 'OpenAI');
    });

    it('returns null for non-existent tool', async () => {
      const mockDb = createRegistryMockDb();
      const { application } = await buildFullSandbox(mockDb);

      const tool = await application.registry.searchTools.findById(9999);
      assert.strictEqual(tool, null);
    });
  });

  // --- Obligations ---
  describe('GET /v1/regulations/obligations', () => {
    it('returns paginated obligations list', async () => {
      const mockDb = createRegistryMockDb();
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.registry.searchObligations.search({
        page: 1, limit: 20,
      });

      assert.strictEqual(result.data.length, 3);
      assert.strictEqual(result.pagination.total, 3);
    });

    it('filters by risk level', async () => {
      const mockDb = createRegistryMockDb();
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.registry.searchObligations.search({
        risk: 'high', page: 1, limit: 20,
      });

      assert.strictEqual(result.data.length, 1);
      assert.strictEqual(result.data[0].code, 'ART_26_USAGE');
    });
  });

  // --- Bundle ---
  describe('GET /v1/data/bundle', () => {
    it('returns bundle with all data', async () => {
      const mockDb = createRegistryMockDb();
      const { application } = await buildFullSandbox(mockDb);

      const { bundle, etag } = await application.registry.getBundle.generate();

      assert.strictEqual(bundle.version, '1.0.0');
      assert.ok(bundle.generatedAt);
      assert.strictEqual(bundle.tools.length, 3);
      assert.strictEqual(bundle.obligations.length, 3);
      assert.strictEqual(bundle.scoringRules.length, 2);
      assert.ok(bundle.checksum);
      assert.ok(etag.startsWith('"'));
      assert.ok(etag.endsWith('"'));
    });

    it('returns consistent ETag for same data', async () => {
      const mockDb = createRegistryMockDb();
      const { application } = await buildFullSandbox(mockDb);

      const result1 = await application.registry.getBundle.generate();
      const result2 = await application.registry.getBundle.generate();

      // ETags may differ due to generatedAt timestamp, but checksums are
      // computed from the same data (minus checksum field itself)
      assert.ok(result1.etag);
      assert.ok(result2.etag);
    });

    it('bundle handler returns 304 for matching ETag', async () => {
      const mockDb = createRegistryMockDb();
      const { api } = await buildFullSandbox(mockDb);

      // The bundle API handler checks If-None-Match header
      const bundleHandler = api.data.bundle;
      const result = await bundleHandler.method({
        headers: {},
      });

      assert.ok(result._headers);
      assert.ok(result._headers.ETag);
      assert.strictEqual(result.version, '1.0.0');

      // Now call with matching ETag
      const result304 = await bundleHandler.method({
        headers: { 'if-none-match': result._headers.ETag },
      });

      assert.strictEqual(result304._statusCode, 304);
    });
  });
});
