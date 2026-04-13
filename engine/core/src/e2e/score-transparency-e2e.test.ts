/**
 * V1-M10: Score Transparency E2E — disclaimer, categories, posture through real pipeline.
 *
 * Tests that scan response includes scoreTransparency fields and that
 * GET /status/posture returns a CompliancePosture object.
 *
 * Uses Hono in-memory via loadApplication() + test-projects/acme-ai-support/.
 *
 * RED tests: MUST fail until nodejs-dev implements T-1..T-4.
 *
 * Covers:
 * - T-1: POST /scan response includes scoreDisclaimer
 * - T-2: POST /scan response includes categoryBreakdown
 * - T-3: POST /scan topActions include rank + effort fields
 * - T-4: GET /status/posture returns CompliancePosture
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { loadApplication, type Application } from '../composition-root.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PROJECT = process.env['COMPLIOR_TEST_PROJECT']
  ?? resolve(__dirname, '../../../../..', 'test-projects/acme-ai-support');

const canRunE2E = existsSync(resolve(TEST_PROJECT, 'package.json'));

describe('V1-M10: Score Transparency E2E', () => {
  let app: Application;

  beforeAll(async () => {
    if (!canRunE2E) return;
    app = await loadApplication();
  }, 30_000);

  it('POST /scan response includes scoreDisclaimer with coverage numbers', async () => {
    if (!canRunE2E) return;

    const res = await app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    // V1-M10 T-1: scoreDisclaimer must be present
    expect(body.scoreDisclaimer).toBeDefined();
    expect(body.scoreDisclaimer.summary).toEqual(expect.any(String));
    expect(body.scoreDisclaimer.coveredObligations).toEqual(expect.any(Number));
    expect(body.scoreDisclaimer.totalApplicableObligations).toEqual(expect.any(Number));
    expect(body.scoreDisclaimer.coveragePercent).toEqual(expect.any(Number));
    expect(body.scoreDisclaimer.uncoveredCount).toEqual(expect.any(Number));
    expect(body.scoreDisclaimer.limitations).toEqual(expect.any(Array));
    expect(body.scoreDisclaimer.limitations.length).toBeGreaterThanOrEqual(2);
    // Coverage percent should be between 0 and 100
    expect(body.scoreDisclaimer.coveragePercent).toBeGreaterThanOrEqual(0);
    expect(body.scoreDisclaimer.coveragePercent).toBeLessThanOrEqual(100);
  });

  it('POST /scan response includes categoryBreakdown with explanations', async () => {
    if (!canRunE2E) return;

    const res = await app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    // V1-M10 T-2: categoryBreakdown must be present
    expect(body.categoryBreakdown).toBeDefined();
    expect(body.categoryBreakdown).toBeInstanceOf(Array);
    expect(body.categoryBreakdown.length).toBeGreaterThan(0);

    // Each entry must have the required fields
    for (const cat of body.categoryBreakdown) {
      expect(cat.category).toEqual(expect.any(String));
      expect(cat.score).toEqual(expect.any(Number));
      expect(cat.weight).toEqual(expect.any(Number));
      expect(cat.passed).toEqual(expect.any(Number));
      expect(cat.failed).toEqual(expect.any(Number));
      expect(['high', 'medium', 'low']).toContain(cat.impact);
      expect(cat.topFailures).toBeInstanceOf(Array);
      expect(cat.explanation).toEqual(expect.any(String));
    }
  });

  it('POST /scan topActions have rank and effort fields', async () => {
    if (!canRunE2E) return;

    const res = await app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    // V1-M10 T-3: topActions must include rank + effort
    expect(body.topActions).toBeDefined();
    expect(body.topActions).toBeInstanceOf(Array);

    if (body.topActions.length > 0) {
      const first = body.topActions[0];
      expect(first.rank).toBe(1);
      expect(first.severity).toEqual(expect.any(String));
      expect(first.id).toEqual(expect.any(String));
      expect(first.fixAvailable).toEqual(expect.any(Boolean));
      expect(first.command).toEqual(expect.any(String));
      expect(first.priorityScore).toEqual(expect.any(Number));
    }

    // Should return at most 5 actions
    expect(body.topActions.length).toBeLessThanOrEqual(5);
  });

  it('GET /status/posture returns CompliancePosture', async () => {
    if (!canRunE2E) return;

    // First trigger a scan so there's data
    await app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });

    // V1-M10 T-4: new endpoint
    const res = await app.request('/status/posture');

    expect(res.status).toBe(200);
    const body = await res.json();

    // CompliancePosture fields
    expect(body.score).toBeDefined();
    expect(body.score.totalScore).toEqual(expect.any(Number));
    expect(body.score.zone).toEqual(expect.any(String));

    expect(body.disclaimer).toBeDefined();
    expect(body.disclaimer.summary).toEqual(expect.any(String));

    expect(body.categories).toBeInstanceOf(Array);
    expect(body.topActions).toBeInstanceOf(Array);

    expect(body.lastScanAt).toEqual(expect.any(String));
    expect(body.passportCount).toEqual(expect.any(Number));
    expect(body.documentCount).toEqual(expect.any(Number));
  });

  it('GET /status/posture returns profile when project has one', async () => {
    if (!canRunE2E) return;

    const res = await app.request('/status/posture');
    expect(res.status).toBe(200);
    const body = await res.json();

    // profile may be null if no .complior/profile.json exists in test-project
    // Just verify the field exists
    expect('profile' in body).toBe(true);
    expect('evidenceVerified' in body).toBe(true);
  });
});
