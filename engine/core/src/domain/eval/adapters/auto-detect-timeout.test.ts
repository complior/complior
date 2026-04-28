/**
 * V1-M30.3 / W-1, W-2: RED — kill the auto-detect race condition that gave
 * Profile B in /deep-e2e a 0/F overallScore (635/635 errors) due to slow LLM probe.
 *
 * `tryOpenAIPost` POSTs a real chat completion to detect OpenAI-compat targets.
 * With a 3 s timeout, real LLM round-trips lose the race when cold → falls back
 * to generic `http` adapter → POSTs to root path → AI server 404s → all tests
 * fail with `AdapterError: API error 404: non-JSON response`.
 *
 * Fix mandates:
 *   W-1: tryOpenAIPost default timeout MUST be ≥ 15000 ms (named const, exported).
 *   W-2: When falling back to http adapter, autoDetectAdapter MUST emit a warn
 *        through an optional `logger.warn` so users can diagnose the surprise.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// These imports are RED: tryOpenAIPost is currently unexported, the const
// doesn't exist, and AutoDetectOptions doesn't carry a logger. The fix in
// auto-detect.ts must add these named exports without changing public behaviour
// for callers that don't use them.
import {
  OPENAI_POST_PROBE_TIMEOUT_MS,
  tryOpenAIPost,
  autoDetectAdapter,
} from './auto-detect.js';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('V1-M30.3 W-1: tryOpenAIPost timeout default ≥ 15 s', () => {
  it('exports OPENAI_POST_PROBE_TIMEOUT_MS as a named const', () => {
    expect(typeof OPENAI_POST_PROBE_TIMEOUT_MS).toBe('number');
  });

  it('OPENAI_POST_PROBE_TIMEOUT_MS is at least 15 000 ms (was 3 000 — too tight for cold LLMs)', () => {
    expect(OPENAI_POST_PROBE_TIMEOUT_MS).toBeGreaterThanOrEqual(15_000);
  });

  it('tryOpenAIPost succeeds when fetch takes 5 s (which used to time out at 3 s)', async () => {
    // Mock fetch to delay 5 seconds before returning 200 OK
    globalThis.fetch = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 5_000));
      return new Response(JSON.stringify({ choices: [{ message: { content: 'pong' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const ok = await tryOpenAIPost('http://127.0.0.1:4000');
    expect(ok).toBe(true);
  }, 30_000);
});

describe('V1-M30.3 W-2: autoDetectAdapter emits warn on http-fallback', () => {
  it('logs a warning when falling back to generic http adapter (so the user knows)', async () => {
    const warn = vi.fn();

    // Mock fetch:
    //   GET /v1/models → 404
    //   GET /api/tags  → 404
    //   POST /v1/chat/completions (the LLM probe) → throws (simulates timeout)
    //   GET <baseUrl>  → 200 (so checkHealth doesn't matter for this path)
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (init?.method === 'POST' && url.endsWith('/v1/chat/completions')) {
        throw new Error('simulated timeout');
      }
      // /v1/models, /api/tags etc → 404
      return new Response('not found', { status: 404 });
    }) as typeof fetch;

    const adapter = await autoDetectAdapter('http://127.0.0.1:4000', { logger: { warn } });

    // Adapter falls back as before, but logger.warn must be called
    expect(adapter.name).toBe('http');
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0][0]);
    expect(msg.toLowerCase()).toMatch(/fallback/);
    expect(msg.toLowerCase()).toMatch(/http adapter/);
  }, 30_000);
});
