import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEvalService } from './eval-service.js';
import type { LoggerPort } from '../ports/logger.port.js';
import type { EvalFinding } from '../domain/eval/eval-to-findings.js';

// ── Mocks for applyEvalFixes (dynamic imports in eval-service) ──
vi.mock('../data/eval/remediation/index.js', () => ({ ALL_PLAYBOOKS: [] }));
vi.mock('../domain/eval/eval-to-findings.js', () => ({
  evalToFindings: vi.fn().mockReturnValue([]),
}));
vi.mock('./shared/backup.js', () => ({
  backupFile: vi.fn(async () => '/mock/backup'),
}));

import { evalToFindings } from '../domain/eval/eval-to-findings.js';
import { backupFile } from './shared/backup.js';

const mockLog: LoggerPort = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

describe('createEvalService', () => {
  it('creates frozen service with expected methods', () => {
    const service = createEvalService({
      getProjectPath: () => '/tmp/test',
    });

    expect(typeof service.runEval).toBe('function');
    expect(typeof service.runEvalWithReport).toBe('function');
    expect(typeof service.getPassportEvalBlock).toBe('function');
    expect(typeof service.updatePassportWithEval).toBe('function');
    expect(Object.isFrozen(service)).toBe(true);
  });

  it('updatePassportWithEval merges eval block', () => {
    const service = createEvalService({
      getProjectPath: () => '/tmp/test',
    });

    const mockResult = {
      target: 'http://localhost:4000',
      tier: 'basic' as const,
      overallScore: 75,
      grade: 'B',
      categories: [],
      results: [],
      totalTests: 10,
      passed: 7,
      failed: 3,
      errors: 0,
      duration: 5000,
      timestamp: '2026-03-21T10:00:00Z',
      criticalCapped: false,
    };

    const passport = { name: 'test', compliance: { complior_score: 80 } };
    const updated = service.updatePassportWithEval(passport, mockResult);
    expect((updated.compliance as Record<string, unknown>).eval).toBeDefined();
    expect((updated.compliance as Record<string, unknown>).complior_score).toBe(80);
  });

  it('getPassportEvalBlock extracts eval block', () => {
    const service = createEvalService({
      getProjectPath: () => '/tmp/test',
    });

    const mockResult = {
      target: 'http://localhost:4000',
      tier: 'full' as const,
      overallScore: 85,
      grade: 'B',
      categories: [],
      results: [],
      totalTests: 370,
      passed: 314,
      failed: 56,
      errors: 0,
      duration: 120000,
      timestamp: '2026-03-21T10:00:00Z',
      criticalCapped: false,
      securityScore: 90,
      securityGrade: 'A',
    };

    const block = service.getPassportEvalBlock(mockResult);
    expect(block.eval_score).toBe(85);
    expect(block.eval_grade).toBe('B');
    expect(block.eval_tier).toBe('full');
    expect(block.eval_security_score).toBe(90);
  });

  it('getLastResult returns null for invalid JSON on disk', async () => {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    const dir = resolve('/tmp/eval-test-invalid', '.complior', 'eval');
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, 'latest.json'), '{"not":"valid eval"}');

    const service = createEvalService({
      getProjectPath: () => '/tmp/eval-test-invalid',
      log: mockLog,
    });
    const result = await service.getLastResult();
    expect(result).toBeNull();
    expect(mockLog.warn).toHaveBeenCalled();
  });

  it('getLastResult returns valid result from disk', async () => {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    const dir = resolve('/tmp/eval-test-valid', '.complior', 'eval');
    await mkdir(dir, { recursive: true });
    const validResult = {
      target: 'http://localhost:4000',
      overallScore: 80,
      grade: 'B',
      totalTests: 5,
      passed: 4,
      failed: 1,
      results: [{ testId: 'test-1', verdict: 'pass' }],
    };
    await writeFile(resolve(dir, 'latest.json'), JSON.stringify(validResult));

    const service = createEvalService({
      getProjectPath: () => '/tmp/eval-test-valid',
      log: mockLog,
    });
    const result = await service.getLastResult();
    expect(result).not.toBeNull();
    expect(result!.overallScore).toBe(80);
  });

  it('getLastResult returns null when file missing', async () => {
    const service = createEvalService({
      getProjectPath: () => '/tmp/eval-test-nonexistent',
      log: mockLog,
    });
    const result = await service.getLastResult();
    expect(result).toBeNull();
  });

  it('listResults returns empty array when dir missing', async () => {
    const service = createEvalService({
      getProjectPath: () => '/tmp/eval-test-no-dir',
      log: mockLog,
    });
    const results = await service.listResults();
    expect(results).toEqual([]);
  });

  it('creates service with llm dependency', () => {
    // Judge model is resolved via llm-adapter (user's configured provider) — no hardcoded models
    const service = createEvalService({
      getProjectPath: () => '/tmp/test',
      log: mockLog,
    });
    expect(service).toBeDefined();
  });
});

