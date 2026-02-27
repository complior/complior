'use strict';

/**
 * E2E Manual Test — Real DB, Real Server, Real HTTP
 *
 * Boots Fastify + VM sandbox against live PostgreSQL.
 * Tests every endpoint created during Sprint 7 migration.
 *
 * Run: node tests/e2e-manual.test.js
 * Requires: DATABASE_URL in .env
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fastify = require('fastify');
const { Pool } = require('pg');
const zod = require('zod');

const { loadApplication } = require('../server/src/loader.js');
const errors = require('../server/lib/errors.js');
const schemas = require('../server/lib/schemas.js');
const { registerSandboxRoutes, initHealth, initApiKeyHook, initErrorHandler } = require('../server/src/http.js');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set — skipping E2E tests');
  process.exit(0);
}

// ─── Server Setup ──────────────────────────────────────────────────────────

let server;
let db;
let baseUrl;

const APPLICATION_PATH = path.join(__dirname, '..', 'app');

const boot = async () => {
  db = new Pool({ connectionString: DATABASE_URL });

  // Verify DB is alive
  await db.query('SELECT 1');

  // Noop infrastructure stubs (not needed for public endpoints)
  const noop = Object.freeze({});
  const workos = { getAuthorizationURL: () => '', getProfileAndToken: async () => null };
  const brevo = { sendTransactional: async () => ({ messageId: 'noop' }) };
  const gotenberg = { convertHtmlToPdf: async () => Buffer.alloc(0) };
  const s3 = { upload: async () => ({}), download: async () => null, getSignedUrl: async () => '' };
  const stripe = { createCheckoutSession: async () => ({}), retrieveSession: async () => null, constructEvent: () => null };

  const config = {
    server: { port: 0, host: '127.0.0.1' },
    database: {},
    workos: {},
    brevo: {},
    gotenberg: {},
    s3: {},
    log: { level: 'silent' },
    stripe: {},
    registry: {},
  };

  const appSandbox = await loadApplication(APPLICATION_PATH, {
    console, db, config, errors, schemas, zod,
    workos, brevo, gotenberg, s3, stripe,
  });

  server = fastify({ logger: false });
  await server.register(require('@fastify/cookie'));

  initHealth(server);
  initErrorHandler(server);
  initApiKeyHook(server, db);
  registerSandboxRoutes(server, appSandbox.api);

  await server.listen({ port: 0, host: '127.0.0.1' });
  baseUrl = `http://127.0.0.1:${server.server.address().port}`;
  console.log(`\n🚀 E2E server started at ${baseUrl}\n`);
};

const shutdown = async () => {
  if (server) await server.close();
  if (db) await db.end();
  console.log('\n🛑 E2E server stopped\n');
};

// ─── HTTP Helper ────────────────────────────────────────────────────────────

const get = async (path) => {
  const res = await fetch(`${baseUrl}${path}`);
  const body = await res.json();
  return { status: res.status, body };
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('E2E: Sprint 7 Migration — Full Stack', () => {

  before(async () => {
    await boot();
  });

  after(async () => {
    await shutdown();
  });

  // ──────────────── /health ────────────────

  describe('GET /health', () => {
    it('returns status ok', async () => {
      const { status, body } = await get('/health');
      assert.strictEqual(status, 200);
      assert.ok(body.status === 'ok' || body.status === 'degraded');
      assert.ok(body.timestamp);
    });
  });

  // ──────────────── /v1/registry/tools ────────────────

  describe('GET /v1/registry/tools', () => {
    it('returns paginated list of tools', async () => {
      const { status, body } = await get('/v1/registry/tools?limit=5');
      assert.strictEqual(status, 200);
      assert.ok(Array.isArray(body.data), 'data must be array');
      assert.ok(body.pagination, 'pagination must exist');
      assert.ok(body.pagination.total > 0, `total should be > 0, got ${body.pagination.total}`);
      assert.ok(body.data.length <= 5, 'limit=5 should return ≤5');
      console.log(`   ✅ ${body.pagination.total} tools in registry`);
    });

    it('each tool has required fields', async () => {
      const { body } = await get('/v1/registry/tools?limit=3');
      for (const tool of body.data) {
        assert.ok(tool.registryToolId, 'registryToolId required');
        assert.ok(tool.slug, `slug required for tool ${tool.registryToolId}`);
        assert.ok(tool.name, `name required for ${tool.slug}`);
      }
    });

    it('search by q parameter works', async () => {
      const { body } = await get('/v1/registry/tools?q=openai&limit=5');
      assert.strictEqual(body.pagination.total > 0, true, 'openai search should find results');
      console.log(`   ✅ "openai" search: ${body.pagination.total} results`);
    });

    it('filter by category works', async () => {
      const { body } = await get('/v1/registry/tools?category=chatbot&limit=5');
      for (const tool of body.data) {
        assert.strictEqual(tool.category, 'chatbot', `${tool.slug} should be chatbot`);
      }
      console.log(`   ✅ chatbot filter: ${body.pagination.total} results`);
    });

    it('filter by riskLevel works', async () => {
      const { body } = await get('/v1/registry/tools?risk=high&limit=5');
      for (const tool of body.data) {
        assert.strictEqual(tool.riskLevel, 'high', `${tool.slug} should be high risk`);
      }
      console.log(`   ✅ high risk filter: ${body.pagination.total} results`);
    });

    it('hasDetectionPatterns=true filter works', async () => {
      const { body } = await get('/v1/registry/tools?hasDetectionPatterns=true&limit=5');
      assert.ok(body.pagination.total > 0, 'should have tools with detection patterns');
      for (const tool of body.data) {
        assert.ok(tool.detectionPatterns, `${tool.slug} should have detectionPatterns`);
      }
      console.log(`   ✅ with detectionPatterns: ${body.pagination.total} tools`);
    });

    it('hasDetectionPatterns=false filter works', async () => {
      const { body } = await get('/v1/registry/tools?hasDetectionPatterns=false&limit=3');
      for (const tool of body.data) {
        assert.ok(!tool.detectionPatterns || tool.detectionPatterns === null,
          `${tool.slug} should NOT have detectionPatterns`);
      }
    });

    it('pagination works (page 2)', async () => {
      const { body: p1 } = await get('/v1/registry/tools?limit=2&page=1');
      const { body: p2 } = await get('/v1/registry/tools?limit=2&page=2');
      assert.strictEqual(p1.pagination.page, 1);
      assert.strictEqual(p2.pagination.page, 2);
      assert.ok(p1.data[0].slug !== p2.data[0].slug, 'pages should have different tools');
    });
  });

  // ──────────────── /v1/registry/tools/:id ────────────────

  describe('GET /v1/registry/tools/:id', () => {
    it('returns a specific tool by ID', async () => {
      // First get any tool ID
      const { body: list } = await get('/v1/registry/tools?limit=1');
      const toolId = list.data[0].registryToolId;

      const { status, body } = await get(`/v1/registry/tools/${toolId}`);
      assert.strictEqual(status, 200);
      assert.strictEqual(body.registryToolId, toolId);
      assert.ok(body.slug);
      assert.ok(body.name);
      console.log(`   ✅ tool/${toolId}: ${body.name} (${body.slug})`);
    });

    it('returns 404 for non-existent tool', async () => {
      const { status } = await get('/v1/registry/tools/999999');
      assert.strictEqual(status, 404);
    });
  });

  // ──────────────── /v1/registry/stats ────────────────

  describe('GET /v1/registry/stats', () => {
    it('returns registry statistics', async () => {
      const { status, body } = await get('/v1/registry/stats');
      assert.strictEqual(status, 200);
      assert.ok(typeof body.totalTools === 'number', 'totalTools must be number');
      assert.ok(body.totalTools > 0, `totalTools should be > 0, got ${body.totalTools}`);
      assert.ok(body.byRiskLevel, 'byRiskLevel must exist');
      assert.ok(body.byLevel, 'byLevel must exist');
      assert.ok(typeof body.withDetectionPatterns === 'number');
      assert.ok(Array.isArray(body.topCategories));
      console.log(`   ✅ totalTools: ${body.totalTools}`);
      console.log(`   ✅ byLevel: verified=${body.byLevel.verified}, scanned=${body.byLevel.scanned}, classified=${body.byLevel.classified}`);
      console.log(`   ✅ withDetectionPatterns: ${body.withDetectionPatterns}`);
    });

    it('byRiskLevel has expected keys', async () => {
      const { body } = await get('/v1/registry/stats');
      const expected = ['unacceptable', 'high', 'gpai_systemic', 'gpai', 'limited', 'minimal'];
      for (const key of expected) {
        assert.ok(typeof body.byRiskLevel[key] === 'number', `byRiskLevel.${key} must be number`);
      }
    });

    it('byLevel sums equal totalTools', async () => {
      const { body } = await get('/v1/registry/stats');
      const levelSum = body.byLevel.verified + body.byLevel.scanned + body.byLevel.classified;
      assert.strictEqual(levelSum, body.totalTools,
        `byLevel sum (${levelSum}) should equal totalTools (${body.totalTools})`);
    });
  });

  // ──────────────── /v1/regulations/meta ────────────────

  describe('GET /v1/regulations/meta', () => {
    it('returns EU AI Act metadata', async () => {
      const { status, body } = await get('/v1/regulations/meta');
      assert.strictEqual(status, 200);
      assert.ok(body.jurisdictionId, 'jurisdictionId required');
      assert.ok(body.officialName, 'officialName required');
      assert.ok(body.jurisdiction, 'jurisdiction required');
      assert.ok(body.status, 'status required');
      console.log(`   ✅ ${body.jurisdictionId}: "${body.officialName}"`);
      console.log(`   ✅ status: ${body.status}, jurisdiction: ${body.jurisdiction}`);
    });

    it('returns riskLevels and keyDefinitions as objects', async () => {
      const { body } = await get('/v1/regulations/meta');
      assert.ok(body.riskLevels, 'riskLevels should exist');
      assert.ok(body.keyDefinitions, 'keyDefinitions should exist');
    });

    it('returns 404 for unknown jurisdiction', async () => {
      const { status } = await get('/v1/regulations/meta?jurisdictionId=nonexistent');
      assert.strictEqual(status, 404);
    });
  });

  // ──────────────── /v1/regulations/timeline ────────────────

  describe('GET /v1/regulations/timeline', () => {
    it('returns timeline events', async () => {
      const { status, body } = await get('/v1/regulations/timeline');
      assert.strictEqual(status, 200);
      assert.ok(body.jurisdictionId);
      assert.ok(typeof body.total === 'number');
      assert.ok(Array.isArray(body.events));
      assert.ok(body.total > 0, `should have events, got ${body.total}`);
      console.log(`   ✅ ${body.total} timeline events for ${body.jurisdictionId}`);
    });

    it('events have required fields', async () => {
      const { body } = await get('/v1/regulations/timeline');
      for (const event of body.events.slice(0, 3)) {
        assert.ok(event.eventId, 'eventId required');
        assert.ok(event.phase, 'phase required');
        assert.ok(event.date, 'date required');
        assert.ok(event.status, 'status required');
      }
    });

    it('events are ordered by date', async () => {
      const { body } = await get('/v1/regulations/timeline');
      for (let i = 1; i < body.events.length; i++) {
        const prev = body.events[i - 1].date;
        const curr = body.events[i].date;
        assert.ok(prev <= curr, `Events should be ordered: ${prev} <= ${curr}`);
      }
    });
  });

  // ──────────────── /v1/regulations/scoring ────────────────

  describe('GET /v1/regulations/scoring', () => {
    it('returns scoring rules', async () => {
      const { status, body } = await get('/v1/regulations/scoring');
      assert.strictEqual(status, 200);
      assert.ok(body.jurisdictionId);
      assert.ok(typeof body.totalRules === 'number');
      assert.ok(typeof body.maxPossibleScore === 'number');
      assert.ok(body.byRiskLevel);
      assert.ok(Array.isArray(body.rules));
      console.log(`   ✅ ${body.totalRules} scoring rules, maxScore: ${body.maxPossibleScore}`);
    });

    it('rules have required structure', async () => {
      const { body } = await get('/v1/regulations/scoring');
      for (const rule of body.rules.slice(0, 3)) {
        assert.ok(rule.checkId, 'checkId required');
        assert.ok(typeof rule.weight === 'number', 'weight must be number');
        assert.ok(typeof rule.maxScore === 'number', 'maxScore must be number');
      }
    });

    it('byRiskLevel counts match rules array', async () => {
      const { body } = await get('/v1/regulations/scoring');
      let sumFromAggr = 0;
      for (const val of Object.values(body.byRiskLevel)) {
        sumFromAggr += val.count;
      }
      assert.strictEqual(sumFromAggr, body.totalRules,
        `byRiskLevel count sum (${sumFromAggr}) should equal totalRules (${body.totalRules})`);
    });
  });

  // ──────────────── Detection Patterns (deep check) ────────────────

  describe('Detection Patterns — structure validation', () => {
    it('tools with detectionPatterns have valid JSON structure', async () => {
      const { body } = await get('/v1/registry/tools?hasDetectionPatterns=true&limit=10');

      let checked = 0;
      for (const tool of body.data) {
        const dp = tool.detectionPatterns;
        if (!dp) continue;
        assert.ok(Array.isArray(dp.npm), `${tool.slug}: npm must be array`);
        assert.ok(Array.isArray(dp.pip), `${tool.slug}: pip must be array`);
        assert.ok(Array.isArray(dp.imports), `${tool.slug}: imports must be array`);
        assert.ok(Array.isArray(dp.env_vars), `${tool.slug}: env_vars must be array`);
        assert.ok(Array.isArray(dp.api_calls), `${tool.slug}: api_calls must be array`);
        assert.ok(Array.isArray(dp.domains), `${tool.slug}: domains must be array`);
        checked++;
      }
      assert.ok(checked > 0, 'Should have checked at least 1 tool');
      console.log(`   ✅ ${checked} tools validated with correct detectionPatterns structure`);
    });
  });

  // ──────────────── Cross-endpoint consistency ────────────────

  describe('Cross-endpoint consistency', () => {
    it('stats.totalTools matches tools pagination.total', async () => {
      const { body: stats } = await get('/v1/registry/stats');
      const { body: tools } = await get('/v1/registry/tools?limit=1');

      assert.strictEqual(stats.totalTools, tools.pagination.total,
        `stats.totalTools (${stats.totalTools}) must equal tools.pagination.total (${tools.pagination.total})`);
    });

    it('stats.withDetectionPatterns matches hasDetectionPatterns filter', async () => {
      const { body: stats } = await get('/v1/registry/stats');
      const { body: filtered } = await get('/v1/registry/tools?hasDetectionPatterns=true&limit=1');

      assert.strictEqual(stats.withDetectionPatterns, filtered.pagination.total,
        `stats (${stats.withDetectionPatterns}) must match filter (${filtered.pagination.total})`);
    });
  });

  // ──────────────── Data quality checks ────────────────

  describe('Data quality — migration completeness', () => {
    it('registry has ≥4,900 tools', async () => {
      const { body } = await get('/v1/registry/stats');
      assert.ok(body.totalTools >= 4900,
        `Expected ≥4900 tools, got ${body.totalTools}`);
    });

    it('registry has tools at all 3 levels', async () => {
      const { body } = await get('/v1/registry/stats');
      assert.ok(body.byLevel.verified > 0, 'should have verified tools');
      assert.ok(body.byLevel.scanned > 0, 'should have scanned tools');
      assert.ok(body.byLevel.classified > 0, 'should have classified tools');
    });

    it('registry has detection patterns for ≥50 tools', async () => {
      const { body } = await get('/v1/registry/stats');
      assert.ok(body.withDetectionPatterns >= 50,
        `Expected ≥50 tools with patterns, got ${body.withDetectionPatterns}`);
    });

    it('regulation meta exists for eu-ai-act', async () => {
      const { status } = await get('/v1/regulations/meta?jurisdictionId=eu-ai-act');
      assert.strictEqual(status, 200);
    });

    it('timeline has ≥10 events', async () => {
      const { body } = await get('/v1/regulations/timeline');
      assert.ok(body.total >= 10, `Expected ≥10 events, got ${body.total}`);
    });
  });
});
