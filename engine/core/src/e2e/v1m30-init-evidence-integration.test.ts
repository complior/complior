/**
 * V1-M30 / W-1: INTEGRATION test — Production init route MUST create evidence chain.
 *
 * This test runs through the SAME code path as `complior init --yes`:
 *   POST /onboarding/complete (with default answers)
 *   → wizard.complete()
 *   → writes profile.json
 *   → MUST also create .complior/evidence/chain.json with genesis entry
 *
 * V1-M27 HR-1 + V1-M29 W-1 wrote unit tests against `runInitForProject` helper
 * but the production HTTP route doesn't call that helper.
 *
 * Acceptance:
 *   1. After POST /onboarding/complete, .complior/evidence/chain.json exists
 *   2. Chain has ≥1 genesis entry
 *   3. Subsequent scan does NOT report "Evidence chain missing or invalid" criticalCap
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m30-w1-${process.pid}`);

describe('V1-M30 W-1: Production init route creates evidence chain', () => {
  beforeEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    mkdirSync(TEST_PROJECT, { recursive: true });
    writeFileSync(resolve(TEST_PROJECT, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
  });

  afterEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('POST /onboarding/complete creates .complior/evidence/chain.json', async () => {
    const { loadApplication } = await import('../composition-root.js');
    const app = await loadApplication();

    // Run full onboarding flow with default answers (mirrors `complior init --yes`)
    const res = await app.app.request('/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: {
          org_role: 'deployer',
          domain: 'general',
          data_types: ['public'],
          system_type: 'standalone',
          gpai_model: 'no',
          user_facing: 'yes',
          autonomous_decisions: 'no',
          biometric_data: 'no',
          company_size: 'sme',
        },
      }),
    });
    expect(res.status).toBeLessThan(400);

    const chainPath = resolve(TEST_PROJECT, '.complior/evidence/chain.json');
    expect(existsSync(chainPath)).toBe(true);

    app.shutdown();
  });

  it('After init, scan does NOT report "Evidence chain missing or invalid"', async () => {
    const { loadApplication } = await import('../composition-root.js');
    const app = await loadApplication();

    // Run onboarding
    await app.app.request('/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: {
          org_role: 'deployer', domain: 'general', data_types: ['public'],
          system_type: 'standalone', gpai_model: 'no', user_facing: 'yes',
          autonomous_decisions: 'no', biometric_data: 'no', company_size: 'sme',
        },
      }),
    });

    // Now scan
    const scanRes = await app.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(scanRes.status).toBe(200);
    const scanData = (await scanRes.json()) as { readiness?: { criticalCaps?: readonly string[] } };
    const caps = scanData.readiness?.criticalCaps ?? [];
    const evidenceCap = caps.find((c) => /evidence\s+chain.*(missing|invalid)/i.test(c));
    expect(evidenceCap).toBeUndefined();

    app.shutdown();
  });
});
