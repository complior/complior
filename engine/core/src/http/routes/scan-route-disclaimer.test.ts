/**
 * V1-M24 / R-1: RED runtime test — POST /scan response must include `disclaimer` field.
 *
 * Background:
 *   V1-M21 final E2E shows `complior scan --json | jq '.disclaimer'` returns null.
 *   The CLI calls POST /scan and outputs the response body verbatim. Inspection
 *   of scan.route.ts:101 shows route emits:
 *     c.json({ ...result, topActions, scoreDisclaimer, categoryBreakdown })
 *   where `scoreDisclaimer` is built from buildScoreDisclaimer() — DIFFERENT from
 *   the `disclaimer` field that V1-M22/V1-M23 W-1 added to ScanResult via
 *   buildScanDisclaimer().
 *
 *   Result: V1-M22/V1-M23 wired disclaimer INTO ScanResult, but route format
 *   either:
 *     (a) doesn't read `result.disclaimer` (only spreads ...result, but field
 *         may be missing)
 *     (b) emits it as `scoreDisclaimer` instead of `disclaimer`
 *
 * Specification:
 *   - POST /scan response includes top-level `disclaimer` field
 *   - Field is non-null object (matches eval pattern)
 *   - User invocation `complior scan --json | jq '.disclaimer'` returns object
 *
 * Architecture:
 *   - Route formatter must surface ALL ScanResult fields (no implicit stripping)
 *   - OR route explicitly builds disclaimer and adds to response
 *   - Either way, key name must be `disclaimer` (matches eval response shape)
 */

import { describe, it, expect } from 'vitest';

describe('V1-M24 / R-1: POST /scan response includes disclaimer field', () => {
  it('response body has top-level `disclaimer` key', async () => {
    const { createScanRoute } = await import('./scan.route.js');
    const app = createScanRoute({ scanService: mockScanService() } as never);

    const res = await app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/tmp' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty('disclaimer');
    expect(body['disclaimer']).not.toBeNull();
    expect(body['disclaimer']).not.toBeUndefined();
  });

  it('disclaimer is an object (not just truthy)', async () => {
    const { createScanRoute } = await import('./scan.route.js');
    const app = createScanRoute({ scanService: mockScanService() } as never);

    const res = await app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/tmp' }),
    });

    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body['disclaimer']).toBe('object');
  });

  it('disclaimer contains summary string', async () => {
    const { createScanRoute } = await import('./scan.route.js');
    const app = createScanRoute({ scanService: mockScanService() } as never);

    const res = await app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/tmp' }),
    });

    const body = (await res.json()) as { disclaimer?: { summary?: unknown } };
    expect(typeof body.disclaimer?.summary).toBe('string');
    expect((body.disclaimer?.summary as string).length).toBeGreaterThan(5);
  });
});

// ── Helpers ────────────────────────────────────────────────────────

function mockScanService(): unknown {
  return Object.freeze({
    scan: async () =>
      Object.freeze({
        score: Object.freeze({
          totalScore: 75,
          zone: 'yellow' as const,
          categoryScores: Object.freeze([]),
          criticalCapApplied: false,
          totalChecks: 10,
          passedChecks: 7,
          failedChecks: 3,
          skippedChecks: 0,
        }),
        findings: Object.freeze([]),
        projectPath: '/tmp',
        scannedAt: new Date().toISOString(),
        duration: 0,
        filesScanned: 0,
        // V1-M22 W-1 expected this to be wired:
        disclaimer: Object.freeze({
          summary: 'Scan covers L1-L4 deterministic checks; L5 LLM analysis was not invoked.',
          limitations: Object.freeze([]),
        }),
      }),
    scanDeep: async () => Object.freeze({}),
  });
}
