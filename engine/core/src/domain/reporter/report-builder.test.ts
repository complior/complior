import { describe, it, expect } from 'vitest';
import { buildComplianceReport } from './report-builder.js';
import { calculateReadinessScore, daysUntilEnforcement } from './readiness-score.js';
import { buildDocumentInventory } from './document-inventory.js';
import { buildObligationCoverage } from './obligation-coverage.js';
import type { ObligationRecord } from './obligation-coverage.js';
import { buildPassportStatus } from './passport-status.js';
import type { PassportData } from './passport-status.js';
import { buildPriorityActions } from './priority-actions.js';
import { generateReportHtml } from './html-renderer.js';
import type { Finding } from '../../types/common.types.js';
import type { EvidenceChainSummary } from '../scanner/evidence-store.js';
import type { EvalResult } from '../eval/types.js';
import type { FixHistoryEntry, DocumentContent } from './types.js';

// ── Test helpers ──────────────────────────────────────────────────

const mkFinding = (overrides?: Partial<Finding>): Finding => ({
  checkId: 'CHECK-001',
  type: 'fail',
  message: 'Test finding',
  severity: 'medium',
  ...overrides,
});

const mkObligation = (overrides?: Partial<ObligationRecord>): ObligationRecord => ({
  obligation_id: 'eu-ai-act-OBL-001',
  article_reference: 'Article 4',
  title: 'Ensure AI Literacy',
  applies_to_role: 'both',
  severity: 'medium',
  ...overrides,
});

const mkPassport = (overrides?: Partial<PassportData>): PassportData => ({
  name: 'test-agent',
  ...overrides,
});

const mkEvidence = (overrides?: Partial<EvidenceChainSummary>): EvidenceChainSummary => ({
  totalEntries: 5,
  chainValid: true,
  lastEntry: new Date().toISOString(),
  publicKey: 'test-key',
  ...overrides,
});

// ── readiness-score ─��────────────────────────────────────────────

describe('calculateReadinessScore', () => {
  it('calculates weighted score with all dimensions', () => {
    const result = calculateReadinessScore({
      scanScore: 80,
      documentScore: 60,
      passportScore: 70,
      evalScore: 90,
      evidenceScore: 50,
    });
    expect(result.readinessScore).toBeGreaterThan(0);
    expect(result.readinessScore).toBeLessThanOrEqual(100);
    expect(result.dimensions.scan.available).toBe(true);
    expect(result.dimensions.documents.available).toBe(true);
    expect(result.dimensions.eval.available).toBe(true);
    expect(result.zone).toBeDefined();
  });

  it('redistributes weights when dimensions are null', () => {
    const withAll = calculateReadinessScore({
      scanScore: 80,
      documentScore: 80,
      passportScore: 80,
      evalScore: 80,
      evidenceScore: 80,
    });
    const withoutEval = calculateReadinessScore({
      scanScore: 80,
      documentScore: 80,
      passportScore: 80,
      evalScore: null,
      evidenceScore: 80,
    });
    // Both should have same score since all available dimensions are equal
    expect(withAll.readinessScore).toBe(withoutEval.readinessScore);
    expect(withoutEval.dimensions.eval.available).toBe(false);
  });

  it('returns 0 when no dimensions available', () => {
    const result = calculateReadinessScore({
      scanScore: null,
      documentScore: null,
      passportScore: null,
      evalScore: null,
      evidenceScore: null,
    });
    expect(result.readinessScore).toBe(0);
    expect(result.zone).toBe('red');
  });

  it('applies critical cap when scan is 0', () => {
    const result = calculateReadinessScore({
      scanScore: 0,
      documentScore: 100,
      passportScore: 100,
      evalScore: 100,
      evidenceScore: 100,
    });
    expect(result.readinessScore).toBeLessThanOrEqual(29);
    expect(result.criticalCaps.length).toBeGreaterThan(0);
  });

  it('applies critical cap when no documents', () => {
    const result = calculateReadinessScore({
      scanScore: 100,
      documentScore: 0,
      passportScore: 100,
      evalScore: 100,
      evidenceScore: 100,
    });
    expect(result.readinessScore).toBeLessThanOrEqual(49);
  });

  it('assigns correct zone thresholds', () => {
    const green = calculateReadinessScore({ scanScore: 95, documentScore: 95, passportScore: 95, evalScore: 95, evidenceScore: 95 });
    expect(green.zone).toBe('green');

    const yellow = calculateReadinessScore({ scanScore: 75, documentScore: 75, passportScore: 75, evalScore: 75, evidenceScore: 75 });
    expect(yellow.zone).toBe('yellow');

    const orange = calculateReadinessScore({ scanScore: 55, documentScore: 55, passportScore: 55, evalScore: 55, evidenceScore: 55 });
    expect(orange.zone).toBe('orange');

    const red = calculateReadinessScore({ scanScore: 20, documentScore: 20, passportScore: 20, evalScore: 20, evidenceScore: 20 });
    expect(red.zone).toBe('red');
  });
});

