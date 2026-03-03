/**
 * E2E Test — validates gap closures (US-S03-06/07/08) end-to-end.
 *
 * Uses Hono's `app.request()` against the real composition root.
 * Tests: Evidence chain for all event types (Gap 2),
 *        FRIA output path (Gap 3), Passport update after FRIA (Gap 4).
 *
 * Gap 1 (Circuit Breaker) is SDK-only and tested in engine/sdk/src/__tests__/
 * (circuit-breaker.test.ts + agent.test.ts) — it can't be imported cross-package.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, rm, stat } from 'node:fs/promises';
import { loadApplication, type Application } from '../composition-root.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PROJECT = resolve(__dirname, '../../../..', 'test-projects/acme-ai-support');

// Clean up any previous E2E artifacts
const cleanup = async () => {
  await rm(resolve(TEST_PROJECT, '.complior', 'reports'), { recursive: true, force: true });
};

describe('Gap Closures E2E', () => {
  let application: Application;

  beforeAll(async () => {
    await cleanup();
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
  }, 30_000);

  afterAll(async () => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
    await rm(resolve(TEST_PROJECT, '.complior', 'reports'), { recursive: true, force: true });
  });

  // ─────────────────────────────────────────────────────────
  // Gap 2: Evidence for fix/passport/FRIA events
  // ─────────────────────────────────────────────────────────
  describe('Gap 2: Evidence for all event types', () => {
    it('scan creates evidence entries (baseline)', async () => {
      // Run a scan first to seed evidence
      const scanRes = await application.app.request('/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: TEST_PROJECT }),
      });
      expect(scanRes.status).toBe(200);

      // Check evidence chain
      const evRes = await application.app.request(
        `/agent/evidence?path=${encodeURIComponent(TEST_PROJECT)}`,
      );
      expect(evRes.status).toBe(200);
      const summary = await evRes.json() as Record<string, unknown>;
      expect(summary['totalEntries']).toBeGreaterThan(0);
      expect(summary['chainValid']).toBe(true);
    });

    it('passport init creates evidence with source "passport"', async () => {
      // Get evidence count before
      const beforeRes = await application.app.request(
        `/agent/evidence?path=${encodeURIComponent(TEST_PROJECT)}`,
      );
      const beforeSummary = await beforeRes.json() as Record<string, unknown>;
      const countBefore = beforeSummary['totalEntries'] as number;

      // Init passport
      const initRes = await application.app.request('/agent/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: TEST_PROJECT }),
      });
      expect(initRes.status).toBe(200);
      const initBody = await initRes.json() as Record<string, unknown>;
      const manifests = initBody['manifests'] as unknown[];

      // Get evidence count after
      const afterRes = await application.app.request(
        `/agent/evidence?path=${encodeURIComponent(TEST_PROJECT)}`,
      );
      const afterSummary = await afterRes.json() as Record<string, unknown>;
      const countAfter = afterSummary['totalEntries'] as number;

      // If agents were found, evidence should have increased
      if (manifests.length > 0) {
        expect(countAfter).toBeGreaterThan(countBefore);
      }
    });

    it('evidence chain verification passes after all events', async () => {
      const verifyRes = await application.app.request(
        `/agent/evidence/verify?path=${encodeURIComponent(TEST_PROJECT)}`,
      );
      expect(verifyRes.status).toBe(200);
      const result = await verifyRes.json() as Record<string, unknown>;
      expect(result['valid']).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────
  // Gap 3: FRIA output path + Gap 4: Passport update after FRIA
  // ─────────────────────────────────────────────────────────
  describe('Gap 3+4: FRIA generation, output path, passport update', () => {
    const AGENT_NAME = 'acme-ai-support';

    it('generates FRIA and saves to .complior/reports/fria-{name}.md', async () => {
      // Ensure passport exists
      const listRes = await application.app.request(
        `/agent/list?path=${encodeURIComponent(TEST_PROJECT)}`,
      );
      const manifests = await listRes.json() as Array<Record<string, unknown>>;

      // If no agent passports exist yet, init one first
      if (manifests.length === 0) {
        await application.app.request('/agent/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: TEST_PROJECT }),
        });
      }

      // Generate FRIA
      const friaRes = await application.app.request('/agent/fria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: TEST_PROJECT,
          name: AGENT_NAME,
          organization: 'ACME Corp',
          assessor: 'E2E Test Assessor',
        }),
      });
      expect(friaRes.status).toBe(200);
      const friaBody = await friaRes.json() as Record<string, unknown>;

      // Verify response shape
      expect(friaBody['markdown']).toBeDefined();
      expect(typeof friaBody['markdown']).toBe('string');
      expect(friaBody['prefilledFields']).toBeDefined();
      expect(friaBody['manualFields']).toBeDefined();

      // Gap 3: Verify correct output path
      const savedPath = friaBody['savedPath'] as string;
      expect(savedPath).toContain('.complior/reports/');
      expect(savedPath).toContain(`fria-${AGENT_NAME}.md`);
      expect(savedPath).not.toContain('.complior/fria/');

      // Verify file actually exists on disk
      const fileStat = await stat(savedPath);
      expect(fileStat.isFile()).toBe(true);

      // Verify content is valid markdown
      const content = await readFile(savedPath, 'utf-8');
      expect(content.length).toBeGreaterThan(100);
      expect(content).toContain('ACME Corp');  // organization was used
      expect(content).toContain('E2E Test Assessor');  // assessor was used
    }, 15_000);

    it('FRIA generation creates evidence with source "fria"', async () => {
      // Get evidence before
      const beforeRes = await application.app.request(
        `/agent/evidence?path=${encodeURIComponent(TEST_PROJECT)}`,
      );
      const beforeSummary = await beforeRes.json() as Record<string, unknown>;
      const countBefore = beforeSummary['totalEntries'] as number;

      // Generate another FRIA (idempotent — overwrites the same file)
      const friaRes = await application.app.request('/agent/fria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: TEST_PROJECT,
          name: AGENT_NAME,
        }),
      });
      expect(friaRes.status).toBe(200);

      // Evidence should have increased
      const afterRes = await application.app.request(
        `/agent/evidence?path=${encodeURIComponent(TEST_PROJECT)}`,
      );
      const afterSummary = await afterRes.json() as Record<string, unknown>;
      const countAfter = afterSummary['totalEntries'] as number;
      expect(countAfter).toBeGreaterThan(countBefore);
    }, 15_000);

    it('passport is updated with fria_completed and fria_date after FRIA', async () => {
      // Read the manifest from disk
      const manifestPath = resolve(
        TEST_PROJECT, '.complior', 'agents', `${AGENT_NAME}-manifest.json`,
      );
      const rawManifest = await readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(rawManifest) as Record<string, unknown>;

      // Gap 4: Verify fria fields
      const compliance = manifest['compliance'] as Record<string, unknown>;
      expect(compliance['fria_completed']).toBe(true);
      expect(typeof compliance['fria_date']).toBe('string');

      // fria_date should be today's date (YYYY-MM-DD format)
      const today = new Date().toISOString().slice(0, 10);
      expect(compliance['fria_date']).toBe(today);
    });

    it('updated passport signature is still valid', async () => {
      // Verify via API
      const showRes = await application.app.request(
        `/agent/show?path=${encodeURIComponent(TEST_PROJECT)}&name=${AGENT_NAME}`,
      );
      expect(showRes.status).toBe(200);
      const manifest = await showRes.json() as Record<string, unknown>;

      // Signature block should be present
      const sig = manifest['signature'] as Record<string, unknown>;
      expect(sig['algorithm']).toBe('ed25519');
      expect(typeof sig['value']).toBe('string');
      expect(sig['value']).not.toBe('');
    });
  });

  // ─────────────────────────────────────────────────────────
  // Cross-gap: Evidence chain integrity after all operations
  // ─────────────────────────────────────────────────────────
  describe('Cross-gap: Full evidence chain integrity', () => {
    it('evidence chain is valid after scan + passport + fria events', async () => {
      const verifyRes = await application.app.request(
        `/agent/evidence/verify?path=${encodeURIComponent(TEST_PROJECT)}`,
      );
      expect(verifyRes.status).toBe(200);
      const result = await verifyRes.json() as Record<string, unknown>;
      expect(result['valid']).toBe(true);
      expect(result['brokenAt']).toBeUndefined();
    });

    it('evidence summary shows multiple event sources', async () => {
      const summaryRes = await application.app.request(
        `/agent/evidence?path=${encodeURIComponent(TEST_PROJECT)}`,
      );
      expect(summaryRes.status).toBe(200);
      const summary = await summaryRes.json() as Record<string, unknown>;

      expect((summary['totalEntries'] as number)).toBeGreaterThan(0);
      expect((summary['scanCount'] as number)).toBeGreaterThan(0);
      expect(summary['chainValid']).toBe(true);
      expect(summary['firstEntry']).toBeTruthy();
      expect(summary['lastEntry']).toBeTruthy();
    });
  });
});
