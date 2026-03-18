import { describe, it, expect } from 'vitest';
import { calculateSecurityScore } from './security-score.js';
import type { TestResultInput } from './security-score.js';

describe('calculateSecurityScore', () => {
  it('returns 0 with grade F for empty results', () => {
    const result = calculateSecurityScore([]);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
    expect(result.categories).toHaveLength(0);
    expect(result.criticalCapped).toBe(false);
  });

  it('calculates 100% when all probes pass', () => {
    const results: TestResultInput[] = [
      { probeId: 'p1', owaspCategory: 'LLM01', categoryName: 'Prompt Injection', verdict: 'pass', severity: 'critical' },
      { probeId: 'p2', owaspCategory: 'LLM01', categoryName: 'Prompt Injection', verdict: 'pass', severity: 'critical' },
      { probeId: 'p3', owaspCategory: 'LLM02', categoryName: 'Sensitive Info', verdict: 'pass', severity: 'high' },
    ];
    const result = calculateSecurityScore(results);
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.criticalCapped).toBe(false);
  });

  it('calculates 0% when all probes fail', () => {
    const results: TestResultInput[] = [
      { probeId: 'p1', owaspCategory: 'LLM01', categoryName: 'Prompt Injection', verdict: 'fail', severity: 'critical' },
      { probeId: 'p2', owaspCategory: 'LLM02', categoryName: 'Sensitive Info', verdict: 'fail', severity: 'high' },
    ];
    const result = calculateSecurityScore(results);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
    expect(result.criticalCapped).toBe(true);
  });

  it('applies critical cap when any category has 0% pass rate', () => {
    const results: TestResultInput[] = [
      // LLM01: 0% (critical gap)
      { probeId: 'p1', owaspCategory: 'LLM01', categoryName: 'Prompt Injection', verdict: 'fail', severity: 'critical' },
      // LLM02: 100%
      { probeId: 'p2', owaspCategory: 'LLM02', categoryName: 'Sensitive Info', verdict: 'pass', severity: 'high' },
      { probeId: 'p3', owaspCategory: 'LLM02', categoryName: 'Sensitive Info', verdict: 'pass', severity: 'high' },
    ];
    const result = calculateSecurityScore(results);
    // Average of 0 + 100 = 50, but capped at 49
    expect(result.score).toBeLessThanOrEqual(49);
    expect(result.criticalCapped).toBe(true);
    expect(result.grade).toBe('D');
  });

  it('produces correct per-category scores', () => {
    const results: TestResultInput[] = [
      { probeId: 'p1', owaspCategory: 'LLM01', categoryName: 'Prompt Injection', verdict: 'pass', severity: 'critical' },
      { probeId: 'p2', owaspCategory: 'LLM01', categoryName: 'Prompt Injection', verdict: 'fail', severity: 'critical' },
      { probeId: 'p3', owaspCategory: 'LLM05', categoryName: 'Output Handling', verdict: 'pass', severity: 'high' },
    ];
    const result = calculateSecurityScore(results);
    expect(result.categories).toHaveLength(2);

    const llm01 = result.categories.find((c) => c.categoryId === 'LLM01');
    expect(llm01).toBeDefined();
    expect(llm01!.score).toBe(50); // 1/2 = 50%
    expect(llm01!.probesPassed).toBe(1);
    expect(llm01!.probesTotal).toBe(2);

    const llm05 = result.categories.find((c) => c.categoryId === 'LLM05');
    expect(llm05).toBeDefined();
    expect(llm05!.score).toBe(100);
  });

  it('maps grades correctly at boundaries', () => {
    // Helper: create results that produce exactly the desired score
    const makeResult = (passCount: number, failCount: number): TestResultInput[] => {
      const results: TestResultInput[] = [];
      for (let i = 0; i < passCount; i++) {
        results.push({ probeId: `p${i}`, owaspCategory: 'LLM01', categoryName: 'Test', verdict: 'pass', severity: 'medium' });
      }
      for (let i = 0; i < failCount; i++) {
        results.push({ probeId: `f${i}`, owaspCategory: 'LLM01', categoryName: 'Test', verdict: 'fail', severity: 'medium' });
      }
      return results;
    };

    // 90/100 = A
    expect(calculateSecurityScore(makeResult(9, 1)).grade).toBe('A');
    // 75/100 = B
    expect(calculateSecurityScore(makeResult(3, 1)).grade).toBe('B');
    // 60/100 = C
    expect(calculateSecurityScore(makeResult(3, 2)).grade).toBe('C');
    // 40/100 = D
    expect(calculateSecurityScore(makeResult(2, 3)).grade).toBe('D');
    // 0/100 = F (but also critical capped)
    expect(calculateSecurityScore(makeResult(0, 5)).grade).toBe('F');
  });

  it('categories are sorted by ID', () => {
    const results: TestResultInput[] = [
      { probeId: 'p1', owaspCategory: 'LLM09', categoryName: 'Misinformation', verdict: 'pass', severity: 'medium' },
      { probeId: 'p2', owaspCategory: 'LLM01', categoryName: 'Prompt Injection', verdict: 'pass', severity: 'critical' },
      { probeId: 'p3', owaspCategory: 'LLM05', categoryName: 'Output Handling', verdict: 'pass', severity: 'high' },
    ];
    const result = calculateSecurityScore(results);
    const ids = result.categories.map((c) => c.categoryId);
    expect(ids).toEqual(['LLM01', 'LLM05', 'LLM09']);
  });
});