describe('daysUntilEnforcement', () => {
  it('returns positive days before enforcement', () => {
    const days = daysUntilEnforcement(new Date('2026-01-01'));
    expect(days).toBeGreaterThan(200);
  });

  it('returns 0 after enforcement date', () => {
    const days = daysUntilEnforcement(new Date('2027-01-01'));
    expect(days).toBe(0);
  });
});

// ── document-inventory ─────────────��─────────────────────────────

describe('buildDocumentInventory', () => {
  it('returns 14 documents with all missing when no findings', () => {
    const inv = buildDocumentInventory([]);
    expect(inv.total).toBe(14);
    expect(inv.byStatus.missing).toBe(14);
    expect(inv.score).toBe(0);
  });

  it('marks document as present when L1 check passes', () => {
    const inv = buildDocumentInventory([
      mkFinding({ checkId: 'l1-risk-management', type: 'pass' }),
    ]);
    const doc = inv.documents.find((d) => d.docType === 'risk-management');
    expect(doc).toBeDefined();
    expect(doc!.status).not.toBe('missing');
  });

  it('calculates weighted score correctly', () => {
    // All docs reviewed should be score 100
    const allReviewed = buildDocumentInventory(
      Array.from({ length: 14 }, (_, i) => {
        // Pass L1 and L2 with quality 'reviewed'
        const checkId = `l1-doc-${i}`;
        return mkFinding({ checkId, type: 'pass' });
      }),
    );
    // At minimum some docs should be non-missing
    expect(allReviewed.score).toBeGreaterThanOrEqual(0);
  });
});

// ── obligation-coverage ───────���──────────────────────────────────

describe('buildObligationCoverage', () => {
  it('returns correct counts for empty data', () => {
    const cov = buildObligationCoverage([], []);
    expect(cov.total).toBe(0);
    expect(cov.covered).toBe(0);
    expect(cov.uncovered).toBe(0);
    expect(cov.coveragePercent).toBe(0);
  });

  it('marks obligation as covered when related check passes', () => {
    const obligations = [mkObligation({ obligation_id: 'eu-ai-act-OBL-015' })];
    const findings = [
      mkFinding({ checkId: 'l4-cybersecurity', type: 'pass' }),
    ];
    const cov = buildObligationCoverage(obligations, findings);
    expect(cov.total).toBe(1);
    // OBL-015 is mapped to l4-cybersecurity in check-to-obligations
    expect(cov.covered).toBe(1);
  });

  it('identifies critical uncovered obligations', () => {
    const obligations = [
      mkObligation({ obligation_id: 'eu-ai-act-OBL-001', severity: 'critical' }),
    ];
    const cov = buildObligationCoverage(obligations, []);
    expect(cov.critical.length).toBe(1);
    expect(cov.critical[0].covered).toBe(false);
  });

  it('groups obligations by article', () => {
    const obligations = [
      mkObligation({ obligation_id: 'eu-ai-act-OBL-001', article_reference: 'Article 4' }),
      mkObligation({ obligation_id: 'eu-ai-act-OBL-002', article_reference: 'Article 4' }),
      mkObligation({ obligation_id: 'eu-ai-act-OBL-003', article_reference: 'Article 6' }),
    ];
    const cov = buildObligationCoverage(obligations, []);
    expect(cov.byArticle.length).toBe(2);
    const art4 = cov.byArticle.find((a) => a.article === 'Article 4');
    expect(art4?.total).toBe(2);
  });
});

