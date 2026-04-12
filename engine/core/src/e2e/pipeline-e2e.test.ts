/**
 * Pipeline E2E Test — validates the full compliance pipeline works end-to-end.
 *
 * V1-M01 RED spec: proves init → scan → fix → rescan → report pipeline
 * works as a cohesive unit through Hono in-memory requests.
 *
 * Tests:
 *   1. scan produces score in 0-100 range
 *   2. scan → fix → rescan → score improves
 *   3. report contains all 6 sections
 *   4. report HTML export produces valid HTML
 *   5. eval deterministic → test results (skipped if no target)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { loadApplication, type Application } from '../composition-root.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PROJECT = process.env['COMPLIOR_TEST_PROJECT']
  ?? resolve(__dirname, '../../../../..', 'test-projects/acme-ai-support');

const canRunE2E = existsSync(resolve(TEST_PROJECT, 'package.json'));

// Clean up generated artifacts before/after (non-fatal on permission errors)
const cleanup = async () => {
  try {
    await rm(resolve(TEST_PROJECT, '.complior', 'reports'), { recursive: true, force: true });
  } catch { /* non-fatal */ }
};

describe.skipIf(!canRunE2E)('Pipeline E2E', () => {
  let application: Application;

  beforeAll(async () => {
    await cleanup();
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
  }, 30_000);

  afterAll(async () => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
    await cleanup();
  });

  // ─────────────────────────────────────────────────────────
  // Test 1: scan produces score in valid range
  // ─────────────────────────────────────────────────────────
  it('scan produces score in 0-100 range', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const score = body['score'] as Record<string, unknown>;
    const totalScore = score['totalScore'] as number;

    expect(totalScore).toBeGreaterThanOrEqual(0);
    expect(totalScore).toBeLessThanOrEqual(100);
    expect(typeof totalScore).toBe('number');
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // Test 2: scan → fix → rescan → score improves (or stays same)
  // ─────────────────────────────────────────────────────────
  it('scan then fix then rescan — score does not decrease', async () => {
    // Step 1: Initial scan
    const scan1 = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(scan1.status).toBe(200);
    const scan1Body = await scan1.json() as Record<string, unknown>;
    const score1 = (scan1Body['score'] as Record<string, unknown>)['totalScore'] as number;

    // Step 2: Apply all deterministic fixes
    const fixRes = await application.app.request('/fix/apply-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ useAi: false, projectPath: TEST_PROJECT }),
    });
    expect(fixRes.status).toBe(200);
    const fixBody = await fixRes.json() as Record<string, unknown>;
    const summary = fixBody['summary'] as Record<string, unknown>;
    expect(typeof summary['applied']).toBe('number');

    // Step 3: Re-scan after fix
    const scan2 = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(scan2.status).toBe(200);
    const scan2Body = await scan2.json() as Record<string, unknown>;
    const score2 = (scan2Body['score'] as Record<string, unknown>)['totalScore'] as number;

    // Score should not decrease after applying fixes
    expect(score2).toBeGreaterThanOrEqual(score1);
  }, 60_000);

  // ─────────────────────────────────────────────────────────
  // Test 3: report contains all 6 sections
  // ─────────────────────────────────────────────────────────
  it('report contains all 6 required sections', async () => {
    // Ensure we have scan data
    await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });

    const res = await application.app.request('/report/status');
    expect(res.status).toBe(200);

    const report = await res.json() as Record<string, unknown>;

    // Section 1: Readiness Dashboard
    const readiness = report['readiness'] as Record<string, unknown>;
    expect(typeof readiness['readinessScore']).toBe('number');
    expect(['red', 'orange', 'yellow', 'green']).toContain(readiness['zone']);

    // Section 2: Document Inventory
    const documents = report['documents'] as Record<string, unknown>;
    expect(typeof documents['total']).toBe('number');
    expect(typeof documents['score']).toBe('number');

    // Section 3: Obligation Coverage
    const obligations = report['obligations'] as Record<string, unknown>;
    expect(typeof obligations['total']).toBe('number');
    expect(typeof obligations['coveragePercent']).toBe('number');

    // Section 4: Passport Status
    const passports = report['passports'] as Record<string, unknown>;
    expect(typeof passports['totalAgents']).toBe('number');
    expect(Array.isArray(passports['passports'])).toBe(true);

    // Section 5: Action Plan
    const actionPlan = report['actionPlan'] as Record<string, unknown>;
    expect(typeof actionPlan['totalActions']).toBe('number');
    expect(Array.isArray(actionPlan['actions'])).toBe(true);

    // Section 6: Summary
    const summary = report['summary'] as Record<string, unknown>;
    expect(typeof summary['readinessScore']).toBe('number');
    expect(typeof summary['daysUntilEnforcement']).toBe('number');
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // Test 4: HTML report export produces valid HTML file
  // ─────────────────────────────────────────────────────────
  it('report HTML export produces valid HTML with key sections', async () => {
    const res = await application.app.request('/report/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const htmlPath = body['path'] as string;
    expect(typeof htmlPath).toBe('string');
    expect(htmlPath).toMatch(/\.html$/);

    // Read the generated HTML file
    const html = await readFile(htmlPath, 'utf-8');

    // Valid HTML structure
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('<body');

    // Key content sections present
    expect(html).toContain('Complior'); // branding
    expect(html.length).toBeGreaterThan(1000); // non-trivial content
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // Test 5: eval deterministic produces test results
  //   (skipped if no COMPLIOR_EVAL_TARGET env var)
  // ─────────────────────────────────────────────────────────
  it.skipIf(!process.env['COMPLIOR_EVAL_TARGET'])(
    'eval deterministic produces test results',
    async () => {
      const target = process.env['COMPLIOR_EVAL_TARGET']!;

      const res = await application.app.request('/eval/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          mode: 'deterministic',
          path: TEST_PROJECT,
        }),
      });
      expect(res.status).toBe(200);

      const result = await res.json() as Record<string, unknown>;
      expect(typeof result['overallScore']).toBe('number');
      expect(typeof result['totalTests']).toBe('number');

      const totalTests = result['totalTests'] as number;
      expect(totalTests).toBeGreaterThan(0);
    },
    120_000,
  );
});
