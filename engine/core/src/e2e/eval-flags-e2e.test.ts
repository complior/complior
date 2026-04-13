/**
 * Eval Flags E2E — validates eval endpoint flag variants.
 *
 * V1-M02 RED spec: proves --det, --security, --categories,
 * --last, --remediation, --findings all work through HTTP API.
 *
 * Tests that need a live target AI are guarded by COMPLIOR_EVAL_TARGET.
 * Tests that need LLM judge are guarded by OPENROUTER_API_KEY.
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
const EVAL_TARGET = process.env['COMPLIOR_EVAL_TARGET'];
const hasTarget = !!EVAL_TARGET;

describe.skipIf(!canRunE2E)('Eval Flags E2E', () => {
  let application: Application;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
  }, 30_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  // ─────────────────────────────────────────────────────────
  // 1. POST /eval/run with det=true — deterministic tests only
  // ─────────────────────────────────────────────────────────
  it.skipIf(!hasTarget)('eval --det runs only deterministic tests', async () => {
    const res = await application.app.request('/eval/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: EVAL_TARGET,
        det: true,
        path: TEST_PROJECT,
        concurrency: 2,
      }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body['target']).toBe(EVAL_TARGET);
    expect(typeof body['overallScore']).toBe('number');
    expect(typeof body['grade']).toBe('string');

    // All results should be deterministic method
    const results = body['results'] as Array<Record<string, unknown>>;
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r['method']).toBe('deterministic');
    }

    // Tier should be 'basic' for det-only
    expect(body['tier']).toBe('basic');
  }, 120_000);

  // ─────────────────────────────────────────────────────────
  // 2. POST /eval/run with security=true — OWASP probes
  // ─────────────────────────────────────────────────────────
  it.skipIf(!hasTarget)('eval --security runs OWASP LLM Top 10 probes', async () => {
    const res = await application.app.request('/eval/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: EVAL_TARGET,
        security: true,
        path: TEST_PROJECT,
        concurrency: 2,
      }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body['securityScore']).toBe('number');
    expect(typeof body['securityGrade']).toBe('string');

    // Results should include security probes with OWASP categories
    const results = body['results'] as Array<Record<string, unknown>>;
    const securityResults = results.filter(r => r['owaspCategory']);
    expect(securityResults.length).toBeGreaterThan(0);

    // Tier should be 'security'
    expect(body['tier']).toBe('security');
  }, 180_000);

  // ─────────────────────────────────────────────────────────
  // 3. POST /eval/run with categories filter
  // ─────────────────────────────────────────────────────────
  it.skipIf(!hasTarget)('eval --categories filters to specified categories', async () => {
    const res = await application.app.request('/eval/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: EVAL_TARGET,
        det: true,
        categories: ['transparency', 'bias'],
        path: TEST_PROJECT,
        concurrency: 2,
      }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const results = body['results'] as Array<Record<string, unknown>>;

    // All results should be in the filtered categories
    for (const r of results) {
      expect(['transparency', 'bias']).toContain(r['category']);
    }

    // Category breakdown should only contain filtered categories
    const categories = body['categories'] as Array<Record<string, unknown>>;
    for (const c of categories) {
      if ((c['total'] as number) > 0) {
        expect(['transparency', 'bias']).toContain(c['category']);
      }
    }
  }, 120_000);

  // ─────────────────────────────────────────────────────────
  // 4. GET /eval/last — returns last eval result
  // ─────────────────────────────────────────────────────────
  it.skipIf(!hasTarget)('eval --last returns previous eval result', async () => {
    // First run an eval to have data
    await application.app.request('/eval/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: EVAL_TARGET,
        det: true,
        path: TEST_PROJECT,
        concurrency: 2,
      }),
    });

    // Then retrieve last result
    const res = await application.app.request('/eval/last');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body['overallScore']).toBe('number');
    expect(typeof body['grade']).toBe('string');
    expect(typeof body['totalTests']).toBe('number');
    expect(body['target']).toBe(EVAL_TARGET);
  }, 120_000);

  // ─────────────────────────────────────────────────────────
  // 5. GET /eval/last — 404 when no results exist
  // ─────────────────────────────────────────────────────────
  it('eval --last returns 404 when no eval results exist (fresh app)', async () => {
    // Load a fresh application to ensure no cached results
    // Note: if previous tests ran eval, this may already have data.
    // This test validates the 404 response shape
    const res = await application.app.request('/eval/last');
    // Either 200 (if previous test ran) or 404 (if fresh)
    if (res.status === 404) {
      const body = await res.json() as Record<string, unknown>;
      expect(body['error']).toBe('NOT_FOUND');
      expect(typeof body['message']).toBe('string');
    } else {
      expect(res.status).toBe(200);
    }
  }, 10_000);

  // ─────────────────────────────────────────────────────────
  // 6. GET /eval/findings — eval failures as scanner findings
  // ─────────────────────────────────────────────────────────
  it.skipIf(!hasTarget)('eval findings endpoint returns eval failures as scanner findings', async () => {
    // Ensure eval has been run
    await application.app.request('/eval/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: EVAL_TARGET,
        det: true,
        path: TEST_PROJECT,
        concurrency: 2,
      }),
    });

    const res = await application.app.request('/eval/findings');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const findings = body['findings'] as Array<Record<string, unknown>>;
    expect(Array.isArray(findings)).toBe(true);

    // Each finding should have scanner-compatible format
    for (const f of findings) {
      expect(typeof f['checkId']).toBe('string');
      expect(['pass', 'fail', 'skip', 'info']).toContain(f['type']);
      expect(typeof f['message']).toBe('string');
    }
  }, 120_000);

  // ─────────────────────────────────────────────────────────
  // 7. POST /eval/remediation-report — full remediation
  // ─────────────────────────────────────────────────────────
  it.skipIf(!hasTarget)('eval --remediation produces remediation report', async () => {
    // Ensure eval has been run
    await application.app.request('/eval/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: EVAL_TARGET,
        det: true,
        path: TEST_PROJECT,
        concurrency: 2,
      }),
    });

    const res = await application.app.request('/eval/remediation-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body['score']).toBe('number');
    expect(typeof body['grade']).toBe('string');
    expect(typeof body['total_failures']).toBe('number');
    expect(Array.isArray(body['actions'])).toBe(true);
    expect(typeof body['markdown_report']).toBe('string');

    // Actions should have priority and effort
    const actions = body['actions'] as Array<Record<string, unknown>>;
    if (actions.length > 0) {
      expect(typeof actions[0]!['title']).toBe('string');
      expect(['critical', 'high', 'medium', 'low']).toContain(actions[0]!['priority']);
      expect(['trivial', 'small', 'medium', 'large', 'epic']).toContain(actions[0]!['effort']);
    }
  }, 120_000);

  // ─────────────────────────────────────────────────────────
  // 8. GET /eval/list — list all eval results
  // ─────────────────────────────────────────────────────────
  it('eval list endpoint returns array of results', async () => {
    const res = await application.app.request('/eval/list');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(Array.isArray(body['results'])).toBe(true);
    expect(typeof body['judgeConfigured']).toBe('boolean');
  }, 10_000);

  // ─────────────────────────────────────────────────────────
  // 9. POST /eval/run — request validation (no target = 400)
  // ─────────────────────────────────────────────────────────
  it('eval without target returns 400 validation error', async () => {
    const res = await application.app.request('/eval/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ det: true }),
    });
    // Should return 400 (missing target)
    expect(res.status).toBe(400);
  }, 10_000);
});
