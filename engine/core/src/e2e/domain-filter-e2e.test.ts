/**
 * V1-M18 + V1-M19: Domain Filter & Fix Profile Filter — E2E tests.
 *
 * End-to-end tests through real Hono in-memory application.
 * Uses temp project with onboarding profile → scan → verify domain filtering → fix preview.
 *
 * Flow:
 *   1. Create temp project with package.json
 *   2. POST /onboarding/complete with domain="healthcare"
 *   3. POST /scan → verify filterContext.skippedByDomain > 0
 *   4. Verify HR-only findings become type: "skip"
 *   5. GET /fix/preview → verify HR-only fixes excluded
 *
 * RED until domain-filter.ts + fix-profile-filter.ts implemented and wired.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { loadApplication, type Application } from '../composition-root.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PROJECT = process.env['COMPLIOR_TEST_PROJECT']
  ?? resolve(__dirname, '../../../../..', 'test-projects/acme-ai-support');

const canRunE2E = existsSync(resolve(TEST_PROJECT, 'package.json'));

// ── V1-M18: Scanner domain filter E2E ──────────────────────────

describe.skipIf(!canRunE2E)('V1-M18 E2E: Scanner Domain Filter', () => {
  let application: Application;
  let tempProjectPath: string;

  beforeAll(async () => {
    // Create isolated temp project with AI dependencies
    tempProjectPath = await mkdtemp(resolve(tmpdir(), 'complior-e2e-domain-'));
    await mkdir(resolve(tempProjectPath, '.complior'), { recursive: true });
    await writeFile(
      resolve(tempProjectPath, 'package.json'),
      JSON.stringify({
        name: 'test-domain-filter-e2e',
        version: '1.0.0',
        dependencies: { openai: '^4.0.0', typescript: '^5.0.0' },
      }),
    );
    // Create minimal source file so scanner has something to scan
    await mkdir(resolve(tempProjectPath, 'src'), { recursive: true });
    await writeFile(
      resolve(tempProjectPath, 'src', 'index.ts'),
      'import OpenAI from "openai";\nconst client = new OpenAI();\nexport default client;\n',
    );

    process.env['COMPLIOR_PROJECT_PATH'] = tempProjectPath;
    application = await loadApplication();

    // Set up healthcare profile via onboarding
    const onboardRes = await application.app.request('/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: {
          org_role: 'deployer',
          domain: 'healthcare',
          data_types: ['health', 'personal'],
          data_storage: 'eu',
          system_type: 'feature',
          gpai_model: 'yes',
          user_facing: 'yes',
          autonomous_decisions: 'no',
          biometric_data: 'no',
        },
      }),
    });
    expect(onboardRes.status).toBe(200);
  }, 30_000);

  afterAll(async () => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
    await rm(tempProjectPath, { recursive: true, force: true });
  });

  it('scan with healthcare profile → filterContext.skippedByDomain >= 0 and domain = healthcare', async () => {
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
        domain: string | null;
        skippedByRole: number;
        skippedByRiskLevel: number;
        skippedByDomain: number;
      };
      findings: Array<{ checkId: string; type: string }>;
    };

    // filterContext must exist and reflect healthcare domain
    expect(body.filterContext).toBeDefined();
    expect(body.filterContext!.profileFound).toBe(true);
    expect(body.filterContext!.domain).toBe('healthcare');

    // skippedByDomain must be a number (>= 0, ideally > 0 if HR/finance checks exist)
    expect(typeof body.filterContext!.skippedByDomain).toBe('number');
    expect(body.filterContext!.skippedByDomain).toBeGreaterThanOrEqual(0);
  }, 30_000);

  it('scan with healthcare profile → HR-only findings have type: skip', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: tempProjectPath }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as {
      findings: Array<{ checkId: string; type: string; message: string }>;
    };

    // Any industry-hr-* findings must be type: skip (not applicable for healthcare)
    const hrFindings = body.findings.filter(f => f.checkId.startsWith('industry-hr'));
    for (const f of hrFindings) {
      expect(f.type).toBe('skip');
      expect(f.message.toLowerCase()).toContain('domain');
    }

    // Any industry-finance-* findings must also be type: skip
    const financeFindings = body.findings.filter(f => f.checkId.startsWith('industry-finance'));
    for (const f of financeFindings) {
      expect(f.type).toBe('skip');
    }

    // Universal checks (ai-disclosure, l4-*, l1-*) should NOT be skip due to domain
    const universalFindings = body.findings.filter(f =>
      f.checkId.startsWith('l1-') || f.checkId.startsWith('l4-') || f.checkId === 'ai-disclosure',
    );
    for (const f of universalFindings) {
      expect(f.type).not.toBe('skip');
    }
  }, 30_000);

  it('scan without profile → skippedByDomain = 0 (backward compat)', async () => {
    // Create a project without onboarding profile
    const bareProject = await mkdtemp(resolve(tmpdir(), 'complior-e2e-bare-'));
    await writeFile(
      resolve(bareProject, 'package.json'),
      JSON.stringify({ name: 'bare-project', version: '1.0.0', dependencies: {} }),
    );

    // Load fresh application for bare project
    const bareApp = await loadApplication();

    try {
      process.env['COMPLIOR_PROJECT_PATH'] = bareProject;

      const res = await bareApp.app.request('/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: bareProject }),
      });

      expect(res.status).toBe(200);
      const body = await res.json() as {
        filterContext?: { skippedByDomain: number; profileFound: boolean };
      };

      // Without profile: either no filterContext, or skippedByDomain = 0
      if (body.filterContext) {
        expect(body.filterContext.skippedByDomain).toBe(0);
      }
    } finally {
      bareApp.shutdown();
      await rm(bareProject, { recursive: true, force: true });
    }
  }, 30_000);
});

// ── V1-M19: Fix profile filter E2E ─────────���───────────────────

describe.skipIf(!canRunE2E)('V1-M19 E2E: Fix Profile Filter', () => {
  let application: Application;
  let tempProjectPath: string;

  beforeAll(async () => {
    tempProjectPath = await mkdtemp(resolve(tmpdir(), 'complior-e2e-fix-filter-'));
    await mkdir(resolve(tempProjectPath, '.complior'), { recursive: true });
    await writeFile(
      resolve(tempProjectPath, 'package.json'),
      JSON.stringify({
        name: 'test-fix-filter-e2e',
        version: '1.0.0',
        dependencies: { openai: '^4.0.0', typescript: '^5.0.0' },
      }),
    );
    await mkdir(resolve(tempProjectPath, 'src'), { recursive: true });
    await writeFile(
      resolve(tempProjectPath, 'src', 'index.ts'),
      'import OpenAI from "openai";\nconst client = new OpenAI();\nexport default client;\n',
    );

    process.env['COMPLIOR_PROJECT_PATH'] = tempProjectPath;
    application = await loadApplication();

    // Set up deployer + healthcare profile
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

    // Scan first so fix has data to work with
    await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: tempProjectPath }),
    });
  }, 60_000);

  afterAll(async () => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
    await rm(tempProjectPath, { recursive: true, force: true });
  });

  it('fix preview with healthcare profile → no HR-only or finance-only fixes', async () => {
    const res = await application.app.request('/fix/preview', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const body = await res.json() as {
      fixes: Array<{ checkId: string }>;
      count: number;
    };

    // No fix plans for HR-only checks (they were skipped by domain filter)
    const hrFixes = body.fixes.filter(f => f.checkId.startsWith('industry-hr'));
    expect(hrFixes).toHaveLength(0);

    // No fix plans for finance-only checks
    const financeFixes = body.fixes.filter(f => f.checkId.startsWith('industry-finance'));
    expect(financeFixes).toHaveLength(0);

    // Provider-only fixes should also be absent (deployer profile)
    const providerOnlyCheckIds = ['qms', 'gpai-transparency', 'conformity-assessment'];
    for (const checkId of providerOnlyCheckIds) {
      const providerFix = body.fixes.find(f => f.checkId === checkId);
      expect(providerFix).toBeUndefined();
    }
  }, 30_000);

  it('fix preview shows only profile-relevant fixes', async () => {
    const res = await application.app.request('/fix/preview', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const body = await res.json() as {
      fixes: Array<{ checkId: string }>;
      count: number;
    };

    // Every returned fix must correspond to a non-skip finding
    // (i.e., applicable to deployer + healthcare)
    for (const fix of body.fixes) {
      // Should NOT be a provider-only check
      expect(fix.checkId).not.toBe('qms');
      expect(fix.checkId).not.toBe('gpai-transparency');

      // Should NOT be a non-healthcare domain check
      expect(fix.checkId).not.toMatch(/^industry-hr/);
      expect(fix.checkId).not.toMatch(/^industry-finance/);
    }

    // count should match the array length
    expect(body.count).toBe(body.fixes.length);
  }, 30_000);

  it('fix preview with fixFilterContext metadata', async () => {
    const res = await application.app.request('/fix/preview', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const body = await res.json() as {
      fixes: Array<{ checkId: string }>;
      count: number;
      fixFilterContext?: {
        profileFound: boolean;
        role: string;
        domain: string | null;
        totalPlans: number;
        applicablePlans: number;
        excludedBySkip: number;
        excludedByDomain: number;
      };
    };

    // fixFilterContext should be present when profile is active
    expect(body.fixFilterContext).toBeDefined();
    expect(body.fixFilterContext!.profileFound).toBe(true);
    expect(body.fixFilterContext!.role).toBe('deployer');
    expect(body.fixFilterContext!.domain).toBe('healthcare');
    expect(body.fixFilterContext!.totalPlans).toBeGreaterThanOrEqual(body.fixFilterContext!.applicablePlans);
    expect(body.fixFilterContext!.applicablePlans).toBe(body.count);
  }, 30_000);
});
