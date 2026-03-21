import { describe, it, expect } from 'vitest';
import { buildPassportEvalBlock, mergeEvalIntoPassport } from './eval-passport.js';
import type { EvalResult } from './types.js';

const mockResult: EvalResult = Object.freeze({
  target: 'http://localhost:4000/api/chat',
  tier: 'full',
  overallScore: 78,
  grade: 'B',
  categories: [
    { category: 'transparency', score: 90, grade: 'A', passed: 9, failed: 1, errors: 0, skipped: 0, total: 10 },
    { category: 'bias', score: 60, grade: 'C', passed: 3, failed: 2, errors: 0, skipped: 0, total: 5 },
  ],
  securityScore: 85,
  securityGrade: 'B',
  results: [],
  totalTests: 15,
  passed: 12,
  failed: 3,
  errors: 0,
  duration: 10000,
  timestamp: '2026-03-21T10:00:00Z',
  criticalCapped: false,
  agent: 'my-agent',
});

describe('buildPassportEvalBlock', () => {
  it('maps all fields from EvalResult', () => {
    const block = buildPassportEvalBlock(mockResult);
    expect(block.eval_score).toBe(78);
    expect(block.eval_grade).toBe('B');
    expect(block.eval_tier).toBe('full');
    expect(block.eval_target).toBe('http://localhost:4000/api/chat');
    expect(block.eval_date).toBe('2026-03-21T10:00:00Z');
    expect(block.eval_tests_total).toBe(15);
    expect(block.eval_tests_passed).toBe(12);
    expect(block.eval_tests_failed).toBe(3);
    expect(block.eval_critical_capped).toBe(false);
    expect(block.eval_security_score).toBe(85);
    expect(block.eval_security_grade).toBe('B');
  });

  it('includes category breakdown', () => {
    const block = buildPassportEvalBlock(mockResult);
    expect(block.eval_categories.length).toBe(2);
    expect(block.eval_categories[0]!.category).toBe('transparency');
    expect(block.eval_categories[0]!.score).toBe(90);
  });
});

describe('mergeEvalIntoPassport', () => {
  it('adds eval block to compliance', () => {
    const passport = { name: 'test-agent', compliance: { complior_score: 80 } };
    const block = buildPassportEvalBlock(mockResult);
    const updated = mergeEvalIntoPassport(passport, block);
    expect((updated.compliance as Record<string, unknown>).eval).toEqual(block);
    // Preserves existing compliance fields
    expect((updated.compliance as Record<string, unknown>).complior_score).toBe(80);
  });

  it('does not mutate original passport', () => {
    const passport = { name: 'test-agent', compliance: { complior_score: 80 } };
    const block = buildPassportEvalBlock(mockResult);
    mergeEvalIntoPassport(passport, block);
    // Original should not have eval
    expect((passport.compliance as Record<string, unknown>).eval).toBeUndefined();
  });

  it('adds updated timestamp', () => {
    const passport = { name: 'test-agent' };
    const block = buildPassportEvalBlock(mockResult);
    const updated = mergeEvalIntoPassport(passport, block);
    expect(updated.updated).toBeDefined();
  });

  it('handles passport with no compliance block', () => {
    const passport = { name: 'test-agent' };
    const block = buildPassportEvalBlock(mockResult);
    const updated = mergeEvalIntoPassport(passport, block);
    expect((updated.compliance as Record<string, unknown>).eval).toEqual(block);
  });
});
