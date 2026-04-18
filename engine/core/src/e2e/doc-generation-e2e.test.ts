/**
 * V1-M16: Document Generation E2E — validates /fix/doc/* endpoints.
 *
 * RED spec: covers doc types not tested in existing E2E suites:
 *   - POST /fix/doc/test-gen (compliance test suite generation)
 *   - POST /fix/doc/all (generate all documents at once)
 *
 * Existing coverage (already tested elsewhere):
 *   - /fix/doc/fria → command-restructuring-e2e
 *   - /fix/doc/notify → command-restructuring-e2e
 *   - /fix/doc/policy → command-restructuring-e2e
 *   - /fix/doc/soa → iso42001-e2e
 *   - /fix/doc/risk-register → iso42001-e2e
 *   - /fix/doc/generate → command-restructuring-e2e
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

describe.skipIf(!canRunE2E)('Document Generation E2E (V1-M16)', () => {
  let application: Application;
  let passportName: string;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();

    // Init passport so doc generation has data
    const initRes = await application.app.request('/passport/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT, force: true }),
    });
    const initBody = await initRes.json() as Record<string, unknown>;
    passportName = (initBody['name'] as string) ?? 'acme-ai-support';

    // Run scan to populate findings for doc generation
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

  // ═══════════════════════════════════════════════════════════
  //  POST /fix/doc/test-gen — compliance test suite generation
  // ═══════════════════════════════════════════════════════════

  it('POST /fix/doc/test-gen generates compliance test suite', async () => {
    const res = await application.app.request('/fix/doc/test-gen', {
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

    const markdown = body['markdown'] as string;
    expect(markdown.length).toBeGreaterThan(100);
    // Test suite should reference compliance or test concepts
    expect(markdown.toLowerCase()).toMatch(/test|compliance|assert|check|verify/);
  }, 30_000);

  // ═══════════════════════════════════════════════════════════
  //  POST /fix/doc/all — generate ALL documents at once
  // ═══════════════════════════════════════════════════════════

  it('POST /fix/doc/all generates multiple documents', async () => {
    const res = await application.app.request('/fix/doc/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: passportName,
        path: TEST_PROJECT,
        organization: 'Test Corp',
      }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;

    // Should have timestamp
    expect(body).toHaveProperty('timestamp');
    expect(typeof body['timestamp']).toBe('string');

    // Should have generated documents (array or object with doc types)
    const hasDocuments = body['documents'] !== undefined
      || body['generated'] !== undefined
      || body['results'] !== undefined;
    expect(hasDocuments).toBe(true);

    // If documents is an array, verify it has multiple entries
    const docs = (body['documents'] ?? body['generated'] ?? body['results']) as
      | Array<Record<string, unknown>>
      | Record<string, unknown>;
    if (Array.isArray(docs)) {
      expect(docs.length).toBeGreaterThan(0);
    } else if (typeof docs === 'object' && docs !== null) {
      expect(Object.keys(docs).length).toBeGreaterThan(0);
    }
  }, 60_000);

  it('POST /fix/doc/all with missing passport returns error', async () => {
    const res = await application.app.request('/fix/doc/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'nonexistent-passport-xyz',
        path: TEST_PROJECT,
      }),
    });

    // Should fail with 400 or 404 for missing passport
    expect([400, 404, 500]).toContain(res.status);
  }, 30_000);

  // ═══════════════════════════════════════════════════════════
  //  POST /fix/doc/generate — additional doc types via generic route
  // ═══════════════════════════════════════════════════════════

  const additionalDocTypes = [
    'art5-screening',
    'technical-documentation',
    'incident-report',
    'data-governance',
    'instructions-for-use',
    'monitoring-policy',
    'risk-management',
  ];

  for (const docType of additionalDocTypes) {
    it(`POST /fix/doc/generate creates ${docType} document`, async () => {
      const res = await application.app.request('/fix/doc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: passportName,
          path: TEST_PROJECT,
          docType,
        }),
      });
      expect(res.status).toBe(200);

      const body = await res.json() as Record<string, unknown>;
      expect(body).toHaveProperty('markdown');
      expect(typeof body['markdown']).toBe('string');
      expect((body['markdown'] as string).length).toBeGreaterThan(50);
    }, 30_000);
  }
});