// ── applyEvalFixes tests (R2) ──────────────────────────────────

describe('applyEvalFixes', () => {
  const setupEvalResult = async (projectPath: string) => {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    const dir = resolve(projectPath, '.complior', 'eval');
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, 'latest.json'), JSON.stringify({
      target: 'http://localhost:4000',
      overallScore: 60,
      grade: 'D',
      totalTests: 10,
      passed: 6,
      failed: 4,
      results: [{ testId: 'CT-1-001', verdict: 'fail' }],
      errors: 0,
      duration: 5000,
      timestamp: '2026-03-21T10:00:00Z',
      criticalCapped: false,
      categories: [],
    }));
  };

  const typeBFinding: EvalFinding = {
    checkId: 'eval-transparency',
    type: 'B',
    layer: 'eval',
    title: 'Transparency: 2 eval failures',
    description: '2 tests failed in Transparency (Art. 13).',
    file: '.complior/eval-fixes/transparency-config.json',
    severity: 'medium',
    article: 'Art. 13',
    fixDescription: 'Add transparency configuration',
    fixExample: '{ "transparency": true }',
  };

  const typeAFinding: EvalFinding = {
    checkId: 'eval-safety',
    type: 'A',
    layer: 'eval',
    title: 'Safety: 1 eval failure',
    description: '1 test failed in Safety (Art. 9).',
    file: 'system-prompt',
    severity: 'high',
    article: 'Art. 9',
    fixDescription: 'Add safety guardrails to system prompt',
    fixExample: 'You must refuse harmful requests...',
  };

  beforeEach(() => {
    vi.mocked(evalToFindings).mockReturnValue([]);
    vi.mocked(backupFile).mockResolvedValue('/mock/backup');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty arrays when no eval result exists', async () => {
    const service = createEvalService({
      getProjectPath: () => '/tmp/eval-fix-no-result',
      log: mockLog,
    });
    const { applied, manual } = await service.applyEvalFixes();
    expect(applied).toEqual([]);
    expect(manual).toEqual([]);
  });

  it('applies Type B config-file fixes and creates files', async () => {
    const dir = `/tmp/eval-fix-type-b-${Date.now()}`;
    await setupEvalResult(dir);
    vi.mocked(evalToFindings).mockReturnValue([typeBFinding]);

    const service = createEvalService({
      getProjectPath: () => dir,
      log: mockLog,
    });

    const { applied, manual } = await service.applyEvalFixes();
    expect(applied).toHaveLength(1);
    expect(applied[0]).toEqual({
      checkId: 'eval-transparency',
      file: '.complior/eval-fixes/transparency-config.json',
      type: 'B',
    });
    expect(manual).toHaveLength(0);

    // Verify file was actually created on disk
    const { readFile } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    const content = await readFile(resolve(dir, '.complior/eval-fixes/transparency-config.json'), 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.checkId).toBe('eval-transparency');
    expect(parsed.article).toBe('Art. 13');
    expect(parsed.fixDescription).toBe('Add transparency configuration');
  });

  it('returns Type A system-prompt fixes as manual guidance', async () => {
    const dir = `/tmp/eval-fix-type-a-${Date.now()}`;
    await setupEvalResult(dir);
    vi.mocked(evalToFindings).mockReturnValue([typeAFinding]);

    const service = createEvalService({
      getProjectPath: () => dir,
      log: mockLog,
    });

    const { applied, manual } = await service.applyEvalFixes();
    expect(applied).toHaveLength(0);
    expect(manual).toHaveLength(1);
    expect(manual[0]).toEqual({
      checkId: 'eval-safety',
      title: 'Safety: 1 eval failure',
      fixDescription: 'Add safety guardrails to system prompt',
      type: 'A',
    });
  });

  it('handles mixed Type A and Type B findings', async () => {
    const dir = `/tmp/eval-fix-mixed-${Date.now()}`;
    await setupEvalResult(dir);
    vi.mocked(evalToFindings).mockReturnValue([typeBFinding, typeAFinding]);

    const service = createEvalService({
      getProjectPath: () => dir,
      log: mockLog,
    });

    const { applied, manual } = await service.applyEvalFixes();
    expect(applied).toHaveLength(1);
    expect(applied[0].checkId).toBe('eval-transparency');
    expect(manual).toHaveLength(1);
    expect(manual[0].checkId).toBe('eval-safety');
  });

  it('calls backupFile before writing fix content', async () => {
    const dir = `/tmp/eval-fix-backup-${Date.now()}`;
    await setupEvalResult(dir);
    vi.mocked(evalToFindings).mockReturnValue([typeBFinding]);

    const service = createEvalService({
      getProjectPath: () => dir,
      log: mockLog,
    });

    await service.applyEvalFixes();
    expect(backupFile).toHaveBeenCalledWith(
      '.complior/eval-fixes/transparency-config.json',
      dir,
    );
  });

  it('records undo history for each applied fix (R1)', async () => {
    const dir = `/tmp/eval-fix-undo-${Date.now()}`;
    await setupEvalResult(dir);
    vi.mocked(evalToFindings).mockReturnValue([typeBFinding]);

    const mockRecordFix = vi.fn();
    const service = createEvalService({
      getProjectPath: () => dir,
      log: mockLog,
      undoService: { recordFix: mockRecordFix } as never,
    });

    await service.applyEvalFixes();
    expect(mockRecordFix).toHaveBeenCalledTimes(1);
    expect(mockRecordFix).toHaveBeenCalledWith(
      expect.objectContaining({ applied: true, scoreBefore: 0, scoreAfter: 0 }),
      expect.objectContaining({ checkId: 'eval-transparency', fixType: 'config_fix' }),
    );
  });

  it('appends evidence for each applied fix (R1)', async () => {
    const dir = `/tmp/eval-fix-evidence-${Date.now()}`;
    await setupEvalResult(dir);
    vi.mocked(evalToFindings).mockReturnValue([typeBFinding]);

    const mockAppend = vi.fn();
    const service = createEvalService({
      getProjectPath: () => dir,
      log: mockLog,
      evidenceStore: { append: mockAppend } as never,
    });

    await service.applyEvalFixes();
    expect(mockAppend).toHaveBeenCalledTimes(1);
    expect(mockAppend).toHaveBeenCalledWith(
      [expect.objectContaining({ findingId: 'eval-transparency', source: 'fix' })],
      expect.any(String),
    );
  });

  it('emits score.updated event after applying fixes (R1)', async () => {
    const dir = `/tmp/eval-fix-event-${Date.now()}`;
    await setupEvalResult(dir);
    vi.mocked(evalToFindings).mockReturnValue([typeBFinding]);

    const mockEmit = vi.fn();
    const mockScan = vi.fn()
      .mockResolvedValueOnce({ score: { totalScore: 60 } })
      .mockResolvedValueOnce({ score: { totalScore: 65 } });

    const service = createEvalService({
      getProjectPath: () => dir,
      log: mockLog,
      events: { emit: mockEmit, on: vi.fn() } as never,
      scanService: { scan: mockScan },
    });

    await service.applyEvalFixes();
    expect(mockScan).toHaveBeenCalledTimes(2);
    expect(mockEmit).toHaveBeenCalledWith('score.updated', { before: 60, after: 65 });
  });
});
