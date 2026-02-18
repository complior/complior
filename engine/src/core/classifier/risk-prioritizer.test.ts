import { describe, it, expect } from 'vitest';
import { scoreFinding, prioritizeFindings } from './risk-prioritizer.js';
import { createMockFinding } from '../../test-helpers/factories.js';

describe('scoreFinding', () => {
  it('scores critical findings at 1000', () => {
    const finding = createMockFinding({ severity: 'critical' });
    expect(scoreFinding(finding)).toBe(1000);
  });

  it('scores high findings at 500', () => {
    const finding = createMockFinding({ severity: 'high' });
    expect(scoreFinding(finding)).toBe(500);
  });

  it('scores medium findings at 300', () => {
    const finding = createMockFinding({ severity: 'medium' });
    expect(scoreFinding(finding)).toBe(300);
  });

  it('scores low findings at 100', () => {
    const finding = createMockFinding({ severity: 'low' });
    expect(scoreFinding(finding)).toBe(100);
  });

  it('scores info findings at 0', () => {
    const finding = createMockFinding({ severity: 'info' });
    expect(scoreFinding(finding)).toBe(0);
  });
});

describe('prioritizeFindings', () => {
  it('sorts findings by severity descending', () => {
    const findings = [
      createMockFinding({ checkId: 'low', severity: 'low' }),
      createMockFinding({ checkId: 'critical', severity: 'critical' }),
      createMockFinding({ checkId: 'medium', severity: 'medium' }),
    ];

    const result = prioritizeFindings(findings);

    expect(result[0]?.checkId).toBe('critical');
    expect(result[1]?.checkId).toBe('medium');
    expect(result[2]?.checkId).toBe('low');
  });

  it('assigns priority values to each finding', () => {
    const findings = [createMockFinding({ severity: 'high' })];
    const result = prioritizeFindings(findings);

    expect(result[0]?.priority).toBe(500);
  });

  it('does not mutate original array', () => {
    const findings = [
      createMockFinding({ checkId: 'low', severity: 'low' }),
      createMockFinding({ checkId: 'critical', severity: 'critical' }),
    ];
    const originalFirst = findings[0]?.checkId;

    prioritizeFindings(findings);

    expect(findings[0]?.checkId).toBe(originalFirst);
  });

  it('returns empty array for empty input', () => {
    const result = prioritizeFindings([]);
    expect(result).toHaveLength(0);
  });

  it('handles single finding', () => {
    const findings = [createMockFinding({ severity: 'critical' })];
    const result = prioritizeFindings(findings);

    expect(result).toHaveLength(1);
    expect(result[0]?.priority).toBe(1000);
  });
});
