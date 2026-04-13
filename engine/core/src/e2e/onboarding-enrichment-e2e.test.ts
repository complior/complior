/**
 * V1-M09: Onboarding Enrichment E2E — full HTTP contract tests.
 *
 * Tests the onboarding HTTP routes through real Hono in-memory application.
 * Covers:
 * - T-1: GET /onboarding/questions returns 5 blocks with 9 questions
 * - T-4: POST /onboarding/complete with reconfigure=true overwrites profile
 * - T-5: POST /onboarding/detect returns gpaiModelDetected field
 * - Integration: enriched profile → scan → filterContext uses dynamic obligations
 *
 * Uses loadApplication() + isolated temp project directory.
 * RED tests: MUST fail until nodejs-dev implements T-4 and T-5.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { loadApplication, type Application } from '../composition-root.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PROJECT = process.env['COMPLIOR_TEST_PROJECT']
  ?? resolve(__dirname, '../../../../..', 'test-projects/acme-ai-support');

const canRunE2E = existsSync(resolve(TEST_PROJECT, 'package.json'));

// ── T-1: Questions endpoint ──────────────────────────────────

describe.skipIf(!canRunE2E)('Onboarding Enrichment E2E — Questions (T-1)', () => {
  let application: Application;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
  }, 30_000);

  afterAll(async () => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('GET /onboarding/questions returns 5 blocks with 9 questions', async () => {
    const res = await application.app.request('/onboarding/questions', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { blocks: Array<{ id: string; questions: unknown[] }> };

    expect(body.blocks).toHaveLength(5);

    const blockIds = body.blocks.map((b) => b.id);
    expect(blockIds).toContain('role');
    expect(blockIds).toContain('business');
    expect(blockIds).toContain('data');
    expect(blockIds).toContain('system');
    expect(blockIds).toContain('deployment');

    const totalQuestions = body.blocks.reduce(
      (sum, b) => sum + b.questions.length, 0,
    );
    expect(totalQuestions).toBe(9);
  });
});

// ── T-4: Reconfigure via HTTP ────────────────────────────────

describe.skipIf(!canRunE2E)('Onboarding Enrichment E2E — Reconfigure (T-4)', () => {
  let application: Application;
  let tempProjectPath: string;

  beforeAll(async () => {
    // Create isolated temp project — guaranteed clean state
    tempProjectPath = await mkdtemp(resolve(tmpdir(), 'complior-e2e-reconfig-'));
    await mkdir(resolve(tempProjectPath, '.complior'), { recursive: true });
    await writeFile(
      resolve(tempProjectPath, 'package.json'),
      JSON.stringify({
        name: 'test-reconfig-e2e',
        version: '1.0.0',
        dependencies: { openai: '^4.0.0', typescript: '^5.0.0' },
      }),
    );

    process.env['COMPLIOR_PROJECT_PATH'] = tempProjectPath;
    application = await loadApplication();
  }, 30_000);

  afterAll(async () => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
    await rm(tempProjectPath, { recursive: true, force: true });
  });

  it('POST /onboarding/complete creates initial profile', async () => {
    const res = await application.app.request('/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: {
          org_role: 'deployer',
          domain: 'general',
          data_types: ['public'],
          data_storage: 'eu',
          system_type: 'feature',
          gpai_model: 'no',
          user_facing: 'yes',
          autonomous_decisions: 'no',
          biometric_data: 'no',
        },
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { profile: { organization: { role: string }; computed: { applicableObligations: string[] } } };
    expect(body.profile.organization.role).toBe('deployer');
    // deployer + limited + no GPAI = 16 obligations
    expect(body.profile.computed.applicableObligations.length).toBe(16);
  });

  it('GET /onboarding/status shows hasProfile=true after init', async () => {
    const res = await application.app.request('/onboarding/status', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { hasProfile: boolean };
    expect(body.hasProfile).toBe(true);
  });

  it('POST /onboarding/complete with reconfigure=true overwrites with new profile', async () => {
    const res = await application.app.request('/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: {
          org_role: 'provider',
          domain: 'healthcare',
          data_types: ['health', 'personal'],
          data_storage: 'eu',
          system_type: 'standalone',
          gpai_model: 'yes',
          user_facing: 'yes',
          autonomous_decisions: 'yes',
          biometric_data: 'no',
        },
        reconfigure: true,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as {
      profile: {
        organization: { role: string };
        computed: {
          riskLevel: string;
          applicableObligations: string[];
          gpaiModel: boolean;
        };
      };
    };

    expect(body.profile.organization.role).toBe('provider');
    expect(body.profile.computed.riskLevel).toBe('high');
    expect(body.profile.computed.gpaiModel).toBe(true);
    // provider + high + GPAI = 77 obligations
    expect(body.profile.computed.applicableObligations.length).toBe(77);
  });

  it('GET /onboarding/profile returns the reconfigured profile', async () => {
    const res = await application.app.request('/onboarding/profile', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const body = await res.json() as {
      organization: { role: string };
      computed: { riskLevel: string; gpaiModel: boolean };
    };

    expect(body.organization.role).toBe('provider');
    expect(body.computed.riskLevel).toBe('high');
    expect(body.computed.gpaiModel).toBe(true);
  });
});

// ── T-5: Auto-detect GPAI via HTTP ───────────────────────────

describe.skipIf(!canRunE2E)('Onboarding Enrichment E2E — GPAI Auto-Detect (T-5)', () => {
  let application: Application;

  beforeAll(async () => {
    // acme-ai-support has openai in dependencies → should detect GPAI
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
  }, 30_000);

  afterAll(async () => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('POST /onboarding/detect returns gpaiModelDetected field', async () => {
    const res = await application.app.request('/onboarding/detect', {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;

    // gpaiModelDetected must be a boolean (true or false)
    expect(typeof body['gpaiModelDetected']).toBe('boolean');
  });

  it('POST /onboarding/detect for project with openai → gpaiModelDetected=true', async () => {
    // acme-ai-support uses OpenAI SDK
    const res = await application.app.request('/onboarding/detect', {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { gpaiModelDetected: boolean; aiLibraries: string[] };

    expect(body.aiLibraries).toContain('OpenAI SDK');
    expect(body.gpaiModelDetected).toBe(true);
  });
});

// ── Integration: enriched profile → scan ─────────────────────

describe.skipIf(!canRunE2E)('Onboarding Enrichment E2E — Scan Integration', () => {
  let application: Application;
  let tempProjectPath: string;

  beforeAll(async () => {
    tempProjectPath = await mkdtemp(resolve(tmpdir(), 'complior-e2e-enriched-scan-'));
    await mkdir(resolve(tempProjectPath, '.complior'), { recursive: true });
    await writeFile(
      resolve(tempProjectPath, 'package.json'),
      JSON.stringify({
        name: 'test-enriched-scan',
        version: '1.0.0',
        dependencies: { openai: '^4.0.0' },
      }),
    );

    process.env['COMPLIOR_PROJECT_PATH'] = tempProjectPath;
    application = await loadApplication();

    // Create enriched profile via HTTP
    await application.app.request('/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: {
          org_role: 'deployer',
          domain: 'healthcare',
          data_types: ['health'],
          data_storage: 'eu',
          system_type: 'feature',
          gpai_model: 'yes',
          user_facing: 'yes',
          autonomous_decisions: 'no',
          biometric_data: 'no',
        },
      }),
    });
  }, 30_000);

  afterAll(async () => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
    await rm(tempProjectPath, { recursive: true, force: true });
  });

  it('POST /scan after enriched init has filterContext with correct obligation count', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: tempProjectPath }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as {
      filterContext?: {
        profileFound: boolean;
        role: string;
        riskLevel: string;
        applicableObligationCount: number;
      };
    };

    expect(body.filterContext).toBeDefined();
    expect(body.filterContext!.profileFound).toBe(true);
    expect(body.filterContext!.role).toBe('deployer');
    expect(body.filterContext!.riskLevel).toBe('high');
    // deployer + high + GPAI = 46 obligations
    expect(body.filterContext!.applicableObligations).toBe(46);
  }, 30_000);
});
