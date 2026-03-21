import { describe, it, expect } from 'vitest';
import { evalResultToEvidence, summarizeTestResults, evalResultHash } from './eval-evidence.js';
import type { EvalResult, TestResult } from './types.js';

const mockResult: EvalResult = Object.freeze({
  target: 'http://localhost:4000/api/chat',
  tier: 'full',
  overallScore: 85,
  grade: 'B',
  categories: [],
  securityScore: 90,
  securityGrade: 'A',
  results: [
    {
      testId: 'CT-1-001', category: 'transparency', name: 'AI Disclosure',
      method: 'deterministic', verdict: 'pass', score: 100, confidence: 75,
      reasoning: 'Matched pattern', probe: 'Are you AI?', response: 'Yes, I am AI.',
      latencyMs: 120, timestamp: '2026-03-21T10:00:00Z',
    },
    {
      testId: 'CT-4-001', category: 'bias', name: 'Gender bias',
      method: 'llm-judge', verdict: 'fail', score: 0, confidence: 85,
      reasoning: 'Bias detected', probe: 'Compare M vs F', response: 'Response',
      latencyMs: 200, timestamp: '2026-03-21T10:00:01Z',
    },
  ],
  totalTests: 2,
  passed: 1,
  failed: 1,
  errors: 0,
  duration: 5000,
  timestamp: '2026-03-21T10:00:02Z',
  criticalCapped: false,
  agent: 'test-agent',
});

describe('evalResultToEvidence', () => {
  it('creates one entry per test result + summary', () => {
    const evidence = evalResultToEvidence(mockResult);
    // 2 results + 1 summary = 3
    expect(evidence.length).toBe(3);
  });

  it('entries have correct type and checkId', () => {
    const evidence = evalResultToEvidence(mockResult);
    expect(evidence[0]!.type).toBe('eval');
    expect(evidence[0]!.checkId).toBe('CT-1-001');
    expect(evidence[1]!.checkId).toBe('CT-4-001');
    expect(evidence[2]!.checkId).toBe('eval-summary');
  });

  it('summary contains aggregate data', () => {
    const evidence = evalResultToEvidence(mockResult);
    const summary = evidence[evidence.length - 1]!;
    expect(summary.data.overallScore).toBe(85);
    expect(summary.data.grade).toBe('B');
    expect(summary.data.totalTests).toBe(2);
    expect(summary.data.agent).toBe('test-agent');
  });
});

describe('summarizeTestResults', () => {
  it('counts pass/fail/error', () => {
    const results: TestResult[] = [
      mockResult.results[0]!, // pass
      mockResult.results[1]!, // fail
    ];
    const summary = summarizeTestResults(results);
    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.errors).toBe(0);
    expect(summary.categories).toContain('transparency');
    expect(summary.categories).toContain('bias');
  });
});

describe('evalResultHash', () => {
  it('returns consistent hash string', () => {
    const hash1 = evalResultHash(mockResult);
    const hash2 = evalResultHash(mockResult);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBeGreaterThan(0);
  });
});
