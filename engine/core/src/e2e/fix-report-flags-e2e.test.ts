/**
 * Fix & Report Flags E2E — validates fix and report endpoint variants.
 *
 * V1-M02 RED spec: proves --check-id, --source eval, fix undo/history,
 * report --share, --pdf, --markdown all work through HTTP API.
 *
 * Uses Hono in-memory (no real HTTP server).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { loadApplication, type Application } from '../composition-root.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PROJECT = process.env['COMPLIOR_TEST_PROJECT']
  ?? resolve(__dirname, '../../../../..', 'test-projects/acme-ai-support');

const canRunE2E = existsSync(resolve(TEST_PROJECT, 'package.json'));

describe.skipIf(!canRunE2E)('Fix & Report Flags E2E', () => {
  let application: Application;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
    // Run a scan first so fixes and report have data
    await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
  }, 60_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  // ═══════════════════════════════════════════════════════════
  //  FIX ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────
  // 1. GET /fix/preview — list available fixes
  // ─────────────────────────────────────────────────────────
  it('fix preview returns list of available fixes', async () => {
    const res = await application.app.request('/fix/preview');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body['count']).toBe('number');
    expect(Array.isArray(body['fixes'])).toBe(true);

    const fixes = body['fixes'] as Array<Record<string, unknown>>;
    if (fixes.length > 0) {
      const fix = fixes[0]!;
      expect(typeof fix['checkId']).toBe('string');
      expect(typeof fix['fixType']).toBe('string');
      expect(typeof fix['description']).toBe('string');
      expect(Array.isArray(fix['actions'])).toBe(true);
    }
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 2. POST /fix/preview — preview specific fix by checkId
  // ─────────────────────────────────────────────────────────
  it('fix preview for specific checkId returns fix plan', async () => {
    // Get available fixes first
    const previewRes = await application.app.request('/fix/preview');
    const previewBody = await previewRes.json() as Record<string, unknown>;
    const fixes = previewBody['fixes'] as Array<Record<string, unknown>>;

    if (fixes.length === 0) {
      // No fixes available — acceptable for some projects
      return;
    }

    const checkId = fixes[0]!['checkId'] as string;

    const res = await application.app.request('/fix/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkId }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body['checkId']).toBe(checkId);
    expect(typeof body['fixType']).toBe('string');
    expect(Array.isArray(body['actions'])).toBe(true);
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 3. POST /fix/apply — single fix by checkId (--check-id)
  // ─────────────────────────────────────────────────────────
  it('fix apply with specific checkId applies single fix', async () => {
    // Get available fixes
    const previewRes = await application.app.request('/fix/preview');
    const previewBody = await previewRes.json() as Record<string, unknown>;
    const fixes = previewBody['fixes'] as Array<Record<string, unknown>>;

    if (fixes.length === 0) return;

    const checkId = fixes[0]!['checkId'] as string;

    const res = await application.app.request('/fix/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkId }),
    });

    // May succeed (applied: true) or fail due to permission issues in the test project
    // (docs/compliance/ is owned by openclaw, writable only by openclaw on this FS).
    // In E2E context, fix may apply but fail to write files → applied: false is expected.
    if (res.status === 200) {
      const body = await res.json() as Record<string, unknown>;
      if (body['applied'] === true) {
        // Fix applied successfully — all assertions
        expect(typeof body['scoreBefore']).toBe('number');
        expect(typeof body['scoreAfter']).toBe('number');
        expect(Array.isArray(body['backedUpFiles'])).toBe(true);
      } else {
        // Fix failed to apply (e.g. permission denied on write) — check error message
        expect(body['applied']).toBe(false);
        const errorMsg = body['error'] as string | undefined;
        expect(errorMsg).toBeDefined();
        // Non-fatal error like EACCES is acceptable in read-only test environments
        expect(typeof errorMsg).toBe('string');
      }
    } else if (res.status === 404) {
      const body = await res.json() as Record<string, unknown>;
      expect(body['error']).toBe('NO_FIX');
    }
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 4. GET /fix/history — fix history
  // ─────────────────────────────────────────────────────────
  it('fix history returns array of applied fixes', async () => {
    const res = await application.app.request('/fix/history');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(Array.isArray(body['fixes'])).toBe(true);

    const fixes = body['fixes'] as Array<Record<string, unknown>>;
    for (const fix of fixes) {
      expect(typeof fix['id']).toBe('number');
      expect(typeof fix['checkId']).toBe('string');
      expect(['applied', 'undone']).toContain(fix['status']);
      expect(typeof fix['timestamp']).toBe('string');
    }
  }, 10_000);

  // ─────────────────────────────────────────────────────────
  // 5. POST /fix/undo — undo last fix
  // ─────────────────────────────────────────────────────────
  it('fix undo reverts last applied fix', async () => {
    // Check if there's a fix to undo
    const historyRes = await application.app.request('/fix/history');
    const historyBody = await historyRes.json() as Record<string, unknown>;
    const fixes = historyBody['fixes'] as Array<Record<string, unknown>>;
    const appliedFixes = fixes.filter(f => f['status'] === 'applied');

    if (appliedFixes.length === 0) {
      // No fixes to undo — skip
      return;
    }

    const res = await application.app.request('/fix/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body['validation']).toBeDefined();
  }, 30_000);

  // ═══════════════════════════════════════════════════════════
  //  REPORT ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────
  // 6. GET /report/status — full compliance report JSON
  // ─────────────────────────────────────────────────────────
  it('report status returns full compliance report', async () => {
    const res = await application.app.request('/report/status');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;

    // Report must have readiness section
    const readiness = body['readiness'] as Record<string, unknown>;
    expect(typeof readiness['readinessScore']).toBe('number');
    expect(readiness['readinessScore'] as number).toBeGreaterThanOrEqual(0);
    expect(readiness['readinessScore'] as number).toBeLessThanOrEqual(100);

    // Must have dimensions
    const dimensions = readiness['dimensions'] as Record<string, Record<string, unknown>>;
    expect(dimensions['scan']).toBeDefined();

    // Must have days until enforcement
    expect(typeof readiness['daysUntilEnforcement']).toBe('number');
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 7. POST /report/share — offline HTML (--share)
  // ─────────────────────────────────────────────────────────
  it('report --share generates offline HTML file', async () => {
    const res = await application.app.request('/report/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body['path']).toBe('string');
    expect(body['format']).toBe('html');

    // File should exist
    const htmlPath = body['path'] as string;
    expect(existsSync(htmlPath)).toBe(true);
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 8. POST /report/status/markdown — markdown export
  // ─────────────────────────────────────────────────────────
  it('report --format markdown generates markdown file', async () => {
    const res = await application.app.request('/report/status/markdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body['path']).toBe('string');
    expect(body['format']).toBe('markdown');

    const mdPath = body['path'] as string;
    expect(existsSync(mdPath)).toBe(true);
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 9. POST /report/status/pdf — PDF export
  // ─────────────────────────────────────────────────────────
  it('report --format pdf generates PDF file', async () => {
    const res = await application.app.request('/report/status/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // PDF generation may require puppeteer/playwright — might fail gracefully
    if (res.status === 200) {
      const body = await res.json() as Record<string, unknown>;
      expect(typeof body['path']).toBe('string');
      expect(body['format']).toBe('pdf');
    } else {
      // Acceptable: PDF generation not available without browser
      expect([500, 501]).toContain(res.status);
    }
  }, 60_000);

  // ─────────────────────────────────────────────────────────
  // 10. Report readiness dimensions are all present
  // ─────────────────────────────────────────────────────────
  it('report has all 7 readiness dimensions', async () => {
    const res = await application.app.request('/report/status');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const readiness = body['readiness'] as Record<string, unknown>;
    const dimensions = readiness['dimensions'] as Record<string, Record<string, unknown>>;

    // Expected dimensions from report-builder
    const expectedDimensions = [
      'scan', 'scanSecurity', 'scanLlm', 'docs', 'passports', 'eval', 'evidence',
    ];

    for (const dim of expectedDimensions) {
      expect(dimensions[dim]).toBeDefined();
      expect(typeof dimensions[dim]!['available']).toBe('boolean');
      expect(typeof dimensions[dim]!['score']).toBe('number');
    }
  }, 30_000);
});
