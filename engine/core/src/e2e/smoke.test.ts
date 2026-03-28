/**
 * E2E Smoke Test — validates the full engine pipeline works end-to-end.
 *
 * Uses Hono's `app.request()` (no real HTTP server needed).
 * Scans the `test-projects/acme-ai-support/` fixture project.
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

describe.skipIf(!canRunE2E)('E2E Smoke Test', () => {
  let application: Application;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
  }, 30_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('GET /health returns ok', async () => {
    const res = await application.app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('GET /status returns engine status', async () => {
    const res = await application.app.request('/status');
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body['ready']).toBe(true);
    expect(typeof body['version']).toBe('string');
    expect(typeof body['mode']).toBe('string');
  });

  it('POST /scan returns a valid ScanResult', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;

    // Top-level fields
    expect(typeof body['projectPath']).toBe('string');
    expect(typeof body['scannedAt']).toBe('string');
    expect(typeof body['duration']).toBe('number');
    expect(typeof body['filesScanned']).toBe('number');
    expect(Array.isArray(body['findings'])).toBe(true);

    // Score breakdown
    const score = body['score'] as Record<string, unknown>;
    expect(typeof score['totalScore']).toBe('number');
    expect(['red', 'yellow', 'green']).toContain(score['zone']);
    expect(typeof score['totalChecks']).toBe('number');
    expect(typeof score['passedChecks']).toBe('number');
    expect(typeof score['failedChecks']).toBe('number');
  }, 30_000);

  it('POST /scan with invalid body returns 400', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('scan produces findings for test project', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    const body = await res.json() as Record<string, unknown>;
    const findings = body['findings'] as Array<Record<string, unknown>>;

    // Test project should have some findings
    expect(findings.length).toBeGreaterThan(0);

    // Each finding should have required fields
    for (const f of findings) {
      expect(typeof f['checkId']).toBe('string');
      expect(['pass', 'fail', 'skip']).toContain(f['type']);
      expect(typeof f['message']).toBe('string');
    }
  }, 30_000);
});
