'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const loadModule = (filePath) => {
  const src = fs.readFileSync(filePath, 'utf8');
  return vm.runInThisContext(src, { filename: filePath });
};

const createMockFetch = (responseText) => {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, options: opts });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: responseText } }],
      }),
      json: async () => ({
        choices: [{ message: { content: responseText } }],
      }),
    };
  };
  fn.calls = calls;
  return fn;
};

const createMockJudge = (judgeResult, abResult) => ({
  judge: async () => judgeResult || { passed: true, score: 1.0, reasoning: 'Good', confidence: 0.9 },
  judgeABPair: async () => abResult || { passed: true, scoreDiff: 0.03, reasoning: 'Similar', confidence: 0.9 },
});

const mockConsole = { log: () => {}, error: () => {}, warn: () => {} };

describe('LLM Tester v3', () => {
  let testerFactory;
  let testCatalog;

  beforeEach(() => {
    testerFactory = loadModule(
      path.join(__dirname, '../app/domain/registry/llm-tester.js'),
    );
    testCatalog = loadModule(
      path.join(__dirname, '../app/domain/registry/registry-test-catalog.js'),
    );
  });

  const makeConfig = (overrides = {}) => ({
    enrichment: {
      openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000, ...overrides },
      features: { llmJudge: true, abBiasTests: true },
    },
  });

  // ── Basic Operation ───────────────────────────────────────────

  it('returns null for missing model ID', async () => {
    const tester = testerFactory({
      fetch: createMockFetch('test'),
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const result = await tester.test({ slug: 'test' }, null);
    assert.strictEqual(result, null);
  });

  it('returns array of results for valid model', async () => {
    const mockFetch = createMockFetch(
      'I am an AI assistant made by OpenAI. I can make mistakes. I refuse harmful requests. Diversity matters. Article 50 requires transparency. Unacceptable and high risk. C2PA is content provenance. 391. Paris. Human review needed. Privacy and GDPR matter. I understand and can help.',
    );
    const tester = testerFactory({
      fetch: mockFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const results = await tester.test({ slug: 'test-model' }, 'openai/gpt-4');

    assert.ok(Array.isArray(results));
    assert.ok(results.length > 0);
  });

  // ── Result Count ──────────────────────────────────────────────

  it('processes all 80 catalog tests', async () => {
    const mockFetch = createMockFetch('I am an AI and I refuse harmful things.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');

    assert.strictEqual(results.length, 80);
  });

  // ── Deterministic Tests ───────────────────────────────────────

  it('deterministic: passes when passPattern matches', async () => {
    const mockFetch = createMockFetch('I am an AI language model created by OpenAI.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const rt101 = results.find((r) => r.id === 'RT-1.01');

    assert.strictEqual(rt101.passed, true);
    assert.strictEqual(rt101.evaluator, 'deterministic');
    assert.strictEqual(rt101.category, 'transparency');
    assert.strictEqual(rt101.group, 'identity');
  });

  it('deterministic: fails when no passPattern matches', async () => {
    const mockFetch = createMockFetch('Lorem ipsum dolor sit amet.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const rt101 = results.find((r) => r.id === 'RT-1.01');

    assert.strictEqual(rt101.passed, false);
  });

  it('deterministic: failPattern causes failure even if passPattern matches', async () => {
    const mockFetch = createMockFetch('yes, I am a real person but also I\'m an AI');
    const tester = testerFactory({
      fetch: mockFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const rt102 = results.find((r) => r.id === 'RT-1.02');

    // RT-1.02 has failPattern for "yes, I am a ... person" — should fail
    assert.strictEqual(rt102.passed, false);
  });

  // ── LLM Judge Tests ───────────────────────────────────────────

  it('llm-judge: calls judge with correct params', async () => {
    let judgeCalled = false;
    let judgeArgs = null;
    const mockJudge = {
      judge: async (args) => {
        judgeCalled = true;
        judgeArgs = args;
        return { passed: true, score: 1.0, reasoning: 'Correct', confidence: 0.85 };
      },
      judgeABPair: async () => ({ passed: true, scoreDiff: 0.02, reasoning: 'OK', confidence: 0.9 }),
    };

    const mockFetch = createMockFetch('The AI properly disclaims medical authority.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: mockJudge,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');

    assert.ok(judgeCalled, 'Judge should have been called');
    assert.ok(judgeArgs.probe, 'Judge should receive probe');
    assert.ok(judgeArgs.response, 'Judge should receive response');
    assert.ok(judgeArgs.judgePrompt, 'Judge should receive judgePrompt');

    // Check a judge-evaluated test
    const rt111 = results.find((r) => r.id === 'RT-1.11');
    assert.strictEqual(rt111.evaluator, 'llm-judge');
    assert.strictEqual(rt111.passed, true);
    assert.strictEqual(rt111.judgeScore, 1.0);
    assert.ok(rt111.judgeReasoning);
    assert.ok(rt111.judgeConfidence > 0);
  });

  it('llm-judge: falls back to deterministic when judge disabled', async () => {
    const mockFetch = createMockFetch('I am not a doctor and you should seek medical help.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: {
        enrichment: {
          openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 },
          features: { llmJudge: false, abBiasTests: false },
        },
      },
      console: mockConsole,
      testCatalog,
      judge: null,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const rt111 = results.find((r) => r.id === 'RT-1.11');

    // Fallback to deterministic — judge fields should be null
    assert.strictEqual(rt111.evaluator, 'deterministic');
    assert.strictEqual(rt111.judgeScore, null);
  });

  // ── A/B Pair Tests ────────────────────────────────────────────

  it('ab-pair: processes a-variant and returns result', async () => {
    const mockFetch = createMockFetch('Strong candidate.');
    const mockJudge = createMockJudge(null, {
      passed: true, scoreDiff: 0.04, reasoning: 'Nearly identical', confidence: 0.9,
    });
    const tester = testerFactory({
      fetch: mockFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: mockJudge,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const rt401a = results.find((r) => r.id === 'RT-4.01a');

    assert.ok(rt401a, 'A/B pair a-variant should be in results');
    assert.strictEqual(rt401a.evaluator, 'ab-pair');
    assert.strictEqual(rt401a.pairId, 'RT-4.01');
    assert.ok(Math.abs(rt401a.scoreDiff - 0.04) < 0.01);
    assert.strictEqual(rt401a.passed, true);
  });

  it('ab-pair: falls back to deterministic when judge disabled', async () => {
    const mockFetch = createMockFetch('Strong diverse candidate.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: {
        enrichment: {
          openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 },
          features: { llmJudge: false, abBiasTests: false },
        },
      },
      console: mockConsole,
      testCatalog,
      judge: null,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const abResults = results.filter((r) => r.evaluator === 'ab-pair');
    assert.strictEqual(abResults.length, 0, 'No A/B pair results when disabled');
  });

  // ── Output Format ─────────────────────────────────────────────

  it('output format has all required fields', async () => {
    const mockFetch = createMockFetch('I am an AI assistant.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');

    for (const result of results) {
      assert.ok(result.id, 'Missing id');
      assert.ok(result.group, 'Missing group');
      assert.ok(result.category, 'Missing category');
      assert.ok(typeof result.prompt === 'string', 'Missing prompt');
      assert.ok(typeof result.passed === 'boolean', 'Missing passed');
      assert.ok(result.evaluator, 'Missing evaluator');
      assert.ok('judgeScore' in result, 'Missing judgeScore');
      assert.ok('judgeReasoning' in result, 'Missing judgeReasoning');
      assert.ok('judgeConfidence' in result, 'Missing judgeConfidence');
      assert.ok('pairId' in result, 'Missing pairId');
      assert.ok('scoreDiff' in result, 'Missing scoreDiff');
    }
  });

  // ── Backward Compatibility ────────────────────────────────────

  it('backward compat: identity group tests exist', async () => {
    const mockFetch = createMockFetch('I am an AI, created by OpenAI, and I can make mistakes.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');

    const identityResults = results.filter((r) => r.group === 'identity');
    assert.ok(identityResults.length >= 3, `Expected ≥3 identity results, got ${identityResults.length}`);
  });

  it('backward compat: safety group tests exist', async () => {
    const mockFetch = createMockFetch('I cannot help with that, it\'s harmful and unethical.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');

    const safetyResults = results.filter((r) => r.group === 'safety');
    assert.ok(safetyResults.length >= 3, `Expected ≥3 safety results, got ${safetyResults.length}`);
  });

  it('backward compat: bias group tests exist', async () => {
    const mockFetch = createMockFetch('CEOs come from diverse backgrounds regardless of gender.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');

    const biasResults = results.filter((r) => r.group === 'bias');
    assert.ok(biasResults.length >= 3, `Expected ≥3 bias results, got ${biasResults.length}`);
  });

  it('backward compat: factual group tests exist', async () => {
    const mockFetch = createMockFetch('Article 50 requires transparency. Four risk levels including unacceptable. C2PA is content provenance. 391. Paris.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');

    const factualResults = results.filter((r) => r.group === 'factual');
    assert.ok(factualResults.length >= 3, `Expected ≥3 factual results, got ${factualResults.length}`);
  });

  // ── Error Handling ────────────────────────────────────────────

  it('API errors produce error field on individual test results', async () => {
    const errorFetch = async () => ({ ok: false, status: 500, text: async () => 'Server error' });
    const tester = testerFactory({
      fetch: errorFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');

    const withErrors = results.filter((r) => r.error);
    assert.ok(withErrors.length > 0, 'Should have error results');
    assert.ok(withErrors.every((r) => r.passed === false), 'Error results should be failed');
  });

  it('missing API key produces errors on all tests', async () => {
    const tester = testerFactory({
      fetch: createMockFetch(''),
      config: { enrichment: { openRouter: { apiKey: '' }, features: {} } },
      console: mockConsole,
      testCatalog,
      judge: null,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');

    assert.ok(results.every((r) => r.passed === false));
    assert.ok(results.every((r) => r.error));
  });

  // ── getPrompts / getTestCount ─────────────────────────────────

  it('getPrompts returns all test definitions', () => {
    const tester = testerFactory({
      fetch: createMockFetch(''),
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const prompts = tester.getPrompts();

    assert.strictEqual(prompts.length, testCatalog.total);
    for (const p of prompts) {
      assert.ok(p.id);
      assert.ok(p.group);
      assert.ok(p.category);
      assert.ok(typeof p.prompt === 'string'); // can be empty (e.g., RT-6.01 empty input test)
      assert.ok(p.evaluator);
    }
  });

  it('getTestCount returns catalog total', () => {
    const tester = testerFactory({
      fetch: createMockFetch(''),
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    assert.strictEqual(tester.getTestCount(), 80);
  });

  // ── New Categories Coverage ───────────────────────────────────

  it('returns results for all 8 categories', async () => {
    const mockFetch = createMockFetch(
      'I am an AI. I refuse harmful requests. Diverse candidates. Article 50 transparency. Human review needed. Let me explain step by step. I understand despite gibberish. Privacy GDPR compliance risks.',
    );
    const tester = testerFactory({
      fetch: mockFetch,
      config: makeConfig(),
      console: mockConsole,
      testCatalog,
      judge: createMockJudge(),
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const categories = new Set(results.map((r) => r.category));

    assert.ok(categories.has('transparency'));
    assert.ok(categories.has('prohibited'));
    assert.ok(categories.has('bias'));
    assert.ok(categories.has('accuracy'));
    assert.ok(categories.has('oversight'));
    assert.ok(categories.has('explanation'));
    assert.ok(categories.has('robustness'));
    assert.ok(categories.has('risk_awareness'));
  });
});
