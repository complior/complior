import { describe, it, expect, vi } from 'vitest';
import { parseTOML } from '../runtime/toml-parser.js';
import { toMiddlewareConfig, mergeConfigs } from '../runtime/proxy-config.js';
import type { ProxyConfig } from '../runtime/proxy-config.js';
import { withRetry, isRetryable } from '../runtime/retry.js';
import { isStreamResponse, isStreamRequest, wrapStream } from '../runtime/stream-wrapper.js';
import { MiddlewareError } from '../errors.js';
import { complior } from '../index.js';
import type { MiddlewareConfig } from '../types.js';
import type { Pipeline } from '../pipeline.js';

// ─── TOML Parser ─────────────────────────────────────────────────

describe('TOML Parser', () => {
  it('parses key-value strings', () => {
    const result = parseTOML('[section]\nname = "hello"\npath = \'world\'');
    expect(result.section).toEqual({ name: 'hello', path: 'world' });
  });

  it('parses booleans and numbers', () => {
    const result = parseTOML('[opts]\nenabled = true\ndisabled = false\ncount = 42\nrate = 0.7');
    expect(result.opts).toEqual({ enabled: true, disabled: false, count: 42, rate: 0.7 });
  });

  it('parses sections', () => {
    const result = parseTOML('[hooks]\nlogging = true\n\n[thresholds]\nbias = 0.5');
    expect(result.hooks).toEqual({ logging: true });
    expect(result.thresholds).toEqual({ bias: 0.5 });
  });

  it('parses string arrays', () => {
    const result = parseTOML('[disclosure]\nlanguages = ["EN", "DE", "FR"]');
    expect(result.disclosure).toEqual({ languages: ['EN', 'DE', 'FR'] });
  });

  it('skips comments and blank lines', () => {
    const input = '# This is a comment\n\n[section]\n# another comment\nkey = "value"\n\n';
    const result = parseTOML(input);
    expect(result.section).toEqual({ key: 'value' });
  });

  it('strips inline comments', () => {
    const input = '[s]\nstr = "hello" # a comment\nnum = 42 # count\nbool = true # flag\narr = ["a", "b"] # list';
    const result = parseTOML(input);
    expect(result.s).toEqual({ str: 'hello', num: 42, bool: true, arr: ['a', 'b'] });
  });
});

// ─── Proxy Config ────────────────────────────────────────────────

describe('Proxy Config', () => {
  it('toMiddlewareConfig maps TOML names to SDK fields', () => {
    const proxy: ProxyConfig = {
      hooks: { safety_filter: true, hitl_gate: false, interaction_logger: true, disclosure_injection: true, logging: true },
      thresholds: { bias_threshold: 0.8, bias_action: 'block', safety_threshold: 0.6, safety_mode: 'warn' },
      sanitize: { mode: 'block' },
      disclosure: { mode: 'warn-only', languages: ['EN', 'DE'], text: 'AI generated', position: 'append', frequency: 'every' },
      hitl: { timeout_ms: 60000 },
      logging: { interaction_log_path: '/tmp/log.jsonl' },
      retry: { enabled: true, max_retries: 5, base_delay_ms: 500, max_delay_ms: 10000 },
    };
    const config = toMiddlewareConfig(proxy);
    expect(config.safetyFilter).toBe(true);
    expect(config.hitlGate).toBe(false);
    expect(config.interactionLogger).toBe(true);
    expect(config.disclosureInjection).toBe(true);
    expect(config.logging).toBe(true);
    expect(config.biasThreshold).toBe(0.8);
    expect(config.biasAction).toBe('block');
    expect(config.safetyThreshold).toBe(0.6);
    expect(config.safetyMode).toBe('warn');
    expect(config.sanitizeMode).toBe('block');
    expect(config.disclosureMode).toBe('warn-only');
    expect(config.disclosureLanguages).toEqual(['EN', 'DE']);
    expect(config.disclosureText).toBe('AI generated');
    expect(config.disclosurePosition).toBe('append');
    expect(config.disclosureFrequency).toBe('every');
    expect(config.hitlGateTimeoutMs).toBe(60000);
    expect(config.interactionLogPath).toBe('/tmp/log.jsonl');
    expect(config.retry).toEqual({ enabled: true, maxRetries: 5, baseDelayMs: 500, maxDelayMs: 10000 });
  });

  it('mergeConfigs — programmatic wins on conflict', () => {
    const programmatic: MiddlewareConfig = { biasThreshold: 0.9, logging: true };
    const fileBased: Partial<MiddlewareConfig> = { biasThreshold: 0.5, safetyFilter: true };
    const merged = mergeConfigs(programmatic, fileBased);
    expect(merged.biasThreshold).toBe(0.9); // programmatic wins
    expect(merged.logging).toBe(true);
  });

  it('mergeConfigs — file fills gaps', () => {
    const programmatic: MiddlewareConfig = { logging: true };
    const fileBased: Partial<MiddlewareConfig> = { safetyFilter: true, biasThreshold: 0.6 };
    const merged = mergeConfigs(programmatic, fileBased);
    expect(merged.logging).toBe(true);
    expect(merged.safetyFilter).toBe(true);
    expect(merged.biasThreshold).toBe(0.6);
  });

  it('toMiddlewareConfig returns empty for empty proxy', () => {
    const config = toMiddlewareConfig({});
    expect(Object.keys(config).length).toBe(0);
  });
});

