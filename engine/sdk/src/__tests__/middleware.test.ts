import { describe, it, expect, vi } from 'vitest';
import {
  extractCompliorHeaders,
  filterHeaders,
  HEADER_KEYS,
  DEFAULT_HEADERS,
} from '../middleware/types.js';
import { compliorExpress } from '../middleware/express.js';
import { compliorFastify } from '../middleware/fastify.js';
import { compliorHono } from '../middleware/hono.js';
import { compliorNextjs } from '../middleware/nextjs.js';

// ── Test helpers ──────────────────────────────────────────────────

const compliorBody = (metadata: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  JSON.stringify({
    result: 'ok',
    _complior: { metadata, headers },
  });

// ── Shared types / extractCompliorHeaders ─────────────────────────

describe('US-S05-06: Middleware types', () => {
  describe('HEADER_KEYS', () => {
    it('contains expected compliance headers', () => {
      expect(HEADER_KEYS).toContain('X-AI-Disclosure');
      expect(HEADER_KEYS).toContain('X-Bias-Warning');
      expect(HEADER_KEYS).toContain('X-Compliance-Score');
      expect(HEADER_KEYS.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('DEFAULT_HEADERS', () => {
    it('has disclosure and provider defaults', () => {
      expect(DEFAULT_HEADERS['X-AI-Disclosure']).toBe('true');
      expect(DEFAULT_HEADERS['X-AI-Provider']).toBe('unknown');
    });
  });

  describe('extractCompliorHeaders', () => {
    it('extracts headers from _complior metadata', () => {
      const body = compliorBody({ provider: 'openai', disclosureVerified: true });
      const headers = extractCompliorHeaders(body);
      expect(headers['X-AI-Disclosure']).toBe('verified');
      expect(headers['X-AI-Provider']).toBe('openai');
    });

    it('passes through pipeline headers', () => {
      const body = compliorBody({}, { 'X-Bias-Warning': 'potential-bias-detected' });
      const headers = extractCompliorHeaders(body);
      expect(headers['X-Bias-Warning']).toBe('potential-bias-detected');
    });

    it('returns empty for non-JSON body', () => {
      expect(extractCompliorHeaders('not json')).toEqual({});
    });

    it('returns empty when no _complior key', () => {
      expect(extractCompliorHeaders('{"foo":"bar"}')).toEqual({});
    });

    it('computes compliance score from biasScore', () => {
      const body = compliorBody({ biasScore: 0.5 });
      const headers = extractCompliorHeaders(body);
      expect(headers['X-Compliance-Score']).toBe('50');
    });
  });

  describe('filterHeaders', () => {
    it('filters by include list', () => {
      const result = filterHeaders(
        { 'X-AI-Disclosure': 'true', 'X-Bias-Warning': 'yes' },
        { headers: { include: ['X-AI-Disclosure'] } },
      );
      expect(result).toEqual({ 'X-AI-Disclosure': 'true' });
    });

    it('filters by exclude list', () => {
      const result = filterHeaders(
        { 'X-AI-Disclosure': 'true', 'X-Bias-Warning': 'yes' },
        { headers: { exclude: ['X-Bias-Warning'] } },
      );
      expect(result).toEqual({ 'X-AI-Disclosure': 'true' });
    });

    it('returns all when no options', () => {
      const input = { 'X-AI-Disclosure': 'true' };
      expect(filterHeaders(input)).toEqual(input);
    });
  });
});

// ── Express adapter ───────────────────────────────────────────────

describe('US-S05-06: Express middleware', () => {
  const makeRes = () => {
    const headers: Record<string, string> = {};
    return {
      headers,
      setHeader: vi.fn((k: string, v: string) => { headers[k] = v; }),
      on: vi.fn(),
      write: vi.fn((_chunk?: unknown) => true),
      end: vi.fn(),
    };
  };

  it('injects compliance headers from response body', () => {
    const mw = compliorExpress();
    const res = makeRes();
    const body = compliorBody({ provider: 'anthropic', disclosureVerified: true });

    mw({}, res, () => {});
    // Simulate response end with body
    res.end(body);

    expect(res.setHeader).toHaveBeenCalledWith('X-AI-Disclosure', 'verified');
    expect(res.setHeader).toHaveBeenCalledWith('X-AI-Provider', 'anthropic');
  });

  it('handles write + end flow', () => {
    const mw = compliorExpress();
    const res = makeRes();
    const body = compliorBody({}, { 'X-Bias-Warning': 'potential-bias-detected' });

    mw({}, res, () => {});
    res.write(body);
    res.end();

    expect(res.setHeader).toHaveBeenCalledWith('X-Bias-Warning', 'potential-bias-detected');
  });

  it('applies include filter', () => {
    const mw = compliorExpress({ headers: { include: ['X-AI-Provider'] } });
    const res = makeRes();
    const body = compliorBody({ provider: 'openai', disclosureVerified: true });

    mw({}, res, () => {});
    res.end(body);

    expect(res.headers['X-AI-Provider']).toBe('openai');
    expect(res.headers['X-AI-Disclosure']).toBeUndefined();
  });
});

// ── Fastify adapter ──────────────────────────────────────────────

describe('US-S05-06: Fastify plugin', () => {
  it('registers onSend hook that injects headers', async () => {
    const plugin = compliorFastify();
    let hookHandler: ((req: unknown, reply: unknown, payload: unknown) => Promise<unknown>) | null = null;

    const instance = {
      addHook: vi.fn((_hook: string, handler: (req: unknown, reply: unknown, payload: unknown) => Promise<unknown>) => {
        hookHandler = handler;
      }),
    };
    const done = vi.fn();

    plugin(instance, {}, done);
    expect(instance.addHook).toHaveBeenCalledWith('onSend', expect.any(Function));
    expect(done).toHaveBeenCalled();

    // Simulate onSend
    const headers: Record<string, string> = {};
    const reply = {
      header: vi.fn((k: string, v: string) => { headers[k] = v; return reply; }),
    };
    const body = compliorBody({ provider: 'gemini' });
    await hookHandler!({}, reply, body);

    expect(reply.header).toHaveBeenCalledWith('X-AI-Provider', 'gemini');
  });

  it('passes payload through unchanged', async () => {
    const plugin = compliorFastify();
    let hookHandler: ((req: unknown, reply: unknown, payload: unknown) => Promise<unknown>) | null = null;

    const instance = {
      addHook: vi.fn((_: string, h: (req: unknown, reply: unknown, payload: unknown) => Promise<unknown>) => { hookHandler = h; }),
    };
    plugin(instance, {}, () => {});

    const reply = { header: vi.fn(() => reply) };
    const body = compliorBody({});
    const result = await hookHandler!({}, reply, body);
    expect(result).toBe(body);
  });
});

// ── Hono adapter ─────────────────────────────────────────────────

describe('US-S05-06: Hono middleware', () => {
  it('injects headers after next()', async () => {
    const mw = compliorHono();
    const body = compliorBody({ provider: 'openai', disclosureVerified: true });
    const headers: Record<string, string> = {};

    const ctx = {
      header: vi.fn((k: string, v: string) => { headers[k] = v; }),
      res: {
        clone: () => ({
          text: () => Promise.resolve(body),
        }),
      },
    };

    await mw(ctx, async () => {});

    expect(ctx.header).toHaveBeenCalledWith('X-AI-Disclosure', 'verified');
    expect(ctx.header).toHaveBeenCalledWith('X-AI-Provider', 'openai');
  });

  it('handles non-clonable response gracefully', async () => {
    const mw = compliorHono();
    const ctx = {
      header: vi.fn(),
      res: {
        clone: () => { throw new Error('not clonable'); },
      },
    };

    // Should not throw
    await mw(ctx, async () => {});
    expect(ctx.header).not.toHaveBeenCalled();
  });

  it('applies header filtering options', async () => {
    const mw = compliorHono({ headers: { exclude: ['X-AI-Provider'] } });
    const body = compliorBody({ provider: 'openai', disclosureVerified: true });
    const headers: Record<string, string> = {};

    const ctx = {
      header: vi.fn((k: string, v: string) => { headers[k] = v; }),
      res: {
        clone: () => ({
          text: () => Promise.resolve(body),
        }),
      },
    };

    await mw(ctx, async () => {});
    expect(headers['X-AI-Provider']).toBeUndefined();
    expect(headers['X-AI-Disclosure']).toBe('verified');
  });
});

// ── Next.js adapter ──────────────────────────────────────────────

describe('US-S05-06: Next.js wrapper', () => {
  const makeNextRes = () => {
    const headers: Record<string, string> = {};
    return {
      headers,
      setHeader: vi.fn((k: string, v: string) => { headers[k] = v as string; }),
      json: vi.fn(),
      send: vi.fn(),
      end: vi.fn(),
    };
  };

  it('injects headers when res.json() is called', async () => {
    const handler = vi.fn((_req: unknown, res: { json: (b: unknown) => void }) => {
      res.json({
        result: 'ok',
        _complior: { metadata: { provider: 'anthropic' }, headers: {} },
      });
    });

    const wrapped = compliorNextjs(handler);
    const res = makeNextRes();
    await wrapped({}, res);

    expect(res.setHeader).toHaveBeenCalledWith('X-AI-Provider', 'anthropic');
  });

  it('injects headers when res.send() is called with string', async () => {
    const body = compliorBody({}, { 'X-Bias-Warning': 'potential-bias-detected' });
    const handler = vi.fn((_req: unknown, res: { send: (b: unknown) => void }) => {
      res.send(body);
    });

    const wrapped = compliorNextjs(handler);
    const res = makeNextRes();
    await wrapped({}, res);

    expect(res.setHeader).toHaveBeenCalledWith('X-Bias-Warning', 'potential-bias-detected');
  });

  it('applies options filtering', async () => {
    const handler = vi.fn((_req: unknown, res: { json: (b: unknown) => void }) => {
      res.json({
        result: 'ok',
        _complior: { metadata: { provider: 'openai', disclosureVerified: true }, headers: {} },
      });
    });

    const wrapped = compliorNextjs(handler, { headers: { include: ['X-AI-Disclosure'] } });
    const res = makeNextRes();
    await wrapped({}, res);

    expect(res.headers['X-AI-Disclosure']).toBe('verified');
    expect(res.headers['X-AI-Provider']).toBeUndefined();
  });
});
