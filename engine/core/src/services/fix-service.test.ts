import { describe, it, expect, vi } from 'vitest';
import { createFixService } from './fix-service.js';
import type { FixPlan } from '../domain/fixer/types.js';
import { createMockScanResult, createMockFinding } from '../test-helpers/factories.js';

const createMockPlan = (overrides?: Partial<FixPlan>): FixPlan => ({
  obligationId: 'OBL-015',
  checkId: 'ai-disclosure',
  article: 'Art. 52',
  fixType: 'template_generation',
  framework: 'Next.js',
  actions: [{ type: 'create', path: 'ai-disclosure.md', content: '# AI Disclosure', description: 'Create disclosure' }],
  diff: '+# AI Disclosure',
  scoreImpact: 5,
  commitMessage: 'feat: add AI disclosure',
  description: 'Add AI disclosure document',
  ...overrides,
});

const createTestDeps = () => {
  let scanResult = createMockScanResult({
    score: {
      totalScore: 60,
      zone: 'yellow',
      categoryScores: [],
      criticalCapApplied: false,
      totalChecks: 10,
      passedChecks: 6,
      failedChecks: 3,
      skippedChecks: 1,
    },
    findings: [
      createMockFinding({ checkId: 'ai-disclosure', type: 'fail', obligationId: 'OBL-015' }),
      createMockFinding({ checkId: 'data-governance', type: 'fail', obligationId: 'OBL-006' }),
    ],
  });

  const events = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  const fixer = {
    previewFix: vi.fn().mockReturnValue(createMockPlan()),
    generateFix: vi.fn().mockReturnValue(createMockPlan()),
    generateFixes: vi.fn().mockReturnValue([
      createMockPlan(),
      createMockPlan({ checkId: 'data-governance', obligationId: 'OBL-006', article: 'Art. 10' }),
    ]),
  };

  let scanCallCount = 0;
  const scanService = {
    scan: vi.fn().mockImplementation(async () => {
      scanCallCount++;
      if (scanCallCount <= 1) {
        // First call: baseline scan (P14 normalization) — returns pre-fix score
        scanResult = createMockScanResult({
          score: {
            totalScore: 60,
            zone: 'yellow',
            categoryScores: [],
            criticalCapApplied: false,
            totalChecks: 10,
            passedChecks: 6,
            failedChecks: 3,
            skippedChecks: 1,
          },
          findings: [
            createMockFinding({ checkId: 'ai-disclosure', type: 'fail', obligationId: 'OBL-015' }),
            createMockFinding({ checkId: 'data-governance', type: 'fail', obligationId: 'OBL-006' }),
          ],
        });
      } else {
        // Subsequent calls: after fix, simulate pass for the fixed check
        scanResult = createMockScanResult({
          score: {
            totalScore: 70,
            zone: 'yellow',
            categoryScores: [],
            criticalCapApplied: false,
            totalChecks: 10,
            passedChecks: 7,
            failedChecks: 2,
            skippedChecks: 1,
          },
          findings: [
            createMockFinding({ checkId: 'ai-disclosure', type: 'pass', obligationId: 'OBL-015' }),
            createMockFinding({ checkId: 'data-governance', type: 'fail', obligationId: 'OBL-006' }),
          ],
        });
      }
      return scanResult;
    }),
  };

  return {
    deps: {
      fixer,
      scanService,
      events,
      getProjectPath: () => '/tmp/test-project',
      getLastScanResult: () => scanResult,
      loadTemplate: vi.fn().mockResolvedValue('template content'),
    },
    events,
    scanService,
  };
};