// ─── Retry ───────────────────────────────────────────────────────

describe('Retry', () => {
  it('succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { enabled: true, maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries transient errors then succeeds', async () => {
    const error = Object.assign(new Error('rate limit'), { status: 429 });
    const fn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('ok');
    const result = await withRetry(fn, { enabled: true, maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry MiddlewareError', async () => {
    const mwError = new MiddlewareError('prohibited', 'PROHIBITED_PRACTICE');
    const fn = vi.fn().mockRejectedValue(mwError);
    await expect(withRetry(fn, { enabled: true, maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100 }))
      .rejects.toThrow(MiddlewareError);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ─── isRetryable ─────────────────────────────────────────────────

describe('isRetryable', () => {
  it('returns true for 429 status', () => {
    expect(isRetryable({ status: 429 })).toBe(true);
  });

  it('returns true for 503 status', () => {
    expect(isRetryable({ status: 503 })).toBe(true);
  });

  it('returns true for ECONNREFUSED', () => {
    expect(isRetryable({ code: 'ECONNREFUSED' })).toBe(true);
  });

  it('returns false for MiddlewareError', () => {
    expect(isRetryable(new MiddlewareError('test', 'TEST'))).toBe(false);
  });

  it('returns false for generic error', () => {
    expect(isRetryable(new Error('generic'))).toBe(false);
  });
});

// ─── Stream Wrapper ──────────────────────────────────────────────

describe('Stream Wrapper', () => {
  it('detects AsyncIterable as stream response', () => {
    const asyncIter = {
      async *[Symbol.asyncIterator]() { yield 'chunk'; },
    };
    expect(isStreamResponse(asyncIter)).toBe(true);
    expect(isStreamResponse({ choices: [] })).toBe(false);
    expect(isStreamResponse(null)).toBe(false);
  });

  it('detects stream=true as stream request', () => {
    expect(isStreamRequest({ stream: true, model: 'gpt-4' })).toBe(true);
    expect(isStreamRequest({ model: 'gpt-4' })).toBe(false);
    expect(isStreamRequest({ stream: false })).toBe(false);
  });

  it('yields all chunks and runs post-hooks after stream ends', async () => {
    const chunks = [
      { choices: [{ delta: { content: 'Hello' } }] },
      { choices: [{ delta: { content: ' world' } }] },
    ];

    async function* makeStream() {
      for (const chunk of chunks) yield chunk;
    }

    const postHookCalled = vi.fn();
    const mockPipeline: Pipeline = {
      runPre: (ctx) => ctx,
      runPost: async (ctx, response) => {
        postHookCalled(response);
        return { response, metadata: {}, headers: {} };
      },
    };

    const ctx = { provider: 'openai', method: 'create', config: {}, params: {}, metadata: {} };
    const wrapped = wrapStream(makeStream(), ctx, mockPipeline);

    const collected: unknown[] = [];
    for await (const chunk of wrapped) {
      collected.push(chunk);
    }

    expect(collected).toHaveLength(2);
    expect(collected[0]).toEqual(chunks[0]);
    expect(collected[1]).toEqual(chunks[1]);
    // Post-hooks receive accumulated text
    expect(postHookCalled).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Hello world', _streamed: true }),
    );
  });
});

// ─── Enhanced Detection ──────────────────────────────────────────

describe('Enhanced Provider Detection', () => {
  it('detects by constructor name', () => {
    class OpenAI { chat = { completions: { create: async () => ({}) } }; }
    const client = new OpenAI();
    const wrapped = complior(client, { configPath: false });
    // If it wraps chat, detection worked
    expect(wrapped.chat).toBeDefined();
    expect(typeof wrapped.chat.completions.create).toBe('function');
  });

  it('detects by Symbol hint', () => {
    const HINT = Symbol.for('complior:provider');
    const client = {
      [HINT]: 'anthropic',
      messages: { create: async () => ({ content: [{ text: 'hi' }] }) },
    };
    const wrapped = complior(client, { configPath: false });
    expect(wrapped.messages).toBeDefined();
  });

  it('falls back to unknown for unrecognized clients', () => {
    const client = { doSomething: () => 'result' };
    const wrapped = complior(client, { configPath: false });
    // Unknown provider — methods not intercepted
    expect(wrapped.doSomething()).toBe('result');
  });
});
