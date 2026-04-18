/**
 * V1-M08: Context-Aware Scan E2E — filterContext + topActions through real pipeline.
 *
 * Tests that POST /scan and POST /fix/apply-all return filterContext
 * and topActions when a project profile exists (.complior/profile.json).
 *
 * Uses Hono in-memory via loadApplication() + test-projects/acme-ai-support/.
 * Creates a temporary .complior/profile.json for context filtering tests.
 *
 * RED tests: MUST fail until nodejs-dev implements T-2..T-5, T-8.
 *
 * Covers:
 * - T-4: POST /scan returns filterContext when profile exists
 * - T-5: POST /scan returns topActions (0-3 items)
 * - T-8: POST /fix/apply-all includes filterContext from last scan
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { loadApplication, type Application } from '../composition-root.js';
import type { ScanFilterContext } from '../types/common.types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PROJECT = process.env['COMPLIOR_TEST_PROJECT']
  ?? resolve(__dirname, '../../../../..', 'test-projects/acme-ai-support');

const canRunE2E = existsSync(resolve(TEST_PROJECT, 'package.json'));

/**
 * Minimal valid profile matching ProjectProfileSchema.
 * deployer + limited risk + healthcare → triggers both role and risk-level filtering.
 */
const TEST_PROFILE = {
  version: '1.0' as const,
  createdAt: '2026-04-13T00:00:00Z',
  updatedAt: '2026-04-13T00:00:00Z',
  autoDetected: {
    language: 'TypeScript',
    framework: 'express',
    cicd: 'github-actions',
    deployment: 'docker',
    aiLibraries: ['openai'],
    hasDockerCompose: false,
    hasEnvExample: true,
    detectedModels: ['gpt-4'],
    confidence: 0.85,
  },
  aiSystem: { type: 'feature' as const, outputTypes: ['text'] },
  jurisdiction: { primary: 'EU', regulations: ['eu-ai-act'] },
  organization: { role: 'deployer' as const },
  business: { domain: 'healthcare', companySize: 'startup' as const },
  data: { types: ['personal', 'health'], storage: 'eu' as const },
  goals: { priority: 'full', budget: 'moderate' as const },
  computed: {
    riskLevel: 'limited' as const,
    applicableObligations: [
      'eu-ai-act-OBL-001', 'eu-ai-act-OBL-002', 'eu-ai-act-OBL-003',
      'eu-ai-act-OBL-004', 'eu-ai-act-OBL-005', 'eu-ai-act-OBL-006',
      'eu-ai-act-OBL-007', 'eu-ai-act-OBL-008', 'eu-ai-act-OBL-009',
      'eu-ai-act-OBL-010', 'eu-ai-act-OBL-011', 'eu-ai-act-OBL-012',
      'eu-ai-act-OBL-013', 'eu-ai-act-OBL-014', 'eu-ai-act-OBL-015',
      'eu-ai-act-OBL-016', 'eu-ai-act-OBL-017', 'eu-ai-act-OBL-018',
      'eu-ai-act-OBL-019',
    ],
    estimatedScore: 65,
  },
};

// ─── With Profile: T-4, T-5, T-8 ───────────────────────────────

