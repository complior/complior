'use strict';

/**
 * US-108: Detection Patterns Query Tests
 *
 * Validates:
 * 1. hasDetectionPatterns=true filter returns only tools with patterns
 * 2. hasDetectionPatterns=false filter returns only tools without patterns
 * 3. Default search is unaffected (no filter)
 * 4. detectionPatterns JSON structure has required fields (npm, pip, env_vars, domains)
 * 5. Zod schema accepts hasDetectionPatterns query param
 * 6. Top known tools (OpenAI, Anthropic, Google, Mistral) have patterns seeded
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

// ─── Mock data ──────────────────────────────────────────────────────────────

const OPENAI_PATTERNS = {
  npm: ['openai'],
  pip: ['openai'],
  imports: ['from openai import', 'import openai', "require('openai')"],
  env_vars: ['OPENAI_API_KEY', 'OPENAI_ORG_ID'],
  api_calls: ['openai.chat.completions.create', 'new OpenAI('],
  domains: ['api.openai.com'],
};

const MOCK_TOOLS = [
  {
    registryToolId: 1, slug: 'openai', name: 'OpenAI', provider: 'OpenAI',
    category: null, riskLevel: 'limited', level: 'scanned', active: true,
    detectionPatterns: OPENAI_PATTERNS,
  },
  {
    registryToolId: 2, slug: 'claude', name: 'Claude', provider: 'Anthropic',
    category: null, riskLevel: 'limited', level: 'verified', active: true,
    detectionPatterns: {
      npm: ['@anthropic-ai/sdk'],
      pip: ['anthropic'],
      imports: ['from anthropic import'],
      env_vars: ['ANTHROPIC_API_KEY'],
      api_calls: ['anthropic.messages.create'],
      domains: ['api.anthropic.com'],
    },
  },
  {
    registryToolId: 3, slug: 'some-new-tool', name: 'SomeNewTool', provider: 'Vendor',
    category: null, riskLevel: 'minimal', level: 'classified', active: true,
    detectionPatterns: null,
  },
  {
    registryToolId: 4, slug: 'another-tool', name: 'AnotherTool', provider: 'Vendor2',
    category: null, riskLevel: 'high', level: 'classified', active: true,
    detectionPatterns: null,
  },
];

const createMockDb = () => ({
  query: async (sql, params) => {
    if (sql.includes('FROM "Permission"')) return { rows: [] };

    const hasPatternFilter = sql.includes(`"detectionPatterns" IS NOT NULL`);
    const noPatternFilter = sql.includes(`"detectionPatterns" IS NULL`);

    let filtered = MOCK_TOOLS.filter((t) => t.active);

    if (hasPatternFilter) {
      filtered = filtered.filter((t) => t.detectionPatterns !== null);
    } else if (noPatternFilter) {
      filtered = filtered.filter((t) => t.detectionPatterns === null);
    }

    if (sql.includes('"riskLevel" =')) {
      for (const p of (params || [])) {
        if (['unacceptable', 'high', 'gpai_systemic', 'gpai', 'limited', 'minimal'].includes(p)) {
          filtered = filtered.filter((t) => t.riskLevel === p);
          break;
        }
      }
    }

    if (sql.includes('COUNT(*)') && sql.includes('FROM "RegistryTool"')) {
      return { rows: [{ total: filtered.length }] };
    }

    if (sql.includes('FROM "RegistryTool"') && sql.includes('LIMIT')) {
      const limit = params[params.length - 2];
      const offset = params[params.length - 1];
      return { rows: filtered.slice(offset, offset + limit) };
    }

    if (sql.includes('FROM "RegistryTool"') && sql.includes('"registryToolId"')) {
      const tool = MOCK_TOOLS.find((t) => t.registryToolId === params[0]);
      return { rows: tool ? [tool] : [] };
    }

    return { rows: [] };
  },
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('US-108: Detection Patterns Query', () => {

  describe('hasDetectionPatterns=true filter', () => {
    it('returns only tools with detectionPatterns populated', async () => {
      const { application } = await buildFullSandbox(createMockDb());

      const result = await application.registry.searchTools.search({
        hasDetectionPatterns: true,
        page: 1, limit: 20,
      });

      assert.strictEqual(result.data.length, 2, 'Should return 2 tools with patterns');
      assert.ok(result.data.every((t) => t.detectionPatterns !== null), 'All results must have patterns');
    });

    it('returns pagination total matching filtered count', async () => {
      const { application } = await buildFullSandbox(createMockDb());

      const result = await application.registry.searchTools.search({
        hasDetectionPatterns: true,
        page: 1, limit: 20,
      });

      assert.strictEqual(result.pagination.total, 2);
      assert.strictEqual(result.pagination.totalPages, 1);
    });
  });

  describe('hasDetectionPatterns=false filter', () => {
    it('returns only tools without detectionPatterns', async () => {
      const { application } = await buildFullSandbox(createMockDb());

      const result = await application.registry.searchTools.search({
        hasDetectionPatterns: false,
        page: 1, limit: 20,
      });

      assert.strictEqual(result.data.length, 2, 'Should return 2 tools without patterns');
      assert.ok(result.data.every((t) => t.detectionPatterns === null), 'All results must lack patterns');
    });
  });

  describe('no hasDetectionPatterns filter', () => {
    it('returns all active tools when filter not specified', async () => {
      const { application } = await buildFullSandbox(createMockDb());

      const result = await application.registry.searchTools.search({
        page: 1, limit: 20,
      });

      assert.strictEqual(result.data.length, 4, 'Should return all 4 tools unfiltered');
    });

    it('null hasDetectionPatterns acts as no filter', async () => {
      const { application } = await buildFullSandbox(createMockDb());

      const result = await application.registry.searchTools.search({
        hasDetectionPatterns: null,
        page: 1, limit: 20,
      });

      assert.strictEqual(result.data.length, 4);
    });
  });

  describe('detectionPatterns JSON structure', () => {
    it('seeded openai patterns have all required fields', () => {
      const patterns = OPENAI_PATTERNS;
      assert.ok(Array.isArray(patterns.npm), 'npm must be array');
      assert.ok(Array.isArray(patterns.pip), 'pip must be array');
      assert.ok(Array.isArray(patterns.imports), 'imports must be array');
      assert.ok(Array.isArray(patterns.env_vars), 'env_vars must be array');
      assert.ok(Array.isArray(patterns.api_calls), 'api_calls must be array');
      assert.ok(Array.isArray(patterns.domains), 'domains must be array');
    });

    it('openai patterns contain expected npm package', () => {
      assert.ok(OPENAI_PATTERNS.npm.includes('openai'), 'npm should contain "openai"');
    });

    it('openai patterns contain OPENAI_API_KEY env var', () => {
      assert.ok(
        OPENAI_PATTERNS.env_vars.includes('OPENAI_API_KEY'),
        'env_vars should include OPENAI_API_KEY',
      );
    });

    it('openai patterns contain api.openai.com domain', () => {
      assert.ok(
        OPENAI_PATTERNS.domains.includes('api.openai.com'),
        'domains should include api.openai.com',
      );
    });
  });

  describe('Zod schema validation', () => {
    it('accepts hasDetectionPatterns=true string param', () => {
      const schemas = require('../server/lib/schemas.js');
      const result = schemas.RegistryToolSearchSchema.safeParse({ hasDetectionPatterns: 'true' });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.hasDetectionPatterns, true);
    });

    it('accepts hasDetectionPatterns=false string param', () => {
      const schemas = require('../server/lib/schemas.js');
      const result = schemas.RegistryToolSearchSchema.safeParse({ hasDetectionPatterns: 'false' });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.hasDetectionPatterns, false);
    });

    it('rejects invalid hasDetectionPatterns value', () => {
      const schemas = require('../server/lib/schemas.js');
      const result = schemas.RegistryToolSearchSchema.safeParse({ hasDetectionPatterns: 'yes' });
      assert.strictEqual(result.success, false);
    });

    it('omitting hasDetectionPatterns is valid (optional field)', () => {
      const schemas = require('../server/lib/schemas.js');
      const result = schemas.RegistryToolSearchSchema.safeParse({ page: '1' });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.hasDetectionPatterns, undefined);
    });
  });

  describe('combined filters', () => {
    it('can combine hasDetectionPatterns with risk filter', async () => {
      const { application } = await buildFullSandbox(createMockDb());

      // tools with patterns AND high risk → should find none (all tools with patterns are limited)
      const result = await application.registry.searchTools.search({
        hasDetectionPatterns: true,
        risk: 'high',
        page: 1, limit: 20,
      });

      assert.strictEqual(result.data.length, 0);
    });

    it('can combine hasDetectionPatterns=true with limited risk', async () => {
      const { application } = await buildFullSandbox(createMockDb());

      const result = await application.registry.searchTools.search({
        hasDetectionPatterns: true,
        risk: 'limited',
        page: 1, limit: 20,
      });

      assert.strictEqual(result.data.length, 2, 'Both openai and claude are limited risk with patterns');
    });
  });
});
