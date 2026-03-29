'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const loadModule = (filePath) => {
  const src = fs.readFileSync(filePath, 'utf8');
  return vm.runInThisContext(src, { filename: filePath });
};

describe('Registry Test Catalog', () => {
  const catalog = loadModule(
    path.join(__dirname, '../app/domain/registry/registry-test-catalog.js'),
  );

  // ── Structure ──────────────────────────────────────────────────

  it('exports CATALOG, LEGACY_ID_MAP, VALID_CATEGORIES, total', () => {
    assert.ok(Array.isArray(catalog.CATALOG));
    assert.ok(typeof catalog.LEGACY_ID_MAP === 'object');
    assert.ok(Array.isArray(catalog.VALID_CATEGORIES));
    assert.ok(typeof catalog.total === 'number');
  });

  it('has exactly 80 tests', () => {
    assert.strictEqual(catalog.total, 80);
    assert.strictEqual(catalog.CATALOG.length, 80);
  });

  // ── Required Fields ────────────────────────────────────────────

  it('every test has required fields', () => {
    for (const test of catalog.CATALOG) {
      assert.ok(test.id, `Missing id: ${JSON.stringify(test).slice(0, 100)}`);
      assert.ok(test.category, `Missing category for ${test.id}`);
      assert.ok(typeof test.probe === 'string', `Missing probe for ${test.id}`);
      assert.ok(test.evaluator, `Missing evaluator for ${test.id}`);
      assert.ok(test.severity, `Missing severity for ${test.id}`);
      assert.ok(test.group, `Missing group for ${test.id}`);
    }
  });

  // ── No Duplicates ──────────────────────────────────────────────

  it('has no duplicate IDs', () => {
    const ids = catalog.CATALOG.map((t) => t.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(ids.length, uniqueIds.size, `Duplicate IDs found: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`);
  });

  // ── Valid Categories ───────────────────────────────────────────

  it('all test categories are valid scoring weight categories', () => {
    for (const test of catalog.CATALOG) {
      assert.ok(
        catalog.VALID_CATEGORIES.includes(test.category),
        `Invalid category "${test.category}" for test ${test.id}`,
      );
    }
  });

  // ── Valid Evaluator Types ──────────────────────────────────────

  it('all evaluators are valid types', () => {
    const validEvaluators = ['deterministic', 'llm-judge', 'ab-pair'];
    for (const test of catalog.CATALOG) {
      assert.ok(
        validEvaluators.includes(test.evaluator),
        `Invalid evaluator "${test.evaluator}" for ${test.id}`,
      );
    }
  });

  // ── Valid Severities ───────────────────────────────────────────

  it('all severities are valid', () => {
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    for (const test of catalog.CATALOG) {
      assert.ok(
        validSeverities.includes(test.severity),
        `Invalid severity "${test.severity}" for ${test.id}`,
      );
    }
  });

  // ── Category Distribution ──────────────────────────────────────

  it('transparency has 15 tests', () => {
    const count = catalog.CATALOG.filter((t) => t.category === 'transparency').length;
    assert.strictEqual(count, 15);
  });

  it('prohibited has 10 tests', () => {
    const count = catalog.CATALOG.filter((t) => t.category === 'prohibited').length;
    assert.strictEqual(count, 10);
  });

  it('bias has 18 tests (3 det + 5 judge + 10 A/B)', () => {
    const count = catalog.CATALOG.filter((t) => t.category === 'bias').length;
    assert.strictEqual(count, 18);
  });

  it('accuracy has 10 tests', () => {
    const count = catalog.CATALOG.filter((t) => t.category === 'accuracy').length;
    assert.strictEqual(count, 10);
  });

  it('oversight has 8 tests', () => {
    const count = catalog.CATALOG.filter((t) => t.category === 'oversight').length;
    assert.strictEqual(count, 8);
  });

  it('explanation has 6 tests', () => {
    const count = catalog.CATALOG.filter((t) => t.category === 'explanation').length;
    assert.strictEqual(count, 6);
  });

  it('robustness has 8 tests', () => {
    const count = catalog.CATALOG.filter((t) => t.category === 'robustness').length;
    assert.strictEqual(count, 8);
  });

  it('risk_awareness has 5 tests', () => {
    const count = catalog.CATALOG.filter((t) => t.category === 'risk_awareness').length;
    assert.strictEqual(count, 5);
  });

  // ── Deterministic Tests ────────────────────────────────────────

  it('deterministic tests have valid passPatterns (RegExp)', () => {
    const detTests = catalog.CATALOG.filter((t) => t.evaluator === 'deterministic');
    for (const test of detTests) {
      assert.ok(Array.isArray(test.passPatterns), `Missing passPatterns for ${test.id}`);
      for (const pattern of test.passPatterns) {
        assert.ok(pattern instanceof RegExp, `passPattern not a RegExp for ${test.id}`);
      }
      assert.ok(Array.isArray(test.failPatterns), `Missing failPatterns for ${test.id}`);
      for (const pattern of test.failPatterns) {
        assert.ok(pattern instanceof RegExp, `failPattern not a RegExp for ${test.id}`);
      }
    }
  });

  // ── LLM Judge Tests ────────────────────────────────────────────

  it('llm-judge tests have judgePrompt', () => {
    const judgeTests = catalog.CATALOG.filter((t) => t.evaluator === 'llm-judge');
    for (const test of judgeTests) {
      assert.ok(
        typeof test.judgePrompt === 'string' && test.judgePrompt.length > 0,
        `Missing judgePrompt for ${test.id}`,
      );
    }
  });

  // ── A/B Pair Tests ─────────────────────────────────────────────

  it('A/B pairs have unique pairIds', () => {
    const abTests = catalog.CATALOG.filter((t) => t.evaluator === 'ab-pair');
    const pairIds = abTests.map((t) => t.pairId);
    const uniquePairIds = new Set(pairIds);

    assert.strictEqual(pairIds.length, uniquePairIds.size, 'Each A/B pair should have exactly 1 entry');
    for (const test of abTests) {
      assert.strictEqual(test.variant, 'a', `A/B pair ${test.id} should be a-variant`);
    }
  });

  it('A/B pairs have pairProbe and judgePrompt', () => {
    const abTests = catalog.CATALOG.filter((t) => t.evaluator === 'ab-pair');
    for (const test of abTests) {
      assert.ok(typeof test.pairProbe === 'string', `Missing pairProbe for ${test.id}`);
      assert.ok(typeof test.judgePrompt === 'string', `Missing judgePrompt for ${test.id}`);
      assert.ok(typeof test.protectedCharacteristic === 'string', `Missing protectedCharacteristic for ${test.id}`);
    }
  });

  it('A/B pairs have 10 unique pair IDs', () => {
    const abTests = catalog.CATALOG.filter((t) => t.evaluator === 'ab-pair');
    const pairIds = new Set(abTests.map((t) => t.pairId));
    assert.strictEqual(pairIds.size, 10);
  });

  // ── Legacy ID Map ──────────────────────────────────────────────

  it('legacy ID map has 12 entries', () => {
    assert.strictEqual(Object.keys(catalog.LEGACY_ID_MAP).length, 12);
  });

  it('legacy IDs map to tests that exist in catalog', () => {
    const ids = new Set(catalog.CATALOG.map((t) => t.id));
    for (const [oldId, newId] of Object.entries(catalog.LEGACY_ID_MAP)) {
      assert.ok(ids.has(newId), `Legacy ${oldId} maps to ${newId} which does not exist in catalog`);
    }
  });

  it('legacy IDs cover all original groups', () => {
    const legacyKeys = Object.keys(catalog.LEGACY_ID_MAP);
    assert.ok(legacyKeys.some((k) => k.startsWith('identity-')));
    assert.ok(legacyKeys.some((k) => k.startsWith('safety-')));
    assert.ok(legacyKeys.some((k) => k.startsWith('bias-')));
    assert.ok(legacyKeys.some((k) => k.startsWith('factual-')));
  });
});
