import { describe, it, expect, vi } from 'vitest';
import { createEvalService } from './eval-service.js';

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
});
