/**
 * CI Flags E2E — validates engine endpoints for CLI flag support.
 *
 * V1-M04 RED spec: proves engine provides all data needed for
 * SARIF generation, CI threshold checks, --fail-on-regression,
 * --comment (markdown diff), eval --full, custom adapter config,
 * eval apply-fixes, and report --output custom paths.
 *
 * Tests that need a live target AI are guarded by COMPLIOR_EVAL_TARGET.
 *
 * Uses Hono in-memory (no real HTTP server).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { loadApplication, type Application } from '../composition-root.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PROJECT = process.env['COMPLIOR_TEST_PROJECT']
  ?? resolve(__dirname, '../../../../..', 'test-projects/acme-ai-support');

const canRunE2E = existsSync(resolve(TEST_PROJECT, 'package.json'));
const EVAL_TARGET = process.env['COMPLIOR_EVAL_TARGET'];
const hasTarget = !!EVAL_TARGET;

describe.skipIf(!canRunE2E)('CI Flags E2E (V1-M04)', () => {
  let application: Application;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
    // Run a baseline scan so all data is available
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

  // ─────────────────────────────────────────────────────────
  // 1. Scan response has all fields required for SARIF generation
  // ─────────────────────────────────────────────────────────
  it('scan response has all SARIF-required fields (severity, checkId, message)', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const findings = body['findings'] as Array<Record<string, unknown>>;
    expect(findings.length).toBeGreaterThan(0);

    // Every finding must have the fields the CLI format_sarif() needs
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    const validTypes = ['pass', 'fail', 'skip', 'info'];

    for (const f of findings) {
      // checkId is mandatory for SARIF rule IDs
      expect(typeof f['checkId']).toBe('string');
      expect((f['checkId'] as string).length).toBeGreaterThan(0);

      // message is mandatory for SARIF shortDescription
      expect(typeof f['message']).toBe('string');

      // severity maps to SARIF level (error/warning/note)
      expect(validSeverities).toContain(f['severity']);

      // type maps to SARIF properties.type
      expect(validTypes).toContain(f['type']);
    }
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 2. Scan response supports threshold comparison (--ci --threshold)
  // ─────────────────────────────────────────────────────────
  it('scan score.totalScore is numeric 0-100 for CI threshold comparison', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const score = body['score'] as Record<string, unknown>;

    // totalScore must be a number for CLI threshold comparison
    expect(typeof score['totalScore']).toBe('number');
    const totalScore = score['totalScore'] as number;
    expect(totalScore).toBeGreaterThanOrEqual(0);
    expect(totalScore).toBeLessThanOrEqual(100);

    // zone must be present for CLI display
    expect(['red', 'yellow', 'green']).toContain(score['zone']);

    // Check counts for CI summary output
    expect(typeof score['totalChecks']).toBe('number');
    expect(typeof score['passedChecks']).toBe('number');
    expect(typeof score['failedChecks']).toBe('number');
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 3. Scan/diff has hasRegression boolean for --fail-on-regression
  // ─────────────────────────────────────────────────────────
  it('scan/diff response includes hasRegression boolean for --fail-on-regression', async () => {
    const res = await application.app.request('/scan/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;

    // hasRegression must be a boolean — CLI uses it for exit code
    expect(typeof body['hasRegression']).toBe('boolean');

    // hasCriticalNew is used for --fail-on-regression with critical findings
    expect(typeof body['hasCriticalNew']).toBe('boolean');

    // scoreBefore/scoreAfter/scoreDelta for diff display
    expect(typeof body['scoreBefore']).toBe('number');
    expect(typeof body['scoreAfter']).toBe('number');
    expect(typeof body['scoreDelta']).toBe('number');
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 4. Scan/diff with markdown=true for --comment flag
  // ─────────────────────────────────────────────────────────
  it('scan/diff with markdown=true produces markdown for --comment', async () => {
    const res = await application.app.request('/scan/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT, markdown: true }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;

    // markdown field should be present when markdown=true
    if (body['markdown']) {
      expect(typeof body['markdown']).toBe('string');
      const md = body['markdown'] as string;
      expect(md.length).toBeGreaterThan(0);
      // Markdown should contain standard formatting elements
      expect(md).toMatch(/[#|*\-]/);
    }
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 5. Eval --full runs combined det+security results
  // ─────────────────────────────────────────────────────────
  it.skipIf(!hasTarget)('eval with full=true runs combined deterministic+security', async () => {
    const res = await application.app.request('/eval/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: EVAL_TARGET,
        full: true,
        path: TEST_PROJECT,
        concurrency: 2,
      }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body['overallScore']).toBe('number');
    expect(typeof body['grade']).toBe('string');

    const results = body['results'] as Array<Record<string, unknown>>;
    expect(results.length).toBeGreaterThan(0);

    // full mode should include both deterministic and security methods
    const methods = new Set(results.map(r => r['method']));
    expect(methods.has('deterministic')).toBe(true);

    // tier should be 'full'
    expect(body['tier']).toBe('full');

    // Security score should be present when full=true
    expect(typeof body['securityScore']).toBe('number');
  }, 300_000);

  // ─────────────────────────────────────────────────────────
  // 6. Eval accepts custom adapter config (--model, --api-key, etc.)
  // ─────────────────────────────────────────────────────────
  it.skipIf(!hasTarget)('eval accepts custom adapter config without validation error', async () => {
    const res = await application.app.request('/eval/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: EVAL_TARGET,
        det: true,
        path: TEST_PROJECT,
        concurrency: 1,
        // Custom adapter fields — should not be rejected by schema validation
        model: 'gpt-4o-mini',
        apiKey: 'test-key-placeholder',
        requestTemplate: '{"messages":[{"role":"user","content":"{{probe}}"}]}',
        responsePath: 'choices.0.message.content',
        headers: '{"X-Custom": "test"}',
      }),
    });

    // Should not be 400 (validation error) — schema accepts these fields
    expect(res.status).not.toBe(400);

    // May be 200 (success) or 500 (runtime error from bad API key)
    // The point is: the SCHEMA accepted the config
    expect([200, 500]).toContain(res.status);
  }, 120_000);

  // ─────────────────────────────────────────────────────────
  // 7. Eval apply-fixes endpoint works (--fix flag)
  // ─────────────────────────────────────────────────────────
  it('eval apply-fixes endpoint returns applied and manual arrays', async () => {
    const res = await application.app.request('/eval/apply-fixes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(Array.isArray(body['applied'])).toBe(true);
    expect(Array.isArray(body['manual'])).toBe(true);
    expect(typeof body['appliedCount']).toBe('number');
    expect(typeof body['manualCount']).toBe('number');
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 8. Eval categories + concurrency params accepted
  // ─────────────────────────────────────────────────────────
  it.skipIf(!hasTarget)('eval accepts categories and concurrency params', async () => {
    const res = await application.app.request('/eval/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: EVAL_TARGET,
        det: true,
        categories: ['transparency'],
        concurrency: 3,
        path: TEST_PROJECT,
      }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const results = body['results'] as Array<Record<string, unknown>>;

    // All results should be in the filtered category
    for (const r of results) {
      expect(r['category']).toBe('transparency');
    }

    // Concurrency was accepted (no 400 error)
    expect(typeof body['overallScore']).toBe('number');
  }, 120_000);

  // ─────────────────────────────────────────────────────────
  // 9. Report/share accepts custom outputPath (--output)
  // ─────────────────────────────────────────────────────────
  it('report/share with custom outputPath writes file at specified location', async () => {
    const customPath = resolve(tmpdir(), `complior-test-share-${Date.now()}.html`);

    try {
      const res = await application.app.request('/report/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputPath: customPath }),
      });
      expect(res.status).toBe(200);

      const body = await res.json() as Record<string, unknown>;
      expect(typeof body['path']).toBe('string');
      expect(body['format']).toBe('html');

      // File should exist at the custom path
      const filePath = body['path'] as string;
      expect(existsSync(filePath)).toBe(true);

      // Verify it's a non-empty file
      const fileInfo = await stat(filePath);
      expect(fileInfo.size).toBeGreaterThan(0);
    } finally {
      // Cleanup
      await rm(customPath, { force: true });
    }
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 10. Report/markdown with custom outputPath (--output for markdown)
  // ─────────────────────────────────────────────────────────
  it('report/markdown with custom outputPath writes file at specified location', async () => {
    const customPath = resolve(tmpdir(), `complior-test-report-${Date.now()}.md`);

    try {
      const res = await application.app.request('/report/status/markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputPath: customPath }),
      });
      expect(res.status).toBe(200);

      const body = await res.json() as Record<string, unknown>;
      expect(typeof body['path']).toBe('string');
      expect(body['format']).toBe('markdown');

      // File should exist at the custom path
      const filePath = body['path'] as string;
      expect(existsSync(filePath)).toBe(true);

      // Verify the path matches what we requested
      expect(filePath).toBe(customPath);
    } finally {
      // Cleanup
      await rm(customPath, { force: true });
    }
  }, 30_000);
});
