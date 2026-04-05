import type { ScanResult } from '../../types/common.types.js';
import type { ComplianceReport, ReportSummary } from './types.js';
import type { EvidenceChainSummary } from '../scanner/evidence-store.js';
import type { PassportData } from './passport-status.js';
import type { ObligationRecord } from './obligation-coverage.js';
import { calculateReadinessScore, daysUntilEnforcement } from './readiness-score.js';
import { buildDocumentInventory } from './document-inventory.js';
import { buildObligationCoverage } from './obligation-coverage.js';
import { buildPassportStatus } from './passport-status.js';
import { buildPriorityActions } from './priority-actions.js';

export interface ReportBuildInput {
  readonly scanResult: ScanResult | null;
  readonly evalScore: number | null;
  readonly passports: readonly PassportData[];
  readonly obligations: readonly ObligationRecord[];
  readonly evidenceSummary: EvidenceChainSummary | null;
  readonly version: string;
}

const evidenceToScore = (summary: EvidenceChainSummary | null): number | null => {
  if (!summary) return null;
  if (!summary.chainValid) return 0;
  // Scale: 0 entries = 0, 10+ entries = 100
  return Math.min(100, Math.round((summary.totalEntries / 10) * 100));
};

export const buildComplianceReport = (input: ReportBuildInput): ComplianceReport => {
  const { scanResult, evalScore, passports, obligations, evidenceSummary, version } = input;

  const findings = scanResult?.findings ?? [];

  // Build sections
  const documents = buildDocumentInventory(findings);
  const oblCoverage = buildObligationCoverage(obligations, findings);
  const passportStatus = buildPassportStatus(passports);
  const actionPlan = buildPriorityActions(findings, documents, oblCoverage, passportStatus);

  // Calculate readiness
  const readiness = calculateReadinessScore({
    scanScore: scanResult?.score.totalScore ?? null,
    documentScore: documents.score,
    passportScore: passportStatus.averageCompleteness > 0 ? passportStatus.averageCompleteness : null,
    evalScore,
    evidenceScore: evidenceToScore(evidenceSummary),
  });

  // Count auto-fixable findings
  const failFindings = findings.filter((f) => f.type === 'fail');
  const autoFixable = failFindings.filter((f) => f.fix || f.fixDiff).length;

  const now = new Date();
  const summary: ReportSummary = {
    readinessScore: readiness.readinessScore,
    zone: readiness.zone,
    scanScore: scanResult?.score.totalScore ?? null,
    evalScore,
    documentsTotal: documents.total,
    documentsReviewed: documents.byStatus.reviewed,
    obligationsTotal: oblCoverage.total,
    obligationsCovered: oblCoverage.covered,
    passportsTotal: passportStatus.totalAgents,
    passportsComplete: passportStatus.passports.filter((p) => p.completeness >= 80).length,
    evidenceChainLength: evidenceSummary?.totalEntries ?? 0,
    evidenceVerified: evidenceSummary?.chainValid ?? false,
    totalFindings: failFindings.length,
    criticalFindings: failFindings.filter((f) => f.severity === 'critical').length,
    autoFixable,
    daysUntilEnforcement: daysUntilEnforcement(now),
    enforcementDate: '2026-08-02',
    generatedAt: now.toISOString(),
    compliorVersion: version,
  };

  return {
    generatedAt: now.toISOString(),
    compliorVersion: version,
    readiness,
    documents,
    obligations: oblCoverage,
    passports: passportStatus,
    actionPlan,
    summary,
  };
};
