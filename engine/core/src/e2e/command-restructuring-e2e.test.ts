/**
 * V1-M11: Command Restructuring E2E — /agent/* → /passport/* + /fix/doc/*
 *
 * Tests that the new route structure works:
 * - /passport/* routes respond 200 (renamed from /agent/*)
 * - /fix/doc/* routes respond 200 (doc generation moved to fix)
 * - Old /agent/* routes should return 404 after migration
 *
 * RED tests: MUST fail until nodejs-dev renames routes (T-3, T-4).
 *
 * Uses Hono in-memory via loadApplication().
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

describe.skipIf(!canRunE2E)('V1-M11: Command Restructuring E2E', () => {
  let application: Application;
  let passportName: string;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();

    // Init passport (still /agent/init until T-3 renames it)
    // After T-3, this should be /passport/init
    const initRes = await application.app.request('/passport/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    // If /passport/init doesn't exist yet, fall back to /agent/init
    if (initRes.status === 404) {
      await application.app.request('/agent/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: TEST_PROJECT }),
      });
    }

    // Get passport name from new or old endpoint
    let listRes = await application.app.request(
      `/passport/list?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    if (listRes.status === 404) {
      listRes = await application.app.request(
        `/agent/list?path=${encodeURIComponent(TEST_PROJECT)}`,
      );
    }
    const passports = (await listRes.json()) as Array<Record<string, unknown>>;
    passportName = (passports[0]?.['name'] as string) ?? 'test-passport';
  }, 30_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  // ────────────────────────────────────────────────────────────
  // T-3: /passport/* routes (renamed from /agent/*)
  // ────────────────────────────────────────────────────────────

  it('GET /passport/list returns 200 with array of passports', async () => {
    const res = await application.app.request(
      `/passport/list?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeInstanceOf(Array);
  });

  it('GET /passport/show returns 200 for existing passport', async () => {
    const res = await application.app.request(
      `/passport/show?path=${encodeURIComponent(TEST_PROJECT)}&name=${encodeURIComponent(passportName)}`,
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body['display_name']).toEqual(expect.any(String));
  });

  it('GET /passport/validate returns 200 with validation result', async () => {
    const res = await application.app.request(
      `/passport/validate?path=${encodeURIComponent(TEST_PROJECT)}&name=${encodeURIComponent(passportName)}`,
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('valid');
  });

  it('GET /passport/completeness returns 200 with completeness score', async () => {
    const res = await application.app.request(
      `/passport/completeness?path=${encodeURIComponent(TEST_PROJECT)}&name=${encodeURIComponent(passportName)}`,
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('completeness');
    expect(typeof body['completeness']).toBe('number');
  });

  it('GET /passport/autonomy returns 200', async () => {
    const res = await application.app.request(
      `/passport/autonomy?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    expect(res.status).toBe(200);
  });

  it('GET /passport/registry returns 200 with array', async () => {
    const res = await application.app.request(
      `/passport/registry?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeInstanceOf(Array);
  });

  it('GET /passport/permissions returns 200', async () => {
    const res = await application.app.request(
      `/passport/permissions?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    expect(res.status).toBe(200);
  });

  it('GET /passport/evidence returns 200', async () => {
    const res = await application.app.request(
      `/passport/evidence?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    expect(res.status).toBe(200);
  });

  // ────────────────────────────────────────────────────────────
  // T-4: /fix/doc/* routes (doc generation moved from /agent/*)
  // ────────────────────────────────────────────────────────────

  it('POST /fix/doc/fria generates FRIA document', async () => {
    const res = await application.app.request('/fix/doc/fria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: passportName,
        path: TEST_PROJECT,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('markdown');
    expect(typeof body['markdown']).toBe('string');
  });

  it('POST /fix/doc/notify generates Worker Notification', async () => {
    const res = await application.app.request('/fix/doc/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: passportName,
        path: TEST_PROJECT,
        companyName: 'Test Corp',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('markdown');
  });

  it('POST /fix/doc/policy generates AI Policy document', async () => {
    const res = await application.app.request('/fix/doc/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: passportName,
        path: TEST_PROJECT,
        domain: 'hr',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('markdown');
  });

  it('POST /fix/doc/generate creates document by type', async () => {
    const res = await application.app.request('/fix/doc/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: passportName,
        path: TEST_PROJECT,
        docType: 'ai-literacy',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('markdown');
  });

  // ────────────────────────────────────────────────────────────
  // Backward compat: old /agent/* routes should 404
  // ────────────────────────────────────────────────────────────

  it('old /agent/list returns 404 after rename', async () => {
    const res = await application.app.request(
      `/agent/list?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    // After V1-M11, old routes should be gone
    expect(res.status).toBe(404);
  });

  it('old /agent/fria returns 404 (moved to /fix/doc/fria)', async () => {
    const res = await application.app.request('/agent/fria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: passportName, path: TEST_PROJECT }),
    });
    expect(res.status).toBe(404);
  });
});
