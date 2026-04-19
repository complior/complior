import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFixRoute, type FixRouteDeps } from './fix.route.js';
import type { FixService } from '../../services/fix-service.js';
import type { UndoService } from '../../services/undo-service.js';
import type { PassportService } from '../../services/passport-service.js';

/** Minimal mock that satisfies the route's usage of FixService. */
const createMockFixService = (overrides: Partial<FixService> = {}): FixService =>
  ({
    preview: vi.fn().mockReturnValue(null),
    previewAll: vi.fn().mockReturnValue([{ checkId: 'l1-fria', actions: [{ type: 'create', path: 'docs/fria.md', description: 'Create FRIA doc' }] }]),
    applyFix: vi.fn().mockResolvedValue({ applied: true }),
    applyAll: vi.fn().mockResolvedValue([{ applied: true, scoreBefore: 40, scoreAfter: 60 }]),
    applyAndValidate: vi.fn().mockResolvedValue({ applied: true, validation: {} }),
    applyAllAndValidate: vi.fn().mockResolvedValue({ results: [], totalDelta: 0 }),
    getUnfixedFindings: vi.fn().mockReturnValue([]),
    getCurrentScore: vi.fn().mockReturnValue(40),
    ...overrides,
  }) as unknown as FixService;

const createMockUndoService = (): UndoService =>
  ({
    undoLast: vi.fn().mockResolvedValue({}),
    undoById: vi.fn().mockResolvedValue({}),
    getHistory: vi.fn().mockResolvedValue([]),
  }) as unknown as UndoService;

const createMockPassportService = (overrides: Partial<PassportService> = {}): PassportService =>
  ({
    generateDocByType: vi.fn().mockResolvedValue({ savedPath: 'docs/test.md', prefilledFields: 5, manualFields: ['field1'] }),
    generateAllDocs: vi.fn().mockResolvedValue({ documents: [{ docType: 'ai-literacy', savedPath: 'docs/test.md' }], total: 1 }),
    listPassports: vi.fn().mockResolvedValue([]),
    ...overrides,
  }) as unknown as PassportService;

/** Parse an SSE text body into an array of { event, data } objects. */
const parseSSE = (text: string): { event: string; data: string }[] => {
  const events: { event: string; data: string }[] = [];
  let currentEvent = '';
  for (const line of text.split('\n')) {
    if (line.startsWith('event:')) {
      currentEvent = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      events.push({ event: currentEvent, data: line.slice('data:'.length).trim() });
      currentEvent = '';
    }
  }
  return events;
};

