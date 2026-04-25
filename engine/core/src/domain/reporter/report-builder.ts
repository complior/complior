import type { ScanResult, Role, ScanMode } from '../../types/common.types.js';
import type { ComplianceReport, ReportSummary, FindingSummary, EvalResultsSummary, EvalCategorySummary, EvalTestSummary, FixHistoryEntry, DocumentContent, CompanyProfile } from './types.js';
import type { EvidenceChainSummary } from '../scanner/evidence-store.js';
import type { EvalResult } from '../eval/types.js';
import type { PassportData } from './passport-status.js';
import type { ObligationRecord } from './obligation-coverage.js';
import { EU_AI_ACT_DEADLINE_ISO } from '../shared/compliance-constants.js';
import { calculateReadinessScore, daysUntilEnforcement } from './readiness-score.js';
import { buildDocumentInventory } from './document-inventory.js';
import { buildObligationCoverage } from './obligation-coverage.js';
import { buildPassportStatus } from './passport-status.js';
import { buildPriorityActions } from './priority-actions.js';
import reporterConfig from '../../../data/reporter-config.json' with { type: 'json' };

const STALENESS_MS = (reporterConfig.scanModeScores.stalenessThresholdHours ?? 168) * 3_600_000;

const isFresh = (entry: { scannedAt?: string } | undefined, now: Date): boolean => {
  if (!entry?.scannedAt) return true; // no timestamp → backward compat
  return now.getTime() - new Date(entry.scannedAt).getTime() < STALENESS_MS;
};

export interface ReportBuildInput {
  readonly scanResult: ScanResult | null;
  readonly evalScore: number | null;
  readonly passports: readonly PassportData[];
  readonly obligations: readonly ObligationRecord[];
  readonly evidenceSummary: EvidenceChainSummary | null;
  readonly version: string;
  readonly projectRole?: Role;
  readonly scanModeScores?: Partial<Record<ScanMode, { score: number; scannedAt?: string }>>;
  readonly evalResult?: EvalResult | null;
  readonly fixHistory?: readonly FixHistoryEntry[];
  readonly documentContents?: readonly DocumentContent[];
  readonly profile?: CompanyProfile;
}

/** Infer scanner layer from checkId prefix. */
const inferLayer = (checkId: string): string => {
  if (checkId.startsWith('l1-')) return 'L1';
  if (checkId.startsWith('l2-')) return 'L2';
  if (checkId.startsWith('l3-')) return 'L3';
  if (checkId.startsWith('l4-')) return 'L4';
  if (checkId.startsWith('l5-')) return 'L5';
  if (checkId.startsWith('cross-')) return 'cross';
  return 'L1';
};

/** Transform engine Finding[] → FindingSummary[] for the report. */
const toFindingSummaries = (findings: readonly import('../../types/common.types.js').Finding[]): FindingSummary[] =>
  findings.map((f) => ({
    checkId: f.checkId,
    type: f.type,
    message: f.message,
    severity: f.severity,
    file: f.file,
    line: f.line,
    articleReference: f.articleReference,
    fix: f.fix,
    fixAvailable: !!(f.fix || f.fixDiff),
    layer: inferLayer(f.checkId),
    confidence: f.confidence,
  }));

/** Transform EvalResult → EvalResultsSummary for the report. */
const toEvalResultsSummary = (result: EvalResult): EvalResultsSummary => {
  const categories: EvalCategorySummary[] = result.categories.map((c) => ({
    category: c.category,
    score: c.score,
    grade: c.grade,
    passed: c.passed,
    failed: c.failed,
    total: c.total,
  }));

  const tests: EvalTestSummary[] = result.results.map((t) => ({
    testId: t.testId,
    category: t.category,
    name: t.name,
    method: t.method,
    verdict: t.verdict,
    score: t.score,
    confidence: t.confidence,
    reasoning: t.reasoning,
    probe: t.probe,
    response: t.response,
    latencyMs: t.latencyMs,
    owaspCategory: t.owaspCategory,
    severity: t.severity,
  }));

  return {
    overallScore: result.overallScore,
    grade: result.grade,
    totalTests: result.totalTests,
    passed: result.passed,
    failed: result.failed,
    errors: result.errors,
    inconclusive: result.inconclusive,
    skipped: result.skipped,
    duration: result.duration,
    categories,
    tests,
    securityScore: result.securityScore,
    securityGrade: result.securityGrade,
  };
};

const evidenceToScore = (summary: EvidenceChainSummary | null): number | null => {
  if (!summary) return null;
  if (!summary.chainValid) return 0;
  // Scale: 0 entries = 0, 10+ entries = 100
  return Math.min(100, Math.round((summary.totalEntries / 10) * 100));
};

export const buildComplianceReport = (input: ReportBuildInput): ComplianceReport => {
  const { scanResult, evalScore, passports, obligations, evidenceSummary, version, projectRole, scanModeScores } = input;

  const findings = scanResult?.findings ?? [];

  // Build sections
  const documents = buildDocumentInventory(findings);
  const oblCoverage = buildObligationCoverage(obligations, findings, projectRole ?? 'both');
  const passportStatus = buildPassportStatus(passports);
  const actionPlan = buildPriorityActions(findings, documents, oblCoverage, passportStatus, evalScore, reporterConfig.priorityActions.maxActionsHttp);

  // Detect Art. 5 prohibited practice findings
  const hasArt5 = findings.some(
    (f) => f.type === 'fail' && f.checkId === 'l3-banned-emotion-recognition',
  );

  // Calculate readiness — prefer live scan result, fall back to persisted basic score
  // Stale persisted scores (>7d) are excluded to prevent outdated data from inflating readiness
  const now = new Date();
  const scanModes = scanModeScores ?? {};
  const readiness = calculateReadinessScore({
    scanScore: scanResult?.score.totalScore
      ?? (isFresh(scanModes.basic, now) ? scanModes.basic?.score ?? null : null),
    scanSecurityScore: isFresh(scanModes.security, now) ? scanModes.security?.score ?? null : null,
    scanLlmScore: isFresh(scanModes.llm, now) ? scanModes.llm?.score ?? null : null,
    documentScore: documents.score,
    passportScore: passportStatus.averageCompleteness > 0 ? passportStatus.averageCompleteness : null,
    evalScore,
    evidenceScore: evidenceToScore(evidenceSummary),
    hasArt5Violation: hasArt5,
  }, now);

  // Count auto-fixable findings
  const failFindings = findings.filter((f) => f.type === 'fail');
  const autoFixable = failFindings.filter((f) => f.fix || f.fixDiff).length;

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
    enforcementDate: EU_AI_ACT_DEADLINE_ISO,
    generatedAt: now.toISOString(),
    compliorVersion: version,
  };

  // Build new report sections
  const findingSummaries = toFindingSummaries(findings);
  const evalResultsSummary = input.evalResult ? toEvalResultsSummary(input.evalResult) : null;

  return {
    generatedAt: now.toISOString(),
    compliorVersion: version,
    profile: input.profile,
    readiness,
    documents,
    obligations: oblCoverage,
    passports: passportStatus,
    actionPlan,
    summary,
    findings: findingSummaries,
    evalResults: evalResultsSummary,
    fixHistory: input.fixHistory ?? [],
    documentContents: input.documentContents ?? [],
  };
};
