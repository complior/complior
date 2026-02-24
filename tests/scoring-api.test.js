'use strict';

/**
 * Scoring API Tests
 *
 * Validates:
 * 1. GET /v1/regulations/scoring returns scoring rules
 * 2. Response includes byRiskLevel aggregation
 * 3. maxPossibleScore is sum of all maxScore values
 * 4. jurisdictionId parameter filtering works
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

// ─── Mock DB ─────────────────────────────────────────────────────────────────

const SCORING_RULES = [
  { checkId: 'check-001', regulation: 'eu-ai-act', weight: 10, maxScore: 100, riskLevel: 'high', description: 'Risk assessment' },
  { checkId: 'check-002', regulation: 'eu-ai-act', weight: 8, maxScore: 80, riskLevel: 'high', description: 'Human oversight' },
  { checkId: 'check-003', regulation: 'eu-ai-act', weight: 5, maxScore: 50, riskLevel: 'limited', description: 'Transparency' },
  { checkId: 'check-004', regulation: 'eu-ai-act', weight: 3, maxScore: 30, riskLevel: 'minimal', description: 'Registration' },
];

const createScoringMockDb = () => ({
  query: async (sql, params) => {
    if (sql.includes('FROM "Permission"')) return { rows: [] };

    if (sql.includes('FROM "ScoringRule"')) {
      const jurisdiction = params?.[0] || 'eu-ai-act';
      const filtered = SCORING_RULES.filter((r) => r.regulation === jurisdiction);
      return { rows: filtered };
    }

    return { rows: [] };
  },
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /v1/regulations/scoring', () => {

  it('returns scoring rules for default jurisdiction (eu-ai-act)', async () => {
    const { api } = await buildFullSandbox(createScoringMockDb());

    // Find the scoring endpoint
    const endpoint = findEndpoint(api, '/v1/regulations/scoring');
    assert.ok(endpoint, 'Scoring endpoint must exist');

    const result = await endpoint.method({
      query: {},
      db: createScoringMockDb(),
    });

    assert.strictEqual(result.jurisdictionId, 'eu-ai-act');
    assert.strictEqual(result.totalRules, 4);
    assert.ok(Array.isArray(result.rules), 'rules must be array');
  });

  it('calculates correct maxPossibleScore', async () => {
    const { api } = await buildFullSandbox(createScoringMockDb());
    const endpoint = findEndpoint(api, '/v1/regulations/scoring');

    const result = await endpoint.method({
      query: {},
      db: createScoringMockDb(),
    });

    // 100 + 80 + 50 + 30 = 260
    assert.strictEqual(result.maxPossibleScore, 260);
  });

  it('aggregates byRiskLevel correctly', async () => {
    const { api } = await buildFullSandbox(createScoringMockDb());
    const endpoint = findEndpoint(api, '/v1/regulations/scoring');

    const result = await endpoint.method({
      query: {},
      db: createScoringMockDb(),
    });

    assert.ok(result.byRiskLevel.high, 'Should have high risk level');
    assert.strictEqual(result.byRiskLevel.high.count, 2);
    assert.strictEqual(result.byRiskLevel.high.maxScoreSum, 180); // 100+80
    assert.strictEqual(result.byRiskLevel.limited.count, 1);
    assert.strictEqual(result.byRiskLevel.minimal.count, 1);
  });

  it('each rule has checkId, weight, maxScore, riskLevel, description', async () => {
    const { api } = await buildFullSandbox(createScoringMockDb());
    const endpoint = findEndpoint(api, '/v1/regulations/scoring');

    const result = await endpoint.method({
      query: {},
      db: createScoringMockDb(),
    });

    for (const rule of result.rules) {
      assert.ok(rule.checkId, 'checkId required');
      assert.ok(typeof rule.weight === 'number', 'weight must be number');
      assert.ok(typeof rule.maxScore === 'number', 'maxScore must be number');
      assert.ok(rule.riskLevel, 'riskLevel required');
    }
  });

  it('respects jurisdictionId parameter', async () => {
    const { api } = await buildFullSandbox(createScoringMockDb());
    const endpoint = findEndpoint(api, '/v1/regulations/scoring');

    const result = await endpoint.method({
      query: { jurisdictionId: 'colorado-sb205' },
      db: createScoringMockDb(),
    });

    // No rules for colorado-sb205 in our mock
    assert.strictEqual(result.jurisdictionId, 'colorado-sb205');
    assert.strictEqual(result.totalRules, 0);
    assert.strictEqual(result.maxPossibleScore, 0);
  });

  it('returns empty byRiskLevel for unknown jurisdiction', async () => {
    const { api } = await buildFullSandbox(createScoringMockDb());
    const endpoint = findEndpoint(api, '/v1/regulations/scoring');

    const result = await endpoint.method({
      query: { jurisdictionId: 'unknown' },
      db: createScoringMockDb(),
    });

    assert.strictEqual(Object.keys(result.byRiskLevel).length, 0, 'byRiskLevel should be empty');
    assert.strictEqual(result.rules.length, 0, 'rules should be empty');
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findEndpoint(api, path) {
  // Walk the api tree to find matching endpoint
  const walk = (node) => {
    if (!node || typeof node !== 'object') return null;
    if (node.path === path && node.method) return node;
    for (const key of Object.keys(node)) {
      const found = walk(node[key]);
      if (found) return found;
    }
    return null;
  };
  return walk(api);
}