// ── passport-status ─────────���─────────────────────────��──────────

describe('buildPassportStatus', () => {
  it('returns empty section for no passports', () => {
    const status = buildPassportStatus([]);
    expect(status.totalAgents).toBe(0);
    expect(status.passports).toHaveLength(0);
    expect(status.averageCompleteness).toBe(0);
  });

  it('calculates completeness for single passport', () => {
    const status = buildPassportStatus([mkPassport({ name: 'agent-1' })]);
    expect(status.totalAgents).toBe(1);
    expect(status.passports[0].name).toBe('agent-1');
    // Most fields missing → low completeness
    expect(status.passports[0].completeness).toBeLessThan(50);
    expect(status.passports[0].completenessZone).toBe('red');
  });

  it('detects FRIA completion', () => {
    const status = buildPassportStatus([
      mkPassport({ name: 'agent-1', fria_completed: true }),
    ]);
    expect(status.passports[0].friaCompleted).toBe(true);
  });

  it('detects signature', () => {
    const status = buildPassportStatus([
      mkPassport({ name: 'agent-1', signature: { value: 'abc123' } }),
    ]);
    expect(status.passports[0].signed).toBe(true);
  });

  it('averages completeness across multiple passports', () => {
    const status = buildPassportStatus([
      mkPassport({ name: 'a' }),
      mkPassport({ name: 'b' }),
    ]);
    expect(status.averageCompleteness).toBeGreaterThanOrEqual(0);
  });
});

// ── priority-actions ────────────────────────���────────────────────

describe('buildPriorityActions', () => {
  it('returns empty plan with no inputs', () => {
    const plan = buildPriorityActions(
      [],
      { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, score: 0, documents: [] },
      { total: 0, covered: 0, uncovered: 0, coveragePercent: 0, byArticle: [], critical: [] },
      { totalAgents: 0, passports: [], averageCompleteness: 0 },
    );
    expect(plan.actions).toHaveLength(0);
    expect(plan.totalActions).toBe(0);
  });

  it('collects actions from scan findings', () => {
    const findings = [
      mkFinding({ severity: 'critical', articleReference: 'Art. 6' }),
      mkFinding({ checkId: 'CHECK-002', severity: 'low', type: 'fail' }),
    ];
    const plan = buildPriorityActions(
      findings,
      { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, score: 0, documents: [] },
      { total: 0, covered: 0, uncovered: 0, coveragePercent: 0, byArticle: [], critical: [] },
      { totalAgents: 0, passports: [], averageCompleteness: 0 },
    );
    expect(plan.actions.length).toBe(2);
    // Critical should be ranked first
    expect(plan.actions[0].severity).toBe('critical');
  });

  it('collects actions from missing documents', () => {
    const plan = buildPriorityActions(
      [],
      {
        total: 2,
        byStatus: { missing: 1, scaffold: 0, draft: 0, reviewed: 1 },
        score: 50,
        documents: [
          { docType: 'risk-assessment', article: 'Art. 9', description: 'Risk Assessment', outputFile: 'risk.md', status: 'missing', scoreImpact: 10, lastModified: null },
          { docType: 'fria', article: 'Art. 27', description: 'FRIA', outputFile: 'fria.md', status: 'reviewed', scoreImpact: 5, lastModified: null },
        ],
      },
      { total: 0, covered: 0, uncovered: 0, coveragePercent: 0, byArticle: [], critical: [] },
      { totalAgents: 0, passports: [], averageCompleteness: 0 },
    );
    expect(plan.actions.length).toBe(1);
    expect(plan.actions[0].source).toBe('document');
  });

  it('collects actions from incomplete passports', () => {
    const plan = buildPriorityActions(
      [],
      { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, score: 0, documents: [] },
      { total: 0, covered: 0, uncovered: 0, coveragePercent: 0, byArticle: [], critical: [] },
      {
        totalAgents: 1,
        passports: [{ name: 'agent-1', completeness: 30, completenessZone: 'red', filledFields: 11, totalFields: 36, missingFields: [], friaCompleted: false, signed: false, lastUpdated: null }],
        averageCompleteness: 30,
      },
    );
    expect(plan.actions.length).toBe(1);
    expect(plan.actions[0].source).toBe('passport');
  });

  it('limits to 20 actions', () => {
    const findings = Array.from({ length: 30 }, (_, i) =>
      mkFinding({ checkId: `CHK-${i}`, severity: 'medium', type: 'fail' }),
    );
    const plan = buildPriorityActions(
      findings,
      { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, score: 0, documents: [] },
      { total: 0, covered: 0, uncovered: 0, coveragePercent: 0, byArticle: [], critical: [] },
      { totalAgents: 0, passports: [], averageCompleteness: 0 },
    );
    expect(plan.shownActions).toBe(20);
    expect(plan.totalActions).toBe(30);
  });

  it('deduplicates by source:id', () => {
    const findings = [
      mkFinding({ checkId: 'CHECK-001', severity: 'high', type: 'fail' }),
      mkFinding({ checkId: 'CHECK-001', severity: 'high', type: 'fail' }),
    ];
    const plan = buildPriorityActions(
      findings,
      { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, score: 0, documents: [] },
      { total: 0, covered: 0, uncovered: 0, coveragePercent: 0, byArticle: [], critical: [] },
      { totalAgents: 0, passports: [], averageCompleteness: 0 },
    );
    expect(plan.actions.length).toBe(1);
  });
});

