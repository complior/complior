/**
 * V1-M08 T-4/T-5: Scan Route — filterContext + topActions — RED test spec.
 *
 * Tests that POST /scan response includes:
 * - filterContext (T-4: wired via composition-root → scan-service)
 * - topActions (T-5: top-3 priority actions computed in scan route)
 *
 * Uses Hono in-memory testing (no real server needed).
 * This test MUST fail (RED) until nodejs-dev implements T-4 and T-5.
 */
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createScanRoute } from './scan.route.js';
import type { ScanResult, ScanFilterContext } from '../../types/common.types.js';
import type { ScanService } from '../../services/scan-service.js';

/** Stub scan result with filterContext. */
const stubScanResult: ScanResult = {
  score: {
    totalScore: 68,
    zone: 'yellow',
    categoryScores: [],
    criticalCapApplied: false,
    totalChecks: 15,
    passedChecks: 10,
    failedChecks: 3,
    skippedChecks: 2,
  },
  findings: [
    { checkId: 'l1-missing-fria', type: 'fail', message: 'Missing FRIA', severity: 'high',
      fix: 'Create FRIA document', fixDiff: { before: [], after: ['# FRIA'], startLine: 0, filePath: 'docs/fria.md' } },
    { checkId: 'l4-bare-api-call', type: 'fail', message: 'Bare API call', severity: 'medium',
      fix: 'Wrap with @complior/sdk' },
    { checkId: 'ai-disclosure', type: 'pass', message: 'AI disclosure present', severity: 'info' },
    { checkId: 'qms', type: 'skip', message: 'Skipped: provider-only', severity: 'high' },
    { checkId: 'l3-no-logging', type: 'fail', message: 'No logging', severity: 'medium' },
  ],
  projectPath: '/test-project',
  scannedAt: '2026-04-13T10:00:00Z',
  duration: 500,
  filesScanned: 20,
  filterContext: {
    role: 'deployer',
    riskLevel: 'limited',
    domain: 'healthcare',
    profileFound: true,
    totalObligations: 57,
    applicableObligations: 22,
    skippedByRole: 4,
    skippedByRiskLevel: 8,
  },
};

/** Stub scan service. */
const stubScanService: ScanService = {
  scan: async () => stubScanResult,
  scanDeep: async () => stubScanResult,
  scanTier2: async () => stubScanResult,
  scanLlm: async () => stubScanResult,
  getSbom: async () => ({ bomFormat: 'CycloneDX', specVersion: '1.5', components: [] }) as never,
  scanDiff: async () => ({ added: [], removed: [], changed: [], unchanged: [], hasChanges: false }) as never,
};

/** Create Hono app with scan route. */
const createApp = () => {
  const root = new Hono();
  const scanRoute = createScanRoute({
    scanService: stubScanService,
    getLastScan: () => stubScanResult,
  });
  root.route('/', scanRoute);
  return root;
};

describe('POST /scan — filterContext (T-4)', () => {
  it('response includes filterContext from scan result', async () => {
    const app = createApp();
    const res = await app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/test-project' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;

    // filterContext MUST be present in response
    expect(body.filterContext).toBeDefined();
    const ctx = body.filterContext as ScanFilterContext;
    expect(ctx.role).toBe('deployer');
    expect(ctx.riskLevel).toBe('limited');
    expect(ctx.domain).toBe('healthcare');
    expect(ctx.profileFound).toBe(true);
    expect(ctx.totalObligations).toBe(57);
    expect(ctx.applicableObligations).toBe(22);
    expect(ctx.skippedByRole).toBe(4);
    expect(ctx.skippedByRiskLevel).toBe(8);
  });
});

describe('POST /scan — topActions (T-5)', () => {
  it('response includes topActions array', async () => {
    const app = createApp();
    const res = await app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/test-project' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;

    // topActions MUST be present
    expect(body.topActions).toBeDefined();
    expect(Array.isArray(body.topActions)).toBe(true);
  });

  it('topActions contains at most 3 items', async () => {
    const app = createApp();
    const res = await app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/test-project' }),
    });

    const body = await res.json() as { topActions: unknown[] };
    expect(body.topActions.length).toBeLessThanOrEqual(3);
  });

  it('each topAction has required fields', async () => {
    const app = createApp();
    const res = await app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/test-project' }),
    });

    const body = await res.json() as { topActions: Record<string, unknown>[] };
    if (body.topActions.length === 0) return; // no findings → no actions (valid)

    const action = body.topActions[0]!;
    // Each action must have these fields for CLI rendering
    expect(typeof action.id).toBe('string');
    expect(typeof action.title).toBe('string');
    expect(typeof action.severity).toBe('string');
    expect(typeof action.command).toBe('string');
  });
});
