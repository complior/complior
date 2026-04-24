/**
 * V1-M23 / W-3: RED runtime test — POST /passport/notify route must be registered.
 *
 * Background:
 *   V1-M22 added `passportService.notifyWorkers(name)` and unit test passed.
 *   But V1-M21 re-run on eval-target showed:
 *     $ complior passport notify eval-target-anthropic
 *     Error: Failed to generate worker notification: HTTP 404 Not Found
 *
 *   Inspection of `passport.route.ts` confirms: only init/list/show/rename/
 *   autonomy/validate/completeness/export/evidence/registry/permissions/audit/
 *   readiness/import/audit-package/diff routes registered. NO /passport/notify.
 *
 *   nodejs-dev wrote the service method, wrote a unit test that calls the
 *   service method directly (passing route layer), but never wired the HTTP route.
 *
 * Specification:
 *   - `POST /passport/notify` is registered on passport route group
 *   - Body: `{ name: string }` (validated via Zod)
 *   - Returns 200 with `{ path, format }` when agent exists
 *   - Returns 404 when agent name is missing/invalid (NOT "route not found")
 *   - Persists notification to `.complior/notifications/{agent}-{YYYY-MM-DD}.md`
 *
 * Architecture:
 *   - Route factory fn pattern (matches existing routes)
 *   - Body validation via Zod schema
 *   - Calls passportService.notifyWorkers(body.name)
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';

describe('V1-M23 / W-3: POST /passport/notify route is registered', () => {
  it('passport route group includes POST /passport/notify', async () => {
    const { createPassportRoute } = await import('./passport.route.js');
    const app = createPassportRoute(mockPassportService());

    const res = await app.request('/passport/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-agent' }),
    });

    // Must NOT be 404 (route not found)
    expect(res.status).not.toBe(404);
  });

  it('POST /passport/notify with valid body returns 200', async () => {
    const { createPassportRoute } = await import('./passport.route.js');
    const app = createPassportRoute(mockPassportService());

    const res = await app.request('/passport/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-agent' }),
    });

    expect(res.status).toBe(200);
  });

  it('response body contains generated notification path', async () => {
    const { createPassportRoute } = await import('./passport.route.js');
    const app = createPassportRoute(mockPassportService());

    const res = await app.request('/passport/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-agent' }),
    });

    const body = (await res.json()) as { path?: string };
    expect(body.path).toBeTruthy();
    expect(body.path).toMatch(/notifications.*test-agent/);
  });

  it('POST /passport/notify with invalid body returns 4xx', async () => {
    const { createPassportRoute } = await import('./passport.route.js');
    const app = createPassportRoute(mockPassportService());

    const res = await app.request('/passport/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // no `name` field
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

// ── Helpers ────────────────────────────────────────────────────────

function mockPassportService(): unknown {
  return Object.freeze({
    initPassport: async () => ({ manifests: [], savedPaths: [], skipped: [] }),
    listPassports: async () => [Object.freeze({ name: 'test-agent', kind: 'deployer_agent' })],
    showPassport: async () => null,
    notifyWorkers: async (name: string) =>
      Object.freeze({
        path: `/tmp/.complior/notifications/${name}-2026-04-24.md`,
        content: '# Worker Notification (Art. 26(7))\n\nWorker info...\n',
      }),
    // Stub the rest to avoid TypeError if route validation triggers them
    validatePassport: async () => ({ valid: true }),
    completeness: async () => ({ percent: 100 }),
    autonomy: async () => ({ level: 'L3' }),
    exportPassport: async () => ({ format: 'aiuc-1', content: '{}' }),
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