describe('fix route', () => {
  let fixService: FixService;
  let undoService: UndoService;
  let passportService: PassportService;
  let deps: FixRouteDeps;

  beforeEach(() => {
    fixService = createMockFixService();
    undoService = createMockUndoService();
    passportService = createMockPassportService();
    deps = { fixService, undoService, passportService };
  });

  describe('GET /fix/preview', () => {
    it('returns preview plans', async () => {
      const app = createFixRoute(deps);
      const res = await app.request('/fix/preview');
      expect(res.status).toBe(200);
      const body = await res.json() as { count: number };
      expect(body.count).toBe(1);
    });
  });

  describe('POST /fix/apply-all', () => {
    it('returns summary with scores', async () => {
      const app = createFixRoute(deps);
      const res = await app.request('/fix/apply-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useAi: false }),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { summary: { applied: number } };
      expect(body.summary.applied).toBe(1);
    });
  });

  describe('POST /fix/apply-all/stream', () => {
    it('emits fix:start and fix:done events', async () => {
      const app = createFixRoute(deps);
      const res = await app.request('/fix/apply-all/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useAi: false }),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');

      const text = await res.text();
      const events = parseSSE(text);

      const eventTypes = events.map((e) => e.event);
      expect(eventTypes).toContain('fix:start');
      expect(eventTypes).toContain('fix:done');
    });

    it('emits heartbeat events during slow applyAll', async () => {
      // Use fake timers so we can advance time without waiting 15s
      vi.useFakeTimers();

      // applyAll takes ~45s (simulated) — should trigger heartbeats
      const slowFixService = createMockFixService({
        applyAll: vi.fn().mockImplementation(async () => {
          // Advance 45s in fake time — should trigger 3 heartbeats at 15s intervals
          await vi.advanceTimersByTimeAsync(45_000);
          return [{ applied: true, scoreBefore: 40, scoreAfter: 60 }];
        }),
      });

      const app = createFixRoute({ fixService: slowFixService, undoService });
      const res = await app.request('/fix/apply-all/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useAi: true }),
      });

      const text = await res.text();
      const events = parseSSE(text);
      const heartbeats = events.filter((e) => e.event === 'heartbeat');

      // 45s / 15s = 3 heartbeats
      expect(heartbeats.length).toBeGreaterThanOrEqual(2);

      // Each heartbeat should have a ts field
      for (const hb of heartbeats) {
        const parsed = JSON.parse(hb.data) as { ts: number };
        expect(parsed.ts).toBeTypeOf('number');
      }

      // Should still have fix:start and fix:done
      const eventTypes = events.map((e) => e.event);
      expect(eventTypes).toContain('fix:start');
      expect(eventTypes).toContain('fix:done');

      vi.useRealTimers();
    });

    it('does not emit heartbeat after applyAll completes (interval cleared)', async () => {
      vi.useFakeTimers();

      // applyAll resolves after 5s — no heartbeat should fire (interval is 15s)
      const quickFixService = createMockFixService({
        applyAll: vi.fn().mockImplementation(async () => {
          await vi.advanceTimersByTimeAsync(5_000);
          return [{ applied: true, scoreBefore: 40, scoreAfter: 60 }];
        }),
      });

      const app = createFixRoute({ fixService: quickFixService, undoService });
      const res = await app.request('/fix/apply-all/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useAi: false }),
      });

      const text = await res.text();
      const events = parseSSE(text);
      const heartbeats = events.filter((e) => e.event === 'heartbeat');

      // 5s < 15s interval — no heartbeats should have fired
      expect(heartbeats.length).toBe(0);

      vi.useRealTimers();
    });

    it('clears heartbeat interval even when applyAll throws', async () => {
      const clearSpy = vi.spyOn(globalThis, 'clearInterval');

      const failingFixService = createMockFixService({
        applyAll: vi.fn().mockRejectedValue(new Error('LLM timeout')),
      });

      const app = createFixRoute({ fixService: failingFixService, undoService });
      const res = await app.request('/fix/apply-all/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useAi: true }),
      });

      const text = await res.text();
      const events = parseSSE(text);

      // Should emit fix:error
      expect(events.map((e) => e.event)).toContain('fix:error');

      // clearInterval should still have been called (finally block)
      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });
  });

  // ── C-M04 T-2: fix --doc all — "all" accepted and delegates to generateAllDocs ─────

  describe('POST /fix/doc/generate', () => {
    it('accepts docType "all" and calls generateAllDocs (B-04)', async () => {
      const app = createFixRoute(deps);
      const res = await app.request('/fix/doc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'my-bot', docType: 'all', path: '/tmp' }),
      });

      expect(res.status).toBe(200);
      expect(passportService.generateAllDocs).toHaveBeenCalledWith(
        'my-bot',
        '/tmp',
        { organization: undefined },
      );
      // generateDocByType should NOT be called for "all"
      expect(passportService.generateDocByType).not.toHaveBeenCalled();
    });

    it('still calls generateDocByType for specific doc types (B-04 regression)', async () => {
      const app = createFixRoute(deps);
      const res = await app.request('/fix/doc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'my-bot', docType: 'ai-literacy', path: '/tmp' }),
      });

      expect(res.status).toBe(200);
      expect(passportService.generateDocByType).toHaveBeenCalledWith(
        'my-bot',
        'ai-literacy',
        '/tmp',
        { organization: undefined },
      );
      expect(passportService.generateAllDocs).not.toHaveBeenCalled();
    });
  });
});
