/**
 * Passport Flags E2E — validates all passport subcommand endpoints.
 *
 * V1-M02 RED spec: proves validate, completeness, rename, autonomy,
 * export, notify, registry, permissions all work through HTTP API.
 *
 * Supplements passport-pipeline-e2e.test.ts which covers init/list/show/fria/evidence.
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

describe.skipIf(!canRunE2E)('Passport Flags E2E', () => {
  let application: Application;
  let agentName: string;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();

    // Init passports to have data for all tests
    // V1-M11: Prefer /passport/init. Fall back to /agent/init during migration.
    let initRes = await application.app.request('/passport/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    if (initRes.status === 404) {
      initRes = await application.app.request('/agent/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: TEST_PROJECT }),
      });
    }

    // Get the first passport name — try /passport/list first, fall back to /agent/list
    let listRes = await application.app.request(
      `/passport/list?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    if (listRes.status === 404) {
      listRes = await application.app.request(
        `/agent/list?path=${encodeURIComponent(TEST_PROJECT)}`,
      );
    }
    if (listRes.status !== 200) {
      throw new Error(`Failed to list passports: ${listRes.status}`);
    }
    const passports = (await listRes.json()) as Array<Record<string, unknown>>;
    agentName = (passports[0]?.['name'] as string) ?? '';
    if (!agentName) {
      throw new Error('No passports found after init');
    }
  }, 30_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  // ─────────────────────────────────────────────────────────
  // 1. GET /passport/validate — schema + signature + completeness
  // ─────────────────────────────────────────────────────────
  it('passport validate checks schema, signature, and completeness', async () => {
    const res = await application.app.request(
      `/passport/validate?path=${encodeURIComponent(TEST_PROJECT)}&name=${encodeURIComponent(agentName)}`,
    );
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body['valid']).toBe('boolean');
    expect(Array.isArray(body['issues'])).toBe(true);
    expect(typeof body['signatureValid']).toBe('boolean');
    expect(typeof body['completeness']).toBe('number');
    expect(body['completeness'] as number).toBeGreaterThanOrEqual(0);
    expect(body['completeness'] as number).toBeLessThanOrEqual(100);
  }, 15_000);

  // ─────────────────────────────────────────────────────────
  // 2. GET /passport/completeness — completeness score + field breakdown
  // ─────────────────────────────────────────────────────────
  it('passport completeness returns score and field counts', async () => {
    const res = await application.app.request(
      `/passport/completeness?path=${encodeURIComponent(TEST_PROJECT)}&name=${encodeURIComponent(agentName)}`,
    );
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body['completeness']).toBe('number');
    expect(typeof body['completed_fields']).toBe('number');
    expect(typeof body['total_fields']).toBe('number');
    expect(body['completed_fields'] as number).toBeLessThanOrEqual(body['total_fields'] as number);
  }, 15_000);

  // ─────────────────────────────────────────────────────────
  // 3. GET /passport/autonomy — autonomy level analysis (L1-L5)
  // ─────────────────────────────────────────────────────────
  it('passport autonomy returns autonomy level per passport', async () => {
    const res = await application.app.request(
      `/passport/autonomy?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const agents = body['agents'] as Array<Record<string, unknown>>;
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);

    for (const a of agents) {
      expect(typeof a['name']).toBe('string');
      expect(typeof a['level']).toBe('number');
      expect(a['level'] as number).toBeGreaterThanOrEqual(1);
      expect(a['level'] as number).toBeLessThanOrEqual(5);
    }
  }, 15_000);

  // ─────────────────────────────────────────────────────────
  // 4. GET /passport/export — export to A2A/AIUC-1/NIST format
  // ─────────────────────────────────────────────────────────
  it('passport export to A2A format returns valid structure', async () => {
    const res = await application.app.request(
      `/passport/export?path=${encodeURIComponent(TEST_PROJECT)}&name=${encodeURIComponent(agentName)}&format=a2a`,
    );
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body['format']).toBe('a2a');
    expect(typeof body['data']).toBe('object');
    expect(body['data']).not.toBeNull();
  }, 15_000);

  it('passport export to AIUC-1 format returns valid structure', async () => {
    const res = await application.app.request(
      `/passport/export?path=${encodeURIComponent(TEST_PROJECT)}&name=${encodeURIComponent(agentName)}&format=aiuc-1`,
    );
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body['format']).toBe('aiuc-1');
    expect(typeof body['data']).toBe('object');
  }, 15_000);

  it('passport export with invalid format returns error', async () => {
    const res = await application.app.request(
      `/passport/export?path=${encodeURIComponent(TEST_PROJECT)}&name=${encodeURIComponent(agentName)}&format=invalid`,
    );
    // Should return 400 validation error
    expect(res.status).toBeGreaterThanOrEqual(400);
  }, 15_000);

  // ─────────────────────────────────────────────────────────
  // 5. POST /passport/rename — rename passport
  // ─────────────────────────────────────────────────────────
  it('passport rename changes passport name', async () => {
    const newName = `${agentName}-renamed-test`;

    const res = await application.app.request('/passport/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: TEST_PROJECT,
        oldName: agentName,
        newName,
      }),
    });

    if (res.status === 200) {
      const body = await res.json() as Record<string, unknown>;
      expect(body['success']).toBe(true);
      expect(body['newName']).toBe(newName);

      // Rename back to original
      await application.app.request('/passport/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: TEST_PROJECT,
          oldName: newName,
          newName: agentName,
        }),
      });
    }
  }, 15_000);

  // ─────────────────────────────────────────────────────────
  // 6. POST /fix/doc/notify — worker notification (Art.26(7))
  // V1-M11: doc-gen moved from /agent/* → /fix/doc/*
  // ─────────────────────────────────────────────────────────
  it('fix doc notify generates worker notification document', async () => {
    const res = await application.app.request('/fix/doc/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: TEST_PROJECT,
        name: agentName,
        companyName: 'Test Corp',
        contactName: 'Jane Doe',
        contactEmail: 'jane@test.com',
      }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body['markdown']).toBe('string');
    expect((body['markdown'] as string).length).toBeGreaterThan(0);
  }, 15_000);

  // ─────────────────────────────────────────────────────────
  // 7. GET /passport/registry — unified compliance registry
  // ─────────────────────────────────────────────────────────
  it('passport registry returns list of all agents with status', async () => {
    const res = await application.app.request(
      `/passport/registry?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    expect(res.status).toBe(200);

    // Route returns array directly (not wrapped in object)
    const agents = (await res.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(agents)).toBe(true);

    if (agents.length > 0) {
      expect(typeof agents[0]!['name']).toBe('string');
      expect(typeof (agents[0] as Record<string, unknown>)['passportCompleteness']).toBe('number');
    }
  }, 15_000);

  // ─────────────────────────────────────────────────────────
  // 8. GET /passport/permissions — cross-agent permissions matrix
  // ─────────────────────────────────────────────────────────
  it('passport permissions returns matrix of tool permissions', async () => {
    const res = await application.app.request(
      `/passport/permissions?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body['matrix']).toBeDefined();
    const matrix = body['matrix'] as Array<Record<string, unknown>>;
    expect(Array.isArray(matrix)).toBe(true);
  }, 15_000);

  // ─────────────────────────────────────────────────────────
  // 9. GET /passport/evidence/verify — verify chain integrity
  // ─────────────────────────────────────────────────────────
  it('evidence verify confirms chain integrity', async () => {
    const res = await application.app.request(
      `/passport/evidence/verify?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body['verified']).toBe('boolean');
    expect(typeof body['entries']).toBe('number');
    expect(Array.isArray(body['issues'])).toBe(true);

    // Chain should be valid after init
    expect(body['verified']).toBe(true);
    expect(body['issues'] as unknown[]).toHaveLength(0);
  }, 15_000);

  // ─────────────────────────────────────────────────────────
  // 10. GET /passport/audit/summary — audit trail summary
  // ─────────────────────────────────────────────────────────
  it('passport audit summary returns event counts', async () => {
    const res = await application.app.request('/passport/audit/summary');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body['total_events']).toBe('number');
    expect(typeof body['by_type']).toBe('object');
    expect(typeof body['by_agent']).toBe('object');
  }, 15_000);

  // ─────────────────────────────────────────────────────────
  // 11. POST /passport/init with force=true — re-creates passport
  // ─────────────────────────────────────────────────────────
  it('passport init --force re-creates existing passport', async () => {
    const res = await application.app.request('/passport/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT, force: true }),
    });
    expect(res.status).toBe(200);

    // Should still have the same agent
    const listRes = await application.app.request(
      `/passport/list?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    const agents = (await listRes.json()) as Array<Record<string, unknown>>;
    expect(agents.length).toBeGreaterThan(0);
  }, 30_000);
});