describe('fix-service', () => {
  describe('applyAndValidate', () => {
    it('returns validation with before=fail and after=pass for successful fix', async () => {
      const { deps } = createTestDeps();
      const service = createFixService(deps);
      const plan = createMockPlan();

      const result = await service.applyAndValidate(plan);

      expect(result.applied).toBe(true);
      expect(result.validation.before).toBe('fail');
      expect(result.validation.after).toBe('pass');
      expect(result.validation.scoreDelta).toBe(10);
      expect(result.validation.checkId).toBe('ai-disclosure');
    });

    it('emits fix.validated event with correct data', async () => {
      const { deps, events } = createTestDeps();
      const service = createFixService(deps);
      const plan = createMockPlan();

      await service.applyAndValidate(plan);

      expect(events.emit).toHaveBeenCalledWith('fix.validated', {
        checkId: 'ai-disclosure',
        passed: true,
        scoreDelta: 10,
      });
    });
  });

  describe('applyAllAndValidate', () => {
    it('returns aggregate totalDelta across multiple fixes', async () => {
      let callCount = 0;
      let currentScore = 60;
      const findings = [
        createMockFinding({ checkId: 'ai-disclosure', type: 'fail', obligationId: 'OBL-015' }),
        createMockFinding({ checkId: 'data-governance', type: 'fail', obligationId: 'OBL-006' }),
      ];

      const scanResult = () => createMockScanResult({
        score: {
          totalScore: currentScore,
          zone: currentScore >= 80 ? 'green' : 'yellow',
          categoryScores: [],
          criticalCapApplied: false,
          totalChecks: 10,
          passedChecks: 6 + callCount,
          failedChecks: 3 - callCount,
          skippedChecks: 1,
        },
        findings: findings.map((f) => callCount > 0 && f.checkId === 'ai-disclosure'
          ? { ...f, type: 'pass' as const }
          : callCount > 1 && f.checkId === 'data-governance'
            ? { ...f, type: 'pass' as const }
            : f,
        ),
      });

      const events = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
      const scanService = {
        scan: vi.fn().mockImplementation(async () => {
          callCount++;
          currentScore += 5;
          return scanResult();
        }),
      };

      const service = createFixService({
        fixer: {
          previewFix: vi.fn(),
          generateFix: vi.fn(),
          generateFixes: vi.fn().mockReturnValue([
            createMockPlan(),
            createMockPlan({ checkId: 'data-governance', obligationId: 'OBL-006', article: 'Art. 10' }),
          ]),
        },
        scanService,
        events,
        getProjectPath: () => '/tmp/test-project',
        getLastScanResult: scanResult,
        loadTemplate: vi.fn(),
      });

      const { results, totalDelta } = await service.applyAllAndValidate();

      expect(results).toHaveLength(2);
      expect(totalDelta).toBe(10); // 5 per fix × 2
    });
  });

  describe('no-change detection', () => {
    it('reports scoreDelta of 0 when fix does not improve score', async () => {
      const scanResult = createMockScanResult({
        score: {
          totalScore: 60,
          zone: 'yellow',
          categoryScores: [],
          criticalCapApplied: false,
          totalChecks: 10,
          passedChecks: 6,
          failedChecks: 3,
          skippedChecks: 1,
        },
        findings: [
          createMockFinding({ checkId: 'ai-disclosure', type: 'fail', obligationId: 'OBL-015' }),
        ],
      });

      const events = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
      const scanService = {
        scan: vi.fn().mockResolvedValue(scanResult), // Returns same score
      };

      const service = createFixService({
        fixer: { previewFix: vi.fn(), generateFix: vi.fn(), generateFixes: vi.fn() },
        scanService,
        events,
        getProjectPath: () => '/tmp/test-project',
        getLastScanResult: () => scanResult,
        loadTemplate: vi.fn(),
      });

      const plan = createMockPlan();
      const result = await service.applyAndValidate(plan);

      expect(result.validation.scoreDelta).toBe(0);
    });
  });

  describe('P14: scoreBefore normalization', () => {
    it('scoreBefore reflects basic scan even when last scan was deep', async () => {
      // Simulate: getLastScanResult returns deep scan score (86)
      // but scanService.scan() returns basic scan score (91)
      const deepScanResult = createMockScanResult({
        score: {
          totalScore: 86,
          zone: 'green',
          categoryScores: [],
          criticalCapApplied: false,
          totalChecks: 10,
          passedChecks: 8,
          failedChecks: 1,
          skippedChecks: 1,
        },
        findings: [
          createMockFinding({ checkId: 'ai-disclosure', type: 'fail', obligationId: 'OBL-015' }),
        ],
      });

      const basicScanResult = createMockScanResult({
        score: {
          totalScore: 91,
          zone: 'green',
          categoryScores: [],
          criticalCapApplied: false,
          totalChecks: 10,
          passedChecks: 9,
          failedChecks: 0,
          skippedChecks: 1,
        },
        findings: [
          createMockFinding({ checkId: 'ai-disclosure', type: 'pass', obligationId: 'OBL-015' }),
        ],
      });

      const events = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
      const scanService = {
        scan: vi.fn().mockResolvedValue(basicScanResult),
      };

      const service = createFixService({
        fixer: {
          previewFix: vi.fn().mockReturnValue(createMockPlan()),
          generateFix: vi.fn(),
          generateFixes: vi.fn(),
        },
        scanService,
        events,
        getProjectPath: () => '/tmp/test-project',
        getLastScanResult: () => deepScanResult, // Deep scan with score 86
        loadTemplate: vi.fn(),
      });

      const plan = createMockPlan();
      const result = await service.applyFix(plan);

      // scoreBefore should be 91 (from basic baseline scan), not 86 (from deep scan)
      expect(result.scoreBefore).toBe(91);
    });
  });

  describe('P1: Phase 2 cascade for create actions', () => {
    it('applies create actions discovered during Phase 2 cascade re-scan', async () => {
      let scanCallCount = 0;

      // Initial create plan (Phase 1a) + cascading create plan discovered in Phase 2
      const initialPlan = createMockPlan({
        checkId: 'l1-ai-disclosure',
        actions: [{ type: 'create', path: 'ai-disclosure.md', content: '# Disclosure', description: 'Create disclosure' }],
      });

      const cascadePlan = createMockPlan({
        checkId: 'l3-docker-compose',
        obligationId: 'OBL-030',
        article: 'Art. 15',
        actions: [{ type: 'create', path: 'docker-compose.override.yml', content: 'version: "3"', description: 'Create override' }],
      });

      const events = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
      const scanService = {
        scan: vi.fn().mockImplementation(async () => {
          scanCallCount++;
          return createMockScanResult({
            score: {
              totalScore: 60 + scanCallCount * 5,
              zone: 'yellow',
              categoryScores: [],
              criticalCapApplied: false,
              totalChecks: 10,
              passedChecks: 6 + scanCallCount,
              failedChecks: 4 - scanCallCount,
              skippedChecks: 0,
            },
            findings: scanCallCount < 3
              ? [createMockFinding({ checkId: 'l3-docker-compose', type: 'fail' })]
              : [],
          });
        }),
      };

      let fixerCallCount = 0;
      const fixer = {
        previewFix: vi.fn(),
        generateFix: vi.fn(),
        generateFixes: vi.fn().mockImplementation(() => {
          fixerCallCount++;
          if (fixerCallCount === 1) return [initialPlan];
          if (fixerCallCount === 2) return [cascadePlan]; // New create action after re-scan
          return [];
        }),
      };

      const service = createFixService({
        fixer,
        scanService,
        events,
        getProjectPath: () => '/tmp/test-project',
        getLastScanResult: () => createMockScanResult(),
        loadTemplate: vi.fn().mockResolvedValue('template'),
      });

      const results = await service.applyAll();

      // Both initial create and cascading create should be applied
      const applied = results.filter(r => r.applied);
      expect(applied.length).toBeGreaterThanOrEqual(2);
      expect(applied.some(r => r.plan.checkId === 'l3-docker-compose')).toBe(true);
    });
  });

  describe('getCurrentScore', () => {
    it('returns current score from last scan result', () => {
      const { deps } = createTestDeps();
      const service = createFixService(deps);
      expect(service.getCurrentScore()).toBe(60);
    });

    it('returns 0 when no scan result', () => {
      const { deps } = createTestDeps();
      const service = createFixService({
        ...deps,
        getLastScanResult: () => null,
      });
      expect(service.getCurrentScore()).toBe(0);
    });
  });

  describe('P15: getUnfixedFindings', () => {
    it('returns fail findings without auto-fix', () => {
      const scanResult = createMockScanResult({
        score: {
          totalScore: 80,
          zone: 'green',
          categoryScores: [],
          criticalCapApplied: false,
          totalChecks: 10,
          passedChecks: 7,
          failedChecks: 3,
          skippedChecks: 0,
        },
        findings: [
          createMockFinding({ checkId: 'ai-disclosure', type: 'fail', obligationId: 'OBL-015' }),
          createMockFinding({ checkId: 'l4-logging', type: 'fail', obligationId: 'OBL-020' }),
          createMockFinding({ checkId: 'l4-record-keeping', type: 'fail', obligationId: 'OBL-021' }),
          createMockFinding({ checkId: 'data-governance', type: 'pass', obligationId: 'OBL-006' }),
        ],
      });

      const events = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
      const fixer = {
        previewFix: vi.fn(),
        generateFix: vi.fn(),
        // Only ai-disclosure has an auto-fix
        generateFixes: vi.fn().mockReturnValue([
          createMockPlan({ checkId: 'ai-disclosure' }),
        ]),
      };

      const service = createFixService({
        fixer,
        scanService: { scan: vi.fn() },
        events,
        getProjectPath: () => '/tmp/test-project',
        getLastScanResult: () => scanResult,
        loadTemplate: vi.fn(),
      });

      const unfixed = service.getUnfixedFindings();

      // l4-logging and l4-record-keeping are fail findings without auto-fix
      expect(unfixed).toHaveLength(2);
      expect(unfixed.map((f) => f.checkId)).toEqual(['l4-logging', 'l4-record-keeping']);
    });

    it('returns empty array when all fail findings have auto-fixes', () => {
      const scanResult = createMockScanResult({
        score: {
          totalScore: 80,
          zone: 'green',
          categoryScores: [],
          criticalCapApplied: false,
          totalChecks: 10,
          passedChecks: 9,
          failedChecks: 1,
          skippedChecks: 0,
        },
        findings: [
          createMockFinding({ checkId: 'ai-disclosure', type: 'fail', obligationId: 'OBL-015' }),
        ],
      });

      const service = createFixService({
        fixer: {
          previewFix: vi.fn(),
          generateFix: vi.fn(),
          generateFixes: vi.fn().mockReturnValue([createMockPlan({ checkId: 'ai-disclosure' })]),
        },
        scanService: { scan: vi.fn() },
        events: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
        getProjectPath: () => '/tmp/test-project',
        getLastScanResult: () => scanResult,
        loadTemplate: vi.fn(),
      });

      expect(service.getUnfixedFindings()).toHaveLength(0);
    });
  });
});

