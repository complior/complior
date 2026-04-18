/**
 * E2E tests for ISO 42001 document generation HTTP endpoints.
 * Tests POST /fix/doc/soa and POST /fix/doc/risk-register via Hono in-memory.
 *
 * V1-M11 RED spec: /agent/soa → /fix/doc/soa, /agent/risk-register → /fix/doc/risk-register.
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

describe.skipIf(!canRunE2E)('ISO 42001 E2E — HTTP Routes', () => {
  let application: Application;
  let passportName = '';

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();

    // Init a passport so we have a valid name
    const initRes = await application.app.request('/passport/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    if (initRes.status === 200) {
      const body = await initRes.json() as Record<string, unknown>;
      const manifests = body['manifests'] as Array<Record<string, unknown>>;
      if (manifests.length > 0) {
        passportName = manifests[0]!['name'] as string;
      }
    }
    // Fall back to /agent/init during transition
    if (!passportName) {
      const fallbackRes = await application.app.request('/agent/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: TEST_PROJECT }),
      });
      if (fallbackRes.status === 200) {
        const body = await fallbackRes.json() as Record<string, unknown>;
        const manifests = body['manifests'] as Array<Record<string, unknown>>;
        if (manifests.length > 0) {
          passportName = manifests[0]!['name'] as string;
        }
      }
    }
    // Last resort: use the first passport from /passport/list
    if (!passportName) {
      const listRes = await application.app.request(
        `/passport/list?path=${encodeURIComponent(TEST_PROJECT)}`,
      );
      if (listRes.status === 200) {
        const passports = await listRes.json() as Array<Record<string, unknown>>;
        passportName = (passports[0]?.['name'] as string) ?? 'test-passport';
      } else {
        passportName = 'test-passport';
      }
    }
  }, 30_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  describe('POST /fix/doc/soa', () => {
    it('returns SoA with entries array', async () => {
      const res = await application.app.request('/fix/doc/soa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: passportName, path: TEST_PROJECT }),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('completeness');
      expect(data).toHaveProperty('applicableCount');
      expect(data).toHaveProperty('implementedCount');
      expect(Array.isArray(data.entries)).toBe(true);
    });

    it('returns entries with expected fields', async () => {
      const res = await application.app.request('/fix/doc/soa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: passportName, path: TEST_PROJECT }),
      });

      const data = await res.json() as { entries: Record<string, unknown>[] };
      if (data.entries.length > 0) {
        const entry = data.entries[0];
        expect(entry).toHaveProperty('controlId');
        expect(entry).toHaveProperty('title');
        expect(entry).toHaveProperty('applicable');
        expect(entry).toHaveProperty('status');
        expect(entry).toHaveProperty('evidence');
        expect(entry).toHaveProperty('gaps');
      }
    });
  });

  describe('POST /fix/doc/risk-register', () => {
    it('returns risk register with entries array', async () => {
      const res = await application.app.request('/fix/doc/risk-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: passportName, path: TEST_PROJECT }),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('totalRisks');
      expect(data).toHaveProperty('criticalCount');
      expect(data).toHaveProperty('highCount');
      expect(data).toHaveProperty('averageRiskScore');
      expect(Array.isArray(data.entries)).toBe(true);
    });

    it('returns entries sorted by riskScore descending', async () => {
      const res = await application.app.request('/fix/doc/risk-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: passportName, path: TEST_PROJECT }),
      });

      const data = await res.json() as { entries: { riskScore: number }[] };
      for (let i = 1; i < data.entries.length; i++) {
        expect(data.entries[i - 1].riskScore).toBeGreaterThanOrEqual(data.entries[i].riskScore);
      }
    });
  });
});
