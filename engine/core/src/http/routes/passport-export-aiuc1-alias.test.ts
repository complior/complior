/**
 * V1-M23 / W-4: RED runtime test — passport export route must accept `aiuc1` alias.
 *
 * Background:
 *   V1-M22 D-1 task: rust CLI accepts `--format aiuc1` (value_parser includes it).
 *   But V1-M21 re-run showed:
 *     $ complior passport export <name> --format aiuc1
 *     Exporting passport '<name>' as aiuc1...
 *     Error: Invalid "format" — must be a2a, aiuc-1, or nist
 *
 *   ROOT CAUSE (engine/core/src/http/routes/passport.route.ts:159):
 *     const validFormats = ['a2a', 'aiuc-1', 'nist'] as const;
 *                                       ↑ no 'aiuc1' alias
 *
 *   CLI accepts aiuc1, sends to engine, engine rejects. Two-layer config drift.
 *
 * Specification:
 *   - GET /passport/export?name=X&format=aiuc1 → 200 (treated as aiuc-1)
 *   - GET /passport/export?name=X&format=aiuc-1 → 200 (canonical)
 *   - GET /passport/export?name=X&format=invalid → 4xx
 *   - Both aliases produce identical output
 *
 * Architecture:
 *   - Add aiuc1 to validFormats list
 *   - Normalize aiuc1 → aiuc-1 before passing to service
 *   - Single source of truth for format aliases
 */

import { describe, it, expect } from 'vitest';

describe('V1-M23 / W-4: GET /passport/export accepts aiuc1 as alias', () => {
  it('format=aiuc1 returns 200, not 4xx', async () => {
    const { createPassportRoute } = await import('./passport.route.js');
    const app = createPassportRoute(mockPassportService());

    const res = await app.request('/passport/export?name=test-agent&format=aiuc1');

    expect(res.status).toBe(200);
  });

  it('format=aiuc-1 returns 200 (canonical form still works)', async () => {
    const { createPassportRoute } = await import('./passport.route.js');
    const app = createPassportRoute(mockPassportService());

    const res = await app.request('/passport/export?name=test-agent&format=aiuc-1');

    expect(res.status).toBe(200);
  });

  it('format=aiuc1 and format=aiuc-1 return identical output', async () => {
    const { createPassportRoute } = await import('./passport.route.js');
    const app = createPassportRoute(mockPassportService());

    const r1 = await app.request('/passport/export?name=test-agent&format=aiuc1');
    const r2 = await app.request('/passport/export?name=test-agent&format=aiuc-1');

    const b1 = (await r1.json()) as Record<string, unknown>;
    const b2 = (await r2.json()) as Record<string, unknown>;
    expect(b1).toStrictEqual(b2);
  });

  it('format=garbage still returns 4xx (validation still works)', async () => {
    const { createPassportRoute } = await import('./passport.route.js');
    const app = createPassportRoute(mockPassportService());

    const res = await app.request('/passport/export?name=test-agent&format=garbage');

    expect(res.status).toBeGreaterThanOrEqual(400);
    // Note: 500 is returned when ValidationError is thrown outside global error handler
    // (test creates route in isolation without createRouter wrapper)
    expect(res.status).toBeLessThanOrEqual(500);
  });
});

// ── Helpers ────────────────────────────────────────────────────────

function mockPassportService(): unknown {
  return Object.freeze({
    initPassport: async () => ({ manifests: [], savedPaths: [], skipped: [] }),
    listPassports: async () => [],
    showPassport: async () => null,
    notifyWorkers: async () => ({ path: '/tmp/x.md', content: '' }),
    exportPassportToFormat: async (name: string, format: string) =>
      Object.freeze({
        format: format === 'aiuc1' ? 'aiuc-1' : format,
        content: `{"agent":"${name}"}`,
      }),
    validatePassport: async () => ({ valid: true }),
    completeness: async () => ({ percent: 100 }),
    autonomy: async () => ({ level: 'L3' }),
    evidenceList: async () => [],
    verifyEvidence: async () => ({ valid: true }),
    registry: async () => [],
    permissions: async () => ({ allowed: [], denied: [] }),
    auditTrail: async () => [],
    auditSummary: async () => ({ total: 0 }),
    readinessReport: async () => ({ score: 0 }),
    importPassport: async () => ({ saved: true }),
    auditPackage: async () => ({ path: '/tmp/x.zip' }),
    auditPackageMeta: async () => ({ count: 0 }),
    diffPassports: async () => ({ added: [], removed: [] }),
    renamePassport: async () => ({ success: true }),
  });
}