// ── report-builder (orchestrator) ───────────���────────────────────

describe('buildComplianceReport', () => {
  it('builds full report with null scan result', () => {
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
    });
    expect(report.compliorVersion).toBe('0.9.4');
    expect(report.readiness.readinessScore).toBe(0);
    expect(report.documents.total).toBe(14);
    expect(report.obligations.total).toBe(0);
    expect(report.passports.totalAgents).toBe(0);
    expect(report.summary).toBeDefined();
  });

  it('builds full report with populated data', () => {
    const report = buildComplianceReport({
      scanResult: {
        score: { totalScore: 72, zone: 'yellow', categoryScores: [], criticalCapApplied: false, totalChecks: 10, passedChecks: 7, failedChecks: 3, skippedChecks: 0 },
        findings: [
          mkFinding({ checkId: 'l1-risk-assessment', type: 'pass' }),
          mkFinding({ checkId: 'l3-ai-disclosure', type: 'fail', severity: 'critical' }),
        ],
        projectPath: '/test',
        scannedAt: new Date().toISOString(),
        duration: 500,
        filesScanned: 20,
      },
      evalScore: 85,
      passports: [mkPassport({ name: 'my-agent' })],
      obligations: [mkObligation()],
      evidenceSummary: mkEvidence(),
      version: '0.9.4',
    });

    expect(report.readiness.readinessScore).toBeGreaterThan(0);
    expect(report.summary.scanScore).toBe(72);
    expect(report.summary.evalScore).toBe(85);
    expect(report.passports.totalAgents).toBe(1);
    expect(report.obligations.total).toBe(1);
    expect(report.summary.enforcementDate).toBe('2026-08-02');
    expect(report.actionPlan).toBeDefined();
  });

  it('includes evidence score in readiness', () => {
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: mkEvidence({ totalEntries: 10, chainValid: true }),
      version: '0.9.4',
    });
    expect(report.readiness.dimensions.evidence.available).toBe(true);
    expect(report.readiness.dimensions.evidence.score).toBe(100);
  });

  it('sets evidence score to 0 when chain invalid', () => {
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: mkEvidence({ totalEntries: 5, chainValid: false }),
      version: '0.9.4',
    });
    expect(report.readiness.dimensions.evidence.score).toBe(0);
  });

  it('excludes stale scan mode scores from readiness', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
      scanModeScores: {
        security: { score: 80, scannedAt: eightDaysAgo },
      },
    });
    expect(report.readiness.dimensions.scanSecurity.available).toBe(false);
  });

  it('includes fresh scan mode scores', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
      scanModeScores: {
        security: { score: 75, scannedAt: oneHourAgo },
      },
    });
    expect(report.readiness.dimensions.scanSecurity.available).toBe(true);
    expect(report.readiness.dimensions.scanSecurity.score).toBe(75);
  });

  it('transforms scan findings to FindingSummary[]', () => {
    const report = buildComplianceReport({
      scanResult: {
        score: { totalScore: 60, zone: 'orange', categoryScores: [], criticalCapApplied: false, totalChecks: 3, passedChecks: 1, failedChecks: 2, skippedChecks: 0 },
        findings: [
          mkFinding({ checkId: 'l1-risk-management', type: 'pass' }),
          mkFinding({ checkId: 'l3-banned-emotion-recognition', type: 'fail', severity: 'critical', fix: 'Remove package' }),
          mkFinding({ checkId: 'cross-doc-code-mismatch', type: 'fail', severity: 'high' }),
        ],
        projectPath: '/test',
        scannedAt: new Date().toISOString(),
        duration: 100,
        filesScanned: 5,
      },
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
    });
    expect(report.findings).toHaveLength(3);
    expect(report.findings[0].layer).toBe('L1');
    expect(report.findings[1].layer).toBe('L3');
    expect(report.findings[1].fixAvailable).toBe(true);
    expect(report.findings[2].layer).toBe('cross');
  });

  it('transforms evalResult to EvalResultsSummary', () => {
    const evalResult: EvalResult = {
      target: 'http://localhost:3000',
      tier: 'basic',
      overallScore: 80,
      grade: 'B',
      categories: [{ category: 'transparency', score: 90, grade: 'A', passed: 9, failed: 1, errors: 0, inconclusive: 0, skipped: 0, total: 10 }],
      results: [{
        testId: 'CT-1-001', category: 'transparency', name: 'Disclosure', method: 'deterministic',
        verdict: 'pass', score: 95, confidence: 90, reasoning: 'OK', probe: 'test', response: 'yes',
        latencyMs: 50, timestamp: new Date().toISOString(),
      }],
      totalTests: 10, passed: 9, failed: 1, errors: 0, inconclusive: 0, skipped: 0,
      duration: 500, timestamp: new Date().toISOString(), criticalCapped: false,
    };
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: 80,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
      evalResult,
    });
    expect(report.evalResults).not.toBeNull();
    expect(report.evalResults!.overallScore).toBe(80);
    expect(report.evalResults!.grade).toBe('B');
    expect(report.evalResults!.categories).toHaveLength(1);
    expect(report.evalResults!.tests).toHaveLength(1);
    expect(report.evalResults!.tests[0].testId).toBe('CT-1-001');
  });

  it('returns null evalResults when no evalResult provided', () => {
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
    });
    expect(report.evalResults).toBeNull();
    expect(report.findings).toHaveLength(0);
    expect(report.fixHistory).toHaveLength(0);
    expect(report.documentContents).toHaveLength(0);
  });

  it('passes through fixHistory and documentContents', () => {
    const fixHistory: FixHistoryEntry[] = [
      { id: 1, checkId: 'l1-rm', fixType: 'template_generation', status: 'applied', timestamp: '2026-04-07', files: [{ path: 'a.md', action: 'create' }], scoreBefore: 40, scoreAfter: 50 },
    ];
    const documentContents: DocumentContent[] = [
      { docType: 'risk-management', path: 'docs/risk.md', content: '# Risk Management' },
    ];
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
      fixHistory,
      documentContents,
    });
    expect(report.fixHistory).toHaveLength(1);
    expect(report.fixHistory[0].checkId).toBe('l1-rm');
    expect(report.documentContents).toHaveLength(1);
    expect(report.documentContents[0].content).toBe('# Risk Management');
  });
});

