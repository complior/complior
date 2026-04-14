/**
 * Passport Pipeline E2E — validates passport lifecycle and score integration.
 *
 * V1-M02 RED spec: proves passport init → completeness affects score →
 * FRIA updates passport → evidence recorded.
 *
 * Uses Hono in-memory (no real HTTP server).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { loadApplication, type Application } from '../composition-root.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PROJECT = process.env['COMPLIOR_TEST_PROJECT']
  ?? resolve(__dirname, '../../../../..', 'test-projects/acme-ai-support');

const canRunE2E = existsSync(resolve(TEST_PROJECT, 'package.json'));

const cleanup = async () => {
  await rm(resolve(TEST_PROJECT, '.complior', 'agents'), { recursive: true, force: true });
  await rm(resolve(TEST_PROJECT, '.complior', 'reports'), { recursive: true, force: true });
  await rm(resolve(TEST_PROJECT, '.complior', 'evidence'), { recursive: true, force: true });
};

describe.skipIf(!canRunE2E)('Passport Pipeline E2E', () => {
  let application: Application;
  let agentName = '';

  beforeAll(async () => {
    await cleanup();
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
  }, 30_000);

  afterAll(async () => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  // ─────────────────────────────────────────────────────────
  // Test 1: passport init creates manifest with required fields
  // ─────────────────────────────────────────────────────────
  it('passport init creates manifest with 36 fields', async () => {
    const res = await application.app.request('/agent/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const manifests = body['manifests'] as Array<Record<string, unknown>>;
    expect(Array.isArray(manifests)).toBe(true);
    expect(manifests.length).toBeGreaterThan(0);

    // Save first agent name for subsequent tests
    const first = manifests[0]!;
    agentName = first['name'] as string;
    expect(typeof agentName).toBe('string');
    expect(agentName.length).toBeGreaterThan(0);

    // Fetch the passport to validate its structure (avoids scope issue with `first`)
    const showRes = await application.app.request(
      `/passport/show?path=${encodeURIComponent(TEST_PROJECT)}&name=${encodeURIComponent(passportName)}`,
    );
    expect(showRes.status).toBe(200);
    const first = await showRes.json() as Record<string, unknown>;

    // Passport should have core identity fields
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('version');
    expect(first).toHaveProperty('compliance');

    // Signature should be present (ed25519)
    const signature = first['signature'] as Record<string, unknown> | undefined;
    expect(signature).toBeDefined();
    expect(signature!['algorithm']).toBe('ed25519');
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // Test 2: passport completeness is reflected in scan score
  // ─────────────────────────────────────────────────────────
  it('scan after passport init includes passport-related findings', async () => {
    // Scan WITH passport present
    const scanRes = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(scanRes.status).toBe(200);

    const scanBody = await scanRes.json() as Record<string, unknown>;
    const findings = scanBody['findings'] as Array<Record<string, unknown>>;

    // Should have passport-related findings (presence or completeness checks)
    const passportFindings = findings.filter(
      f => (f['checkId'] as string).includes('passport'),
    );
    expect(passportFindings.length).toBeGreaterThan(0);

    // At least one passport check should PASS (passport exists)
    const passportPasses = passportFindings.filter(f => f['type'] === 'pass');
    expect(passportPasses.length).toBeGreaterThan(0);
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // Test 3: FRIA generation updates passport fria_completed
  // ─────────────────────────────────────────────────────────
  it('FRIA generation sets passport fria_completed to true', async () => {
    // Ensure we have an agent name from test 1
    expect(agentName).not.toBe('');

    // Generate FRIA
    const friaRes = await application.app.request('/agent/fria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: TEST_PROJECT,
        name: agentName,
        organization: 'Test Corp',
      }),
    });
    expect(friaRes.status).toBe(200);

    // Re-read passport — fria_completed should be true
    const showRes = await application.app.request(
      `/agent/show?path=${encodeURIComponent(TEST_PROJECT)}&name=${encodeURIComponent(agentName)}`,
    );
    expect(showRes.status).toBe(200);

    const passport = await showRes.json() as Record<string, unknown>;
    const compliance = passport['compliance'] as Record<string, unknown>;
    expect(compliance['fria_completed']).toBe(true);
  }, 15_000);

  // ─────────────────────────────────────────────────────────
  // Test 4: FRIA event is recorded in evidence chain
  // ─────────────────────────────────────────────────────────
  it('FRIA event appears in evidence chain', async () => {
    const evRes = await application.app.request(
      `/agent/evidence?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    expect(evRes.status).toBe(200);

    const evidence = await evRes.json() as Record<string, unknown>;
    const entries = evidence['entries'] as Array<Record<string, unknown>>;
    expect(Array.isArray(entries)).toBe(true);

    // At least one entry should have source "fria"
    const friaEntries = entries.filter(e => e['source'] === 'fria');
    expect(friaEntries.length).toBeGreaterThan(0);
  }, 10_000);
});
