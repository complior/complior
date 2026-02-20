import { describe, it, expect } from 'vitest';
import { buildAuditReportData } from './audit-report.js';
import type { ScanResult } from '../../types/common.types.js';

const makeScanResult = (overrides?: Partial<ScanResult>): ScanResult => ({
  score: {
    totalScore: 72,
    zone: 'yellow',
    categoryScores: [
      { category: 'Transparency', weight: 0.2, score: 60, obligationCount: 5, passedCount: 3 },
      { category: 'Documentation', weight: 0.15, score: 80, obligationCount: 4, passedCount: 3 },
    ],
    criticalCapApplied: false,
    totalChecks: 10,
    passedChecks: 7,
    failedChecks: 3,
    skippedChecks: 0,
  },
  findings: [
    { checkId: 'chk-1', type: 'fail', message: 'No AI disclosure', severity: 'high', obligationId: 'OBL-015', articleReference: 'Art. 50(1)', fix: 'Add AI disclosure component', file: 'src/app.tsx', line: 10 },
    { checkId: 'chk-2', type: 'fail', message: 'No C2PA marking', severity: 'high', obligationId: 'OBL-016', articleReference: 'Art. 50(2)', fix: 'Add C2PA metadata' },
    { checkId: 'chk-3', type: 'fail', message: 'Missing monitoring', severity: 'medium', obligationId: 'OBL-011', articleReference: 'Art. 26' },
    { checkId: 'chk-4', type: 'pass', message: 'Logging present', severity: 'info' },
  ],
  projectPath: '/test',
  scannedAt: new Date().toISOString(),
  duration: 1200,
  filesScanned: 50,
  ...overrides,
});

describe('audit-report', () => {
  it('builds report data with correct executive summary', () => {
    const result = makeScanResult();
    const report = buildAuditReportData(result, { organization: 'ACME Corp' });

    expect(report.score).toBe(72);
    expect(report.zone).toBe('Partial Compliance');
    expect(report.organization).toBe('ACME Corp');
    expect(report.executiveSummary.highIssues).toBe(2);
    expect(report.executiveSummary.mediumIssues).toBe(1);
    expect(report.executiveSummary.criticalIssues).toBe(0);
    expect(report.executiveSummary.recommendedActions).toBe(3);
  });

  it('builds remediation plan sorted by severity', () => {
    const result = makeScanResult();
    const report = buildAuditReportData(result, {});

    expect(report.remediationPlan.length).toBe(3);
    expect(report.remediationPlan[0].obligationId).toBe('OBL-015');
    expect(report.remediationPlan[0].priority).toBe(1);
    expect(report.remediationPlan[0].effort).toBe('2-4 hours');
  });

  it('includes category breakdown from scan', () => {
    const result = makeScanResult();
    const report = buildAuditReportData(result, {});

    expect(report.categoryBreakdown.length).toBe(2);
    expect(report.categoryBreakdown[0].category).toBe('Transparency');
  });

  it('returns green zone label for high scores', () => {
    const result = makeScanResult({
      score: { ...makeScanResult().score, totalScore: 90, zone: 'green' },
    });
    const report = buildAuditReportData(result, {});
    expect(report.zone).toBe('Good Compliance');
  });

  it('returns red zone label for low scores', () => {
    const result = makeScanResult({
      score: { ...makeScanResult().score, totalScore: 30, zone: 'red' },
    });
    const report = buildAuditReportData(result, {});
    expect(report.zone).toBe('Critical Non-Compliance');
  });

  it('top recommendations come from highest severity findings', () => {
    const result = makeScanResult();
    const report = buildAuditReportData(result, {});

    expect(report.executiveSummary.topRecommendations.length).toBe(3);
    expect(report.executiveSummary.topRecommendations[0]).toBe('Add AI disclosure component');
  });
});
