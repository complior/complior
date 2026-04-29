/**
 * V1-M30.4 / Section B.2: RED — engine HTTP routes alias /agent/* to /passport/*.
 *
 * The CLI rename (Section B.1, rust-dev) renames `complior passport` →
 * `complior agent` (with passport as deprecated alias). The Rust CLI calls
 * engine routes — the engine MUST expose both `/passport/*` (back-compat) and
 * `/agent/*` (new primary).
 *
 * Acceptance:
 *   1. POST /agent/init — succeeds with same response shape as POST /passport/init
 *   2. GET  /agent/list — succeeds with same response shape as GET  /passport/list
 *   3. GET  /agent/show — succeeds with same response shape as GET  /passport/show
 *   4. Existing /passport/* routes continue to work (no break)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m30-4-agent-aliases-${process.pid}`);

describe('V1-M30.4 B.2: /agent/* HTTP route aliases for /passport/*', () => {
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

  it('GET /agent/list responds same as GET /passport/list (back-compat preserved)', async () => {
    const { loadApplication } = await import('../../composition-root.js');
    const app = await loadApplication();

    // Call original
    const passportRes = await app.app.request('/passport/list', { method: 'GET' });
    expect(passportRes.status, 'GET /passport/list must remain 2xx').toBeLessThan(400);
    const passportBody = await passportRes.json();

    // Call new alias
    const agentRes = await app.app.request('/agent/list', { method: 'GET' });
    expect(agentRes.status, 'GET /agent/list (new alias) must be 2xx').toBeLessThan(400);
    const agentBody = await agentRes.json();

    // Both must return the same shape
    expect(typeof agentBody).toBe(typeof passportBody);
    if (passportBody && typeof passportBody === 'object' && 'passports' in passportBody) {
      expect(agentBody).toHaveProperty('passports');
    }

    app.shutdown();
  }, 30000);

  it('POST /agent/init succeeds (same handler as /passport/init)', async () => {
    const { loadApplication } = await import('../../composition-root.js');
    const app = await loadApplication();

    // Onboard first (creates profile.json)
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

    const res = await app.app.request('/agent/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status, 'POST /agent/init should be 2xx').toBeLessThan(400);

    app.shutdown();
  }, 30000);
});