/**
 * V1-M19 T-3: Fix Profile Filter integration tests — RED test specs.
 *
 * Tests that previewAll filters out fix plans for findings that were
 * skipped by the scan's profile filtering (role, domain).
 *
 * RED until fix-profile-filter.ts is created + wired into fix-service previewAll.
 */
describe('V1-M19: fix-service profile-based fix filtering', () => {
  it('previewAll with deployer profile: excludes provider-only fixes, reports fixFilterContext', async () => {
    // Scan result contains both fail and skip findings (role-filtered by scanner)
    const scanResult = createMockScanResult({
      score: {
        totalScore: 55,
        zone: 'yellow',
        categoryScores: [],
        criticalCapApplied: false,
        totalChecks: 10,
        passedChecks: 5,
        failedChecks: 3,
        skippedChecks: 2,
      },
      findings: [
        // Provider-only check → scanner already set to 'skip' for deployer
        createMockFinding({ checkId: 'qms', type: 'skip', severity: 'medium' }),
        // Provider-only check → scanner already set to 'skip' for deployer
        createMockFinding({ checkId: 'gpai-transparency', type: 'skip', severity: 'high' }),
        // Deployer-applicable check → fail (needs fix)
        createMockFinding({ checkId: 'ai-disclosure', type: 'fail', obligationId: 'OBL-015' }),
        // Universal check → fail (needs fix)
        createMockFinding({ checkId: 'interaction-logging', type: 'fail', obligationId: 'OBL-020' }),
      ],
    });

    // Fixer generates plans for ALL findings (it doesn't know about profiles)
    const allPlans: FixPlan[] = [
      createMockPlan({ checkId: 'qms', obligationId: 'OBL-001', article: 'Art. 17' }),
      createMockPlan({ checkId: 'gpai-transparency', obligationId: 'OBL-002', article: 'Art. 53' }),
      createMockPlan({ checkId: 'ai-disclosure', obligationId: 'OBL-015', article: 'Art. 52' }),
      createMockPlan({ checkId: 'interaction-logging', obligationId: 'OBL-020', article: 'Art. 14' }),
    ];

    const service = createFixService({
      fixer: {
        previewFix: vi.fn(),
        generateFix: vi.fn(),
        generateFixes: vi.fn().mockReturnValue(allPlans),
      },
      scanService: { scan: vi.fn() },
      events: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
      getProjectPath: () => '/tmp/test-project',
      getLastScanResult: () => scanResult,
      loadTemplate: vi.fn(),
      // V1-M19: getProjectProfile enables fix profile filtering
      getProjectProfile: async () => ({
        role: 'deployer' as const,
        riskLevel: 'high',
        domain: null,
      }),
    });

    const plans = service.previewAll();

    // Provider-only fixes (qms, gpai-transparency) should be excluded
    // because their findings are type: 'skip'
    expect(plans).toHaveLength(2);
    expect(plans.map(p => p.checkId)).toEqual(['ai-disclosure', 'interaction-logging']);

    // fixFilterContext should be available on the service
    const filterContext = service.getFixFilterContext?.();
    expect(filterContext).toBeDefined();
    expect(filterContext!.totalPlans).toBe(4);
    expect(filterContext!.applicablePlans).toBe(2);
    expect(filterContext!.excludedBySkip).toBe(2);
    expect(filterContext!.profileFound).toBe(true);
  });

  it('previewAll with healthcare domain: excludes HR-only fixes', async () => {
    // Scan result: HR checks already skipped by domain filter, healthcare checks fail
    const scanResult = createMockScanResult({
      score: {
        totalScore: 60,
        zone: 'yellow',
        categoryScores: [],
        criticalCapApplied: false,
        totalChecks: 10,
        passedChecks: 6,
        failedChecks: 2,
        skippedChecks: 2,
      },
      findings: [
        // HR-only check → skipped by domain filter for healthcare project
        createMockFinding({ checkId: 'industry-hr-bias', type: 'skip', severity: 'medium' }),
        // HR-only check → skipped by domain filter
        createMockFinding({ checkId: 'industry-hr-notification', type: 'skip', severity: 'medium' }),
        // Healthcare check → fail (applicable)
        createMockFinding({ checkId: 'industry-healthcare-clinical', type: 'fail', severity: 'high' }),
        // Universal check → fail (applicable)
        createMockFinding({ checkId: 'ai-disclosure', type: 'fail', obligationId: 'OBL-015' }),
      ],
    });

    const allPlans: FixPlan[] = [
      createMockPlan({ checkId: 'industry-hr-bias', article: 'Art. 26' }),
      createMockPlan({ checkId: 'industry-hr-notification', article: 'Art. 26' }),
      createMockPlan({ checkId: 'industry-healthcare-clinical', article: 'Art. 14' }),
      createMockPlan({ checkId: 'ai-disclosure', obligationId: 'OBL-015', article: 'Art. 52' }),
    ];

    const service = createFixService({
      fixer: {
        previewFix: vi.fn(),
        generateFix: vi.fn(),
        generateFixes: vi.fn().mockReturnValue(allPlans),
      },
      scanService: { scan: vi.fn() },
      events: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
      getProjectPath: () => '/tmp/test-project',
      getLastScanResult: () => scanResult,
      loadTemplate: vi.fn(),
      getProjectProfile: async () => ({
        role: 'deployer' as const,
        riskLevel: 'high',
        domain: 'healthcare',
      }),
    });

    const plans = service.previewAll();

    // HR-only fixes should be excluded (their findings are type: 'skip')
    expect(plans).toHaveLength(2);
    expect(plans.map(p => p.checkId)).toEqual([
      'industry-healthcare-clinical',
      'ai-disclosure',
    ]);
  });
});
