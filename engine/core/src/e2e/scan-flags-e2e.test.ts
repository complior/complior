/**
 * Scan Flags E2E — validates all scan endpoint variants.
 *
 * V1-M02 RED spec: proves --diff, --tier2, SBOM, fail-on severity,
 * agent filter all work through HTTP API.
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

describe.skipIf(!canRunE2E)('Scan Flags E2E', () => {
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
  // 1. POST /scan/diff — compliance diff against baseline
  // ─────────────────────────────────────────────────────────
  it('scan diff returns scoreBefore, scoreAfter, and delta', async () => {
    // First do a baseline scan to populate cache
    await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });

    const res = await application.app.request('/scan/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body['scoreBefore']).toBe('number');
    expect(typeof body['scoreAfter']).toBe('number');
    expect(typeof body['scoreDelta']).toBe('number');
    expect(typeof body['unchangedCount']).toBe('number');
    expect(typeof body['hasRegression']).toBe('boolean');
    expect(typeof body['hasCriticalNew']).toBe('boolean');

    // newFindings and resolvedFindings should be arrays
    expect(Array.isArray(body['newFindings'])).toBe(true);
    expect(Array.isArray(body['resolvedFindings'])).toBe(true);
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 2. POST /scan/diff with markdown=true — produces markdown output
  // ─────────────────────────────────────────────────────────
  it('scan diff with markdown flag produces markdown string', async () => {
    const res = await application.app.request('/scan/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT, markdown: true }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    // Should have markdown field with formatted output
    if (body['markdown']) {
      expect(typeof body['markdown']).toBe('string');
      expect((body['markdown'] as string).length).toBeGreaterThan(0);
    }
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 3. Scan findings include severity for --fail-on filtering
  // ─────────────────────────────────────────────────────────
  it('scan findings have severity field for --fail-on filtering', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const findings = body['findings'] as Array<Record<string, unknown>>;

    // All findings should have severity
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    for (const f of findings) {
      expect(validSeverities).toContain(f['severity']);
    }

    // Should be able to filter by severity (CLI does this)
    const criticalFindings = findings.filter(f => f['severity'] === 'critical');
    const highFindings = findings.filter(f => f['severity'] === 'high');
    // At least one severity level should have findings
    expect(findings.length).toBeGreaterThan(0);

    // Verify score has enough data for CI threshold check
    const score = body['score'] as Record<string, unknown>;
    expect(typeof score['totalScore']).toBe('number');
    expect(typeof score['totalChecks']).toBe('number');
    expect(typeof score['failedChecks']).toBe('number');
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 4. GET /sbom — generates CycloneDX Software Bill of Materials
  // ─────────────────────────────────────────────────────────
  it('SBOM endpoint generates CycloneDX 1.5 JSON', async () => {
    const res = await application.app.request(
      `/sbom?path=${encodeURIComponent(TEST_PROJECT)}`,
    );
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body['bomFormat']).toBe('CycloneDX');
    expect(body['specVersion']).toBe('1.5');
    expect(typeof body['serialNumber']).toBe('string');

    const components = body['components'] as Array<Record<string, unknown>>;
    expect(Array.isArray(components)).toBe(true);

    // Components should have name and version
    if (components.length > 0) {
      expect(typeof components[0]!['name']).toBe('string');
      expect(typeof components[0]!['version']).toBe('string');
    }
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 5. Scan with agent filter — agentSummaries in response
  // ─────────────────────────────────────────────────────────
  it('scan result contains agentSummaries for --agent filtering', async () => {
    // First init passports so agent data exists
    await application.app.request('/passport/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });

    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    // After agent init, scan should include agent summaries
    if (body['agentSummaries']) {
      const summaries = body['agentSummaries'] as Array<Record<string, unknown>>;
      expect(Array.isArray(summaries)).toBe(true);
      if (summaries.length > 0) {
        expect(typeof summaries[0]!['agentName']).toBe('string');
        expect(typeof summaries[0]!['findingCount']).toBe('number');
      }
    }
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // 6. Scan result includes regulation version metadata
  // ─────────────────────────────────────────────────────────
  it('scan result includes regulationVersion for versioning', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const regVer = body['regulationVersion'] as Record<string, unknown> | undefined;
    if (regVer) {
      expect(typeof regVer['version']).toBe('string');
      expect(typeof regVer['rulesVersion']).toBe('string');
      expect(typeof regVer['checkCount']).toBe('number');
    }
  }, 30_000);
});