describe.skipIf(!canRunE2E)('Context-Scan E2E — with profile (V1-M08)', () => {
  let application: Application;
  const compliorDir = resolve(TEST_PROJECT, '.complior');
  const profilePath = resolve(compliorDir, 'profile.json');
  let savedProfile: string | null = null;

  beforeAll(async () => {
    // Back up existing profile if any
    if (existsSync(profilePath)) {
      savedProfile = await readFile(profilePath, 'utf-8');
    }
    // Create .complior/profile.json for context filtering
    await mkdir(compliorDir, { recursive: true });
    await writeFile(profilePath, JSON.stringify(TEST_PROFILE, null, 2), 'utf-8');

    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
  }, 30_000);

  afterAll(async () => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
    // Restore or remove profile.json
    if (savedProfile) {
      await writeFile(profilePath, savedProfile, 'utf-8');
    } else if (existsSync(profilePath)) {
      await rm(profilePath);
    }
  });

  // ── T-4: filterContext in /scan response ──

  it('POST /scan response includes filterContext with profile data', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;

    // filterContext MUST be present when profile exists
    expect(body['filterContext']).toBeDefined();
    const ctx = body['filterContext'] as ScanFilterContext;
    expect(ctx.role).toBe('deployer');
    expect(ctx.riskLevel).toBe('limited');
    expect(ctx.domain).toBe('healthcare');
    expect(ctx.profileFound).toBe(true);
    expect(typeof ctx.totalObligations).toBe('number');
    expect(typeof ctx.applicableObligations).toBe('number');
    expect(typeof ctx.skippedByRole).toBe('number');
    expect(typeof ctx.skippedByRiskLevel).toBe('number');
  }, 30_000);

  it('POST /scan filterContext counts are consistent', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;

    expect(body['filterContext']).toBeDefined();
    const ctx = body['filterContext'] as ScanFilterContext;

    // applicable + skippedByRole + skippedByRiskLevel <= total
    // NOTE: with V1-M09 enriched profile, applicableObligations = profile obligation count.
    // skippedByRole/skippedByRiskLevel = scanner checks skipped.
    // These use different units — profile obligations vs scanner checks — so the sum check
    // may not hold with enriched profiles. We check applicability count explicitly instead.
    expect(ctx.applicableObligations).toBe(19);

    // deployer + limited risk MUST skip some scanner checks
    expect(ctx.skippedByRole).toBeGreaterThan(0);
    expect(ctx.skippedByRiskLevel).toBeGreaterThan(0);

    // V1-M09 contract: totalObligations = applicableObligations from enriched profile
    expect(ctx.totalObligations).toBe(19);
    expect(ctx.applicableObligations).toBe(19);
  }, 30_000);

  // ── T-5: topActions in /scan response ──

  it('POST /scan response includes topActions array (0-3 items)', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;

    // topActions MUST be present
    expect(body['topActions']).toBeDefined();
    expect(Array.isArray(body['topActions'])).toBe(true);

    const actions = body['topActions'] as Array<Record<string, unknown>>;
    // V1-M10 raised topActions limit from 3 → 5 for better score transparency
    expect(actions.length).toBeLessThanOrEqual(5);

    // Each action has required TopAction fields
    for (const action of actions) {
      expect(typeof action['id']).toBe('string');
      expect(typeof action['title']).toBe('string');
      expect(typeof action['severity']).toBe('string');
      expect(typeof action['command']).toBe('string');
    }
  }, 30_000);

  // ── T-8: filterContext in /fix/apply-all response ──

  it('POST /fix/apply-all response includes filterContext from last scan', async () => {
    // First scan to populate scan result with filterContext
    const scanRes = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(scanRes.status).toBe(200);

    // Now call fix/apply-all — should include filterContext from last scan
    const fixRes = await application.app.request('/fix/apply-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(fixRes.status).toBe(200);
    const body = await fixRes.json() as Record<string, unknown>;

    // filterContext from last scan MUST be in fix response
    expect(body['filterContext']).toBeDefined();
    const ctx = body['filterContext'] as ScanFilterContext;
    expect(ctx.role).toBe('deployer');
    expect(ctx.riskLevel).toBe('limited');
    expect(ctx.profileFound).toBe(true);
  }, 60_000);
});

// ─── Without Profile: baseline behavior ─────────────────────────

describe.skipIf(!canRunE2E)('Context-Scan E2E — no profile (V1-M08)', () => {
  let application: Application;
  /** Isolated temp dir — bypasses vitest worker module-state leakage from "with profile" suite. */
  let tempProjectPath: string;
  const compliorDir = resolve(TEST_PROJECT, '.complior');
  const profilePath = resolve(compliorDir, 'profile.json');
  let savedProfile: string | null = null;

  beforeAll(async () => {
    // Back up and remove profile.json from TEST_PROJECT so "with profile" suite cleanup is complete
    if (existsSync(profilePath)) {
      savedProfile = await readFile(profilePath, 'utf-8');
      await rm(profilePath);
    }

    // Create a fresh isolated temp project — guaranteed no profile.json,
    // and bypasses any module-level wizard state from the "with profile" application.
    tempProjectPath = await mkdtemp(resolve(tmpdir(), 'complior-no-profile-'));
    // Copy essential dirs so scan doesn't fail on missing .complior structure
    if (existsSync(compliorDir)) {
      await mkdir(resolve(tempProjectPath, '.complior'), { recursive: true });
      // Copy agents dir so passport listing doesn't fail
      const agentsSrc = resolve(compliorDir, 'agents');
      if (existsSync(agentsSrc)) {
        await mkdir(resolve(tempProjectPath, '.complior', 'agents'), { recursive: true });
      }
    }
    // Ensure package.json so scan can read it
    await writeFile(resolve(tempProjectPath, 'package.json'), JSON.stringify({ name: 'temp-no-profile' }), 'utf-8');

    process.env['COMPLIOR_PROJECT_PATH'] = tempProjectPath;
    application = await loadApplication();
  }, 30_000);

  afterAll(async () => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
    // Restore profile to original TEST_PROJECT
    if (savedProfile) {
      await mkdir(compliorDir, { recursive: true });
      await writeFile(profilePath, savedProfile, 'utf-8');
    }
    // Clean up temp dir
    await rm(tempProjectPath, { recursive: true, force: true });
  });

  it('POST /scan without profile returns profileFound=false in filterContext', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: tempProjectPath }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;

    // When no profile: filterContext.profileFound MUST be false
    // (filterContext must still be present to allow CLI to show "run complior init" hint)
    expect(body['filterContext']).toBeDefined();
    const ctx = body['filterContext'] as ScanFilterContext;
    expect(ctx.profileFound).toBe(false);
    // No filtering applied without profile
    expect(ctx.skippedByRole).toBe(0);
    expect(ctx.skippedByRiskLevel).toBe(0);
  }, 30_000);
});
