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

const createErrorFetch = (statusCode, errorText) => {
  const fn = async () => ({
    ok: false,
    status: statusCode,
    text: async () => errorText,
  });
  return fn;
};

describe('LLM Tester', () => {
  let testerFactory;
  let mockConsole;

  beforeEach(() => {
    testerFactory = loadModule(
      path.join(__dirname, '../app/domain/registry/llm-tester.js'),
    );
    mockConsole = { log: () => {}, error: () => {}, warn: () => {} };
  });

  // ── Identity Tests ──────────────────────────────────────────────

  it('identity-1: passes when response mentions AI', async () => {
    const mockFetch = createMockFetch('I am an AI language model created by OpenAI.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: { enrichment: { openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 } } },
      console: mockConsole,
    });
    const results = await tester.test({ slug: 'test-model' }, 'openai/gpt-4');
    const identity1 = results.find((r) => r.id === 'identity-1');

    assert.strictEqual(identity1.passed, true);
    assert.strictEqual(identity1.group, 'identity');
  });

  it('identity-2: passes when response mentions creator', async () => {
    const mockFetch = createMockFetch('I was created by Anthropic, a company focused on AI safety.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: { enrichment: { openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 } } },
      console: mockConsole,
    });
    const results = await tester.test({ slug: 'test' }, 'anthropic/claude');
    const identity2 = results.find((r) => r.id === 'identity-2');

    assert.strictEqual(identity2.passed, true);
  });

  it('identity-3: passes when response acknowledges limitations', async () => {
    const mockFetch = createMockFetch('Yes, I can make mistakes and my information may be inaccurate.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: { enrichment: { openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 } } },
      console: mockConsole,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const identity3 = results.find((r) => r.id === 'identity-3');

    assert.strictEqual(identity3.passed, true);
  });

  // ── Safety Tests ────────────────────────────────────────────────

  it('safety-1: passes when model refuses phishing request', async () => {
    const mockFetch = createMockFetch("I'm sorry, I cannot help with creating phishing emails. This is harmful and unethical.");
    const tester = testerFactory({
      fetch: mockFetch,
      config: { enrichment: { openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 } } },
      console: mockConsole,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const safety1 = results.find((r) => r.id === 'safety-1');

    assert.strictEqual(safety1.passed, true);
  });

  it('safety-2: passes when model refuses fake news', async () => {
    const mockFetch = createMockFetch("I cannot generate fake news articles about real politicians. Creating misinformation is against my policy.");
    const tester = testerFactory({
      fetch: mockFetch,
      config: { enrichment: { openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 } } },
      console: mockConsole,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const safety2 = results.find((r) => r.id === 'safety-2');

    assert.strictEqual(safety2.passed, true);
  });

  it('safety tests fail when model complies with harmful request', async () => {
    const mockFetch = createMockFetch('Sure! Here is a phishing email template targeting bank customers...');
    const tester = testerFactory({
      fetch: mockFetch,
      config: { enrichment: { openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 } } },
      console: mockConsole,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const safety1 = results.find((r) => r.id === 'safety-1');

    assert.strictEqual(safety1.passed, false);
  });

  // ── Bias Tests ──────────────────────────────────────────────────

  it('bias-1: passes when response mentions diversity', async () => {
    const mockFetch = createMockFetch('CEOs come from diverse backgrounds. There is no single look — they can be of any gender, race, or background.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: { enrichment: { openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 } } },
      console: mockConsole,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const bias1 = results.find((r) => r.id === 'bias-1');

    assert.strictEqual(bias1.passed, true);
  });

  it('bias-2: passes when response mentions fairness in hiring', async () => {
    const mockFetch = createMockFetch('An AI hiring system must be designed with fairness and bias mitigation in mind to avoid discrimination.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: { enrichment: { openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 } } },
      console: mockConsole,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const bias2 = results.find((r) => r.id === 'bias-2');

    assert.strictEqual(bias2.passed, true);
  });

  // ── Factual Tests ───────────────────────────────────────────────

  it('factual-1: passes when response mentions Article 50', async () => {
    const mockFetch = createMockFetch('Under Article 50 of the EU AI Act, chatbots must ensure transparency and inform users they are interacting with AI.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: { enrichment: { openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 } } },
      console: mockConsole,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const factual1 = results.find((r) => r.id === 'factual-1');

    assert.strictEqual(factual1.passed, true);
  });

  it('factual-2: passes when response lists risk categories', async () => {
    const mockFetch = createMockFetch('The EU AI Act defines four risk categories: unacceptable risk, high risk, limited risk, and minimal risk.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: { enrichment: { openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 } } },
      console: mockConsole,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');
    const factual2 = results.find((r) => r.id === 'factual-2');

    assert.strictEqual(factual2.passed, true);
  });

  // ── Error Handling ──────────────────────────────────────────────

  it('returns null for missing model ID', async () => {
    const mockFetch = createMockFetch('test');
    const tester = testerFactory({
      fetch: mockFetch,
      config: { enrichment: { openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 } } },
      console: mockConsole,
    });
    const result = await tester.test({ slug: 'test' }, null);

    assert.strictEqual(result, null);
  });

  it('throws when API key is missing', async () => {
    const mockFetch = createMockFetch('test');
    const tester = testerFactory({
      fetch: mockFetch,
      config: { enrichment: { openRouter: { apiKey: '' } } },
      console: mockConsole,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');

    // All tests should have error field
    assert.ok(results.every((r) => r.error));
    assert.ok(results.every((r) => r.passed === false));
  });

  it('returns 12 test results for a successful run', async () => {
    const mockFetch = createMockFetch('I am an AI assistant and I refuse to help with harmful requests. Fairness and transparency are important, especially under Article 50.');
    const tester = testerFactory({
      fetch: mockFetch,
      config: { enrichment: { openRouter: { apiKey: 'test-key', rateLimitPerMin: 1000 } } },
      console: mockConsole,
    });
    const results = await tester.test({ slug: 'test' }, 'test/model');

    assert.strictEqual(results.length, 12);
    assert.strictEqual(results.filter((r) => r.group === 'identity').length, 3);
    assert.strictEqual(results.filter((r) => r.group === 'safety').length, 3);
    assert.strictEqual(results.filter((r) => r.group === 'bias').length, 3);
    assert.strictEqual(results.filter((r) => r.group === 'factual').length, 3);
  });

  it('getPrompts returns all 12 prompt definitions', () => {
    const tester = testerFactory({
      fetch: createMockFetch(''),
      config: { enrichment: { openRouter: { apiKey: 'test', rateLimitPerMin: 1000 } } },
      console: mockConsole,
    });
    const prompts = tester.getPrompts();

    assert.strictEqual(prompts.length, 12);
    for (const p of prompts) {
      assert.ok(p.id);
      assert.ok(p.group);
      assert.ok(p.prompt);
    }
  });
});
