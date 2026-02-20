import type { ScanResult, Finding, CategoryScore } from '../../types/common.types.js';
import { ENGINE_VERSION } from '../../version.js';

export interface AuditReportData {
  readonly title: string;
  readonly organization: string;
  readonly date: string;
  readonly score: number;
  readonly zone: string;
  readonly jurisdiction: string;
  readonly version: string;
  readonly executiveSummary: {
    readonly overallStatus: string;
    readonly criticalIssues: number;
    readonly highIssues: number;
    readonly mediumIssues: number;
    readonly lowIssues: number;
    readonly recommendedActions: number;
    readonly topRecommendations: readonly string[];
  };
  readonly categoryBreakdown: readonly CategoryScore[];
  readonly findings: readonly Finding[];
  readonly remediationPlan: readonly {
    readonly priority: number;
    readonly obligationId: string;
    readonly article: string;
    readonly description: string;
    readonly effort: string;
    readonly impact: string;
  }[];
  readonly totalChecks: number;
  readonly passedChecks: number;
  readonly failedChecks: number;
}

const EFFORT_MAP: Record<string, string> = {
  critical: '4-8 hours',
  high: '2-4 hours',
  medium: '1-2 hours',
  low: '< 1 hour',
};

const IMPACT_MAP: Record<string, string> = {
  critical: '+10-15 points',
  high: '+5-10 points',
  medium: '+2-5 points',
  low: '+1-2 points',
};

export const buildAuditReportData = (
  scanResult: ScanResult,
  options: {
    readonly organization?: string;
    readonly jurisdiction?: string;
    readonly version?: string;
  },
): AuditReportData => {
  const failures = scanResult.findings.filter((f) => f.type === 'fail');
  const critical = failures.filter((f) => f.severity === 'critical');
  const high = failures.filter((f) => f.severity === 'high');
  const medium = failures.filter((f) => f.severity === 'medium');
  const low = failures.filter((f) => f.severity === 'low');

  const zoneLabel = scanResult.score.zone === 'green'
    ? 'Good Compliance'
    : scanResult.score.zone === 'yellow'
      ? 'Partial Compliance'
      : 'Critical Non-Compliance';

  const topRecommendations = failures
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    })
    .slice(0, 3)
    .map((f) => f.fix ?? f.message);

  const remediationPlan = failures
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    })
    .map((f, i) => ({
      priority: i + 1,
      obligationId: f.obligationId ?? f.checkId,
      article: f.articleReference ?? '',
      description: f.fix ?? f.message,
      effort: EFFORT_MAP[f.severity] ?? '1-2 hours',
      impact: IMPACT_MAP[f.severity] ?? '+1-2 points',
    }));

  return {
    title: 'Complior Audit Report',
    organization: options.organization ?? 'Organization',
    date: new Date().toISOString().split('T')[0],
    score: scanResult.score.totalScore,
    zone: zoneLabel,
    jurisdiction: options.jurisdiction ?? 'EU AI Act',
    version: options.version ?? ENGINE_VERSION,
    executiveSummary: {
      overallStatus: zoneLabel,
      criticalIssues: critical.length,
      highIssues: high.length,
      mediumIssues: medium.length,
      lowIssues: low.length,
      recommendedActions: failures.length,
      topRecommendations,
    },
    categoryBreakdown: scanResult.score.categoryScores,
    findings: scanResult.findings,
    remediationPlan,
    totalChecks: scanResult.score.totalChecks,
    passedChecks: scanResult.score.passedChecks,
    failedChecks: scanResult.score.failedChecks,
  };
};
