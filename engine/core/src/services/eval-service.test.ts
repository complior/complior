import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEvalService } from './eval-service.js';
import type { LoggerPort } from '../ports/logger.port.js';

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
