import { describe, it, expect } from 'vitest';
import { computeComplianceDiff, formatDiffMarkdown } from './compliance-diff.js';
import type { ScanResult, Finding } from '../../types/common.types.js';

const createScanResult = (score: number, findings: Partial<Finding>[]): ScanResult => ({
  score: { totalScore: score } as ScanResult['score'],
  findings: findings.map((f) => ({
    checkId: f.checkId ?? 'check-1',
    type: f.type ?? 'fail',
    message: f.message ?? 'test',
    severity: f.severity ?? 'medium',
    file: f.file,
  })) as unknown as readonly Finding[],
  projectPath: '/test',
  scannedAt: '2026-03-01T00:00:00Z',
  duration: 100,
  filesScanned: 10,
});

describe('computeComplianceDiff', () => {
  it('detects new findings', () => {
    const before = createScanResult(70, [
      { checkId: 'c1', message: 'old finding', type: 'fail' },
    ]);
    const after = createScanResult(65, [
      { checkId: 'c1', message: 'old finding', type: 'fail' },
      { checkId: 'c2', message: 'new finding', type: 'fail', severity: 'high' },
    ]);

    const diff = computeComplianceDiff(before, after);
    expect(diff.newFindings).toHaveLength(1);
    expect(diff.newFindings[0].checkId).toBe('c2');
    expect(diff.newFindings[0].status).toBe('new');
    expect(diff.resolvedFindings).toHaveLength(0);
    expect(diff.unchangedCount).toBe(1);
  });

  it('detects resolved findings', () => {
    const before = createScanResult(60, [
      { checkId: 'c1', message: 'fixed', type: 'fail' },
      { checkId: 'c2', message: 'still there', type: 'fail' },
    ]);
    const after = createScanResult(80, [
      { checkId: 'c2', message: 'still there', type: 'fail' },
    ]);

    const diff = computeComplianceDiff(before, after);
    expect(diff.resolvedFindings).toHaveLength(1);
    expect(diff.resolvedFindings[0].checkId).toBe('c1');
    expect(diff.resolvedFindings[0].status).toBe('resolved');
    expect(diff.scoreDelta).toBe(20);
  });

  it('computes score delta correctly', () => {
    const before = createScanResult(50, []);
    const after = createScanResult(75, []);

    const diff = computeComplianceDiff(before, after);
    expect(diff.scoreBefore).toBe(50);
    expect(diff.scoreAfter).toBe(75);
    expect(diff.scoreDelta).toBe(25);
    expect(diff.hasRegression).toBe(false);
  });

  it('detects regression when score drops', () => {
    const before = createScanResult(80, []);
    const after = createScanResult(60, [{ checkId: 'c1', message: 'bad', type: 'fail' }]);

    const diff = computeComplianceDiff(before, after);
    expect(diff.hasRegression).toBe(true);
    expect(diff.scoreDelta).toBe(-20);
  });

  it('detects critical regression', () => {
    const before = createScanResult(80, []);
    const after = createScanResult(80, [
      { checkId: 'c1', message: 'critical issue', type: 'fail', severity: 'critical' },
    ]);

    const diff = computeComplianceDiff(before, after);
    expect(diff.hasCriticalNew).toBe(true);
    expect(diff.hasRegression).toBe(true);
  });

  it('handles null before (first scan)', () => {
    const after = createScanResult(65, [
      { checkId: 'c1', message: 'finding', type: 'fail' },
    ]);

    const diff = computeComplianceDiff(null, after);
    expect(diff.scoreBefore).toBe(0);
    expect(diff.scoreAfter).toBe(65);
    expect(diff.scoreDelta).toBe(65);
    expect(diff.newFindings).toHaveLength(1);
    expect(diff.resolvedFindings).toHaveLength(0);
  });

  it('filters findings to changed files', () => {
    const before = createScanResult(70, [
      { checkId: 'c1', message: 'in changed', file: 'src/app.ts', type: 'fail' },
      { checkId: 'c2', message: 'not changed', file: 'src/util.ts', type: 'fail' },
    ]);
    const after = createScanResult(60, [
      { checkId: 'c1', message: 'in changed', file: 'src/app.ts', type: 'fail' },
      { checkId: 'c2', message: 'not changed', file: 'src/util.ts', type: 'fail' },
      { checkId: 'c3', message: 'new in changed', file: 'src/app.ts', type: 'fail' },
    ]);

    const diff = computeComplianceDiff(before, after, ['src/app.ts']);
    expect(diff.newFindings).toHaveLength(1);
    expect(diff.newFindings[0].checkId).toBe('c3');
    // c2 is not in changed files, so it's excluded from diff
  });

  it('returns frozen result', () => {
    const diff = computeComplianceDiff(null, createScanResult(50, []));
    expect(Object.isFrozen(diff)).toBe(true);
  });

  it('ignores pass findings', () => {
    const before = createScanResult(70, [
      { checkId: 'c1', message: 'pass', type: 'pass' },
    ]);
    const after = createScanResult(70, []);

    const diff = computeComplianceDiff(before, after);
    expect(diff.newFindings).toHaveLength(0);
    expect(diff.resolvedFindings).toHaveLength(0);
  });
});

describe('formatDiffMarkdown', () => {
  it('generates markdown table', () => {
    const diff = computeComplianceDiff(
      createScanResult(60, [
        { checkId: 'c1', message: 'resolved', type: 'fail' },
      ]),
      createScanResult(75, [
        { checkId: 'c2', message: 'new issue', type: 'fail', severity: 'high' },
      ]),
    );

    const md = formatDiffMarkdown(diff);
    expect(md).toContain('## Compliance Diff');
    expect(md).toContain('60%');
    expect(md).toContain('75%');
    expect(md).toContain('### New Findings');
    expect(md).toContain('### Resolved Findings');
    expect(md).toContain('c2');
    expect(md).toContain('c1');
  });

  it('shows regression warning', () => {
    const diff = computeComplianceDiff(
      createScanResult(80, []),
      createScanResult(60, [
        { checkId: 'c1', message: 'critical', type: 'fail', severity: 'critical' },
      ]),
    );

    const md = formatDiffMarkdown(diff);
    expect(md).toContain('regression');
    expect(md).toContain('CRITICAL');
  });
});