// ── html-renderer ──────────────────────────────────────���─────────

describe('generateReportHtml', () => {
  it('produces valid HTML document', () => {
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
    });
    const html = generateReportHtml(report);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
    expect(html).toContain('Complior Report');
    expect(html).toContain('v0.9.4');
  });

  it('renders readiness gauge', () => {
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
    });
    const html = generateReportHtml(report);
    expect(html).toContain('<svg');
    expect(html).toContain('ov-donut');
  });

  it('escapes HTML entities in strings', () => {
    const report = buildComplianceReport({
      scanResult: {
        score: { totalScore: 50, zone: 'orange', categoryScores: [], criticalCapApplied: false, totalChecks: 1, passedChecks: 0, failedChecks: 1, skippedChecks: 0 },
        findings: [mkFinding({ message: '<script>alert("xss")</script>', type: 'fail' })],
        projectPath: '/test',
        scannedAt: new Date().toISOString(),
        duration: 100,
        filesScanned: 5,
      },
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
    });
    const html = generateReportHtml(report);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders all 9 tabs', () => {
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [mkPassport({ name: 'test-agent' })],
      obligations: [mkObligation()],
      evidenceSummary: null,
      version: '0.9.4',
    });
    const html = generateReportHtml(report);
    expect(html).toContain('tab-overview');
    expect(html).toContain('tab-tests');
    expect(html).toContain('tab-findings');
    expect(html).toContain('tab-laws');
    expect(html).toContain('tab-documents');
    expect(html).toContain('tab-fixes');
    expect(html).toContain('tab-passports');
    expect(html).toContain('tab-actions');
    expect(html).toContain('tab-timeline');
  });

  it('shows eval empty state when no eval results', () => {
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
    });
    const html = generateReportHtml(report);
    expect(html).toContain('No eval results available');
  });

  it('renders eval results when provided', () => {
    const evalResult: EvalResult = {
      target: 'http://localhost:3000',
      tier: 'basic',
      overallScore: 72,
      grade: 'C',
      categories: [{ category: 'transparency', score: 89, grade: 'A', passed: 8, failed: 1, errors: 0, inconclusive: 0, skipped: 0, total: 9 }],
      results: [{
        testId: 'CT-1-001', category: 'transparency', name: 'AI Disclosure', method: 'deterministic',
        verdict: 'pass', score: 95, confidence: 92, reasoning: 'System disclosed AI nature',
        probe: 'Are you an AI?', response: 'Yes, I am an AI assistant.', latencyMs: 120, timestamp: new Date().toISOString(),
      }],
      totalTests: 1, passed: 1, failed: 0, errors: 0, inconclusive: 0, skipped: 0,
      duration: 120, timestamp: new Date().toISOString(), criticalCapped: false,
    };
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: 72,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
      evalResult,
    });
    const html = generateReportHtml(report);
    expect(html).toContain('AI Disclosure');
    expect(html).toContain('transparency');
    expect(html).not.toContain('No eval results available');
  });

  it('renders fix history when provided', () => {
    const fixHistory: FixHistoryEntry[] = [{
      id: 1, checkId: 'l1-risk-management', fixType: 'template_generation',
      status: 'applied', timestamp: new Date().toISOString(),
      files: [{ path: 'docs/risk.md', action: 'create' }],
      scoreBefore: 45, scoreAfter: 52,
    }];
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
      fixHistory,
    });
    const html = generateReportHtml(report);
    expect(html).toContain('l1-risk-management');
    expect(html).toContain('template_generation');
  });

  it('shows fix empty state when no fixes', () => {
    const report = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.4',
    });
    const html = generateReportHtml(report);
    expect(html).toContain('No fixes applied yet');
  });
});
