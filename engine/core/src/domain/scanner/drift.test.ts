import { describe, it, expect } from 'vitest';
import { detectDrift } from './drift.js';
import type { ScanResult, Finding, ScoreBreakdown } from '../../types/common.types.js';

const makeScore = (totalScore: number): ScoreBreakdown => ({
  totalScore,
  zone: totalScore >= 80 ? 'green' : totalScore >= 50 ? 'yellow' : 'red',
  categoryScores: [],
  criticalCapApplied: false,
  totalChecks: 10,
  passedChecks: Math.round(totalScore / 10),
  failedChecks: 10 - Math.round(totalScore / 10),
  skippedChecks: 0,
});

const makeFinding = (overrides: Partial<Finding> = {}): Finding => ({
  checkId: 'test-check',
  type: 'fail',
  message: 'Test failure',
  severity: 'medium',
  ...overrides,
});

const makeScanResult = (score: number, findings: readonly Finding[]): ScanResult => ({
  score: makeScore(score),
  findings,
  projectPath: '/test',
  scannedAt: new Date().toISOString(),
  duration: 100,
  filesScanned: 10,
});

describe('detectDrift', () => {
  it('returns no drift when results are identical', () => {
    const findings = [makeFinding({ checkId: 'check-1' })];
    const result = detectDrift(
      makeScanResult(75, findings),
      makeScanResult(75, findings),
    );

    expect(result.hasDrift).toBe(false);
    expect(result.severity).toBe('none');
    expect(result.scoreChange).toBe(0);
    expect(result.newFailures).toHaveLength(0);
    expect(result.resolvedFailures).toHaveLength(0);
  });

  it('detects new failures', () => {
    const previous = makeScanResult(80, [makeFinding({ checkId: 'check-1' })]);
    const current = makeScanResult(70, [
      makeFinding({ checkId: 'check-1' }),
      makeFinding({ checkId: 'check-2', articleReference: 'Art. 50(1)' }),
    ]);

    const result = detectDrift(current, previous);

    expect(result.hasDrift).toBe(true);
    expect(result.newFailures).toHaveLength(1);
    expect(result.newFailures[0].checkId).toBe('check-2');
    expect(result.scoreChange).toBe(-10);
  });

  it('detects resolved failures', () => {
    const previous = makeScanResult(60, [
      makeFinding({ checkId: 'check-1' }),
      makeFinding({ checkId: 'check-2' }),
    ]);
    const current = makeScanResult(80, [makeFinding({ checkId: 'check-1' })]);

    const result = detectDrift(current, previous);

    expect(result.hasDrift).toBe(true);
    expect(result.resolvedFailures).toHaveLength(1);
    expect(result.resolvedFailures[0].checkId).toBe('check-2');
    expect(result.scoreChange).toBe(20);
  });

  it('classifies critical: new Art. 5 prohibited failure', () => {
    const previous = makeScanResult(80, []);
    const current = makeScanResult(70, [
      makeFinding({ checkId: 'prohibited', articleReference: 'Art. 5(1)(a)', severity: 'critical' }),
    ]);

    const result = detectDrift(current, previous);

    expect(result.severity).toBe('critical');
  });

  it('classifies critical: new critical severity finding', () => {
    const previous = makeScanResult(80, []);
    const current = makeScanResult(70, [
      makeFinding({ checkId: 'banned-pkg', severity: 'critical' }),
    ]);

    const result = detectDrift(current, previous);

    expect(result.severity).toBe('critical');
  });

  it('classifies major: score dropped >10 points', () => {
    const previous = makeScanResult(80, []);
    const current = makeScanResult(65, [
      makeFinding({ checkId: 'check-1', severity: 'medium' }),
    ]);

    const result = detectDrift(current, previous);

    expect(result.severity).toBe('major');
  });

  it('classifies major: new high-severity finding', () => {
    const previous = makeScanResult(80, []);
    const current = makeScanResult(75, [
      makeFinding({ checkId: 'check-1', severity: 'high' }),
    ]);

    const result = detectDrift(current, previous);

    expect(result.severity).toBe('major');
  });

  it('classifies minor: score dropped 1-10 points', () => {
    const previous = makeScanResult(80, []);
    const current = makeScanResult(75, [
      makeFinding({ checkId: 'check-1', severity: 'low' }),
    ]);

    const result = detectDrift(current, previous);

    expect(result.severity).toBe('minor');
  });

  it('classifies none: score improved', () => {
    const previous = makeScanResult(70, [makeFinding({ checkId: 'check-1' })]);
    const current = makeScanResult(80, []);

    const result = detectDrift(current, previous);

    expect(result.severity).toBe('none');
  });

  it('collects affected articles', () => {
    const previous = makeScanResult(80, [
      makeFinding({ checkId: 'check-1', articleReference: 'Art. 12' }),
    ]);
    const current = makeScanResult(70, [
      makeFinding({ checkId: 'check-2', articleReference: 'Art. 50(1)' }),
    ]);

    const result = detectDrift(current, previous);

    expect(result.affectedArticles).toContain('Art. 50(1)');
    expect(result.affectedArticles).toContain('Art. 12');
  });

  it('deduplicates affected articles', () => {
    const previous = makeScanResult(80, [
      makeFinding({ checkId: 'check-1', articleReference: 'Art. 12' }),
    ]);
    const current = makeScanResult(70, [
      makeFinding({ checkId: 'check-2', articleReference: 'Art. 12' }),
    ]);

    const result = detectDrift(current, previous);

    const art12Count = result.affectedArticles.filter((a) => a === 'Art. 12').length;
    expect(art12Count).toBe(1);
  });

  it('handles empty findings on both sides', () => {
    const result = detectDrift(makeScanResult(100, []), makeScanResult(100, []));

    expect(result.hasDrift).toBe(false);
    expect(result.severity).toBe('none');
  });

  it('distinguishes findings by file path', () => {
    const previous = makeScanResult(70, [
      makeFinding({ checkId: 'l4-bare-llm', file: 'src/api.ts' }),
    ]);
    const current = makeScanResult(60, [
      makeFinding({ checkId: 'l4-bare-llm', file: 'src/api.ts' }),
      makeFinding({ checkId: 'l4-bare-llm', file: 'src/chat.ts' }),
    ]);

    const result = detectDrift(current, previous);

    expect(result.newFailures).toHaveLength(1);
    expect(result.newFailures[0].file).toBe('src/chat.ts');
  });
});
