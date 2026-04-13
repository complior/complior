/**
 * V1-M08 T-8: Fix Route — filterContext in response — RED test spec.
 *
 * Tests that POST /fix/apply-all response includes filterContext
 * from the last scan result.
 *
 * Uses Hono in-memory testing.
 * This test MUST fail (RED) until nodejs-dev implements T-8.
 */
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createFixRoute } from './fix.route.js';
import type { FixService } from '../../services/fix-service.js';
import type { UndoService } from '../../services/undo-service.js';
import type { ScanFilterContext } from '../../types/common.types.js';

const stubFilterContext: ScanFilterContext = {
  role: 'deployer',
  riskLevel: 'limited',
  domain: 'healthcare',
  profileFound: true,
  totalObligations: 57,
  applicableObligations: 22,
  skippedByRole: 4,
  skippedByRiskLevel: 8,
};

/** Stub fix service that returns deterministic results. */
const stubFixService: FixService = {
  preview: () => null,
  previewAll: () => [],
  previewAllRendered: async () => [],
  applyFix: async () => ({ applied: true, checkId: 'test', action: 'CREATE', path: 'test.md', scoreBefore: 60, scoreAfter: 70 }),
  applyAll: async () => [
    { applied: true, checkId: 'l1-missing-fria', action: 'CREATE', path: 'docs/fria.md', scoreBefore: 60, scoreAfter: 65 },
    { applied: true, checkId: 'l4-bare-api-call', action: 'MODIFY', path: 'src/chat.ts', scoreBefore: 65, scoreAfter: 70 },
  ],
  applyAndValidate: async () => ({ applied: true, checkId: 'test', action: 'CREATE', path: 'test.md', scoreBefore: 60, scoreAfter: 70 }),
  getCurrentScore: () => 60,
  getUnfixedFindings: () => [],
  getLastScanResult: () => ({
    score: {
      totalScore: 68, zone: 'yellow' as const, categoryScores: [],
      criticalCapApplied: false, totalChecks: 10, passedChecks: 7,
      failedChecks: 2, skippedChecks: 1,
    },
    findings: [],
    projectPath: '/test',
    scannedAt: '2026-04-13T10:00:00Z',
    duration: 100,
    filesScanned: 10,
    filterContext: stubFilterContext,
  }),
  getPassportCompleteness: async () => 75,
} as unknown as FixService;

const stubUndoService: UndoService = {
  undoLast: async () => ({ success: true }),
  undoById: async () => ({ success: true }),
  getHistory: async () => ({ fixes: [], totalFixes: 0 }),
  recordFix: async () => {},
} as unknown as UndoService;

/** Create Hono app with fix route. */
const createApp = () => {
  const root = new Hono();
  const fixRoute = createFixRoute({
    fixService: stubFixService,
    undoService: stubUndoService,
  });
  root.route('/', fixRoute);
  return root;
};

describe('POST /fix/apply-all — filterContext (T-8)', () => {
  it('response includes filterContext from last scan result', async () => {
    const app = createApp();
    const res = await app.request('/fix/apply-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;

    // filterContext MUST be present in apply-all response
    expect(body.filterContext).toBeDefined();
    const ctx = body.filterContext as ScanFilterContext;
    expect(ctx.role).toBe('deployer');
    expect(ctx.riskLevel).toBe('limited');
    expect(ctx.profileFound).toBe(true);
  });

  it('filterContext is null when no profile was used', async () => {
    // Override fix service to have no filterContext in scan result
    const noProfileFixService = {
      ...stubFixService,
      getLastScanResult: () => ({
        score: {
          totalScore: 50, zone: 'yellow' as const, categoryScores: [],
          criticalCapApplied: false, totalChecks: 10, passedChecks: 5,
          failedChecks: 5, skippedChecks: 0,
        },
        findings: [],
        projectPath: '/test',
        scannedAt: '2026-04-13T10:00:00Z',
        duration: 100,
        filesScanned: 10,
        // No filterContext
      }),
    } as unknown as FixService;

    const root = new Hono();
    root.route('/', createFixRoute({
      fixService: noProfileFixService,
      undoService: stubUndoService,
    }));

    const res = await root.request('/fix/apply-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const body = await res.json() as Record<string, unknown>;
    // filterContext should be undefined/null when scan had no profile
    expect(body.filterContext ?? null).toBeNull();
  });
});
