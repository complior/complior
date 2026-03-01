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

  const scanService = {
    scan: vi.fn().mockImplementation(async () => {
      // After fix, simulate pass for the fixed check
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
});
