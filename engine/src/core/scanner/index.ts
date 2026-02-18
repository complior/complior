import type { CheckResult, Finding, ScanResult, ScoreBreakdown, Severity } from '../../types/common.types.js';
import type { ScanContext, CheckFunction } from './scanner.types.js';
import type { ScoringData } from '../../data/schemas.js';
import { calculateScore } from './score-calculator.js';
import { checkAiDisclosure } from './checks/ai-disclosure.js';
import { checkContentMarking } from './checks/content-marking.js';
import { checkInteractionLogging } from './checks/interaction-logging.js';
import { checkAiLiteracy } from './checks/ai-literacy.js';
import { checkGpaiTransparency } from './checks/gpai-transparency.js';
import { checkComplianceMetadata } from './checks/compliance-metadata.js';
import { checkDocumentation } from './checks/documentation.js';

const ALL_CHECKS: readonly CheckFunction[] = [
  checkAiDisclosure,
  checkContentMarking,
  checkInteractionLogging,
  checkAiLiteracy,
  checkGpaiTransparency,
  checkComplianceMetadata,
  checkDocumentation,
];

const DEFAULT_SEVERITY: Severity = 'info';

const toFinding = (result: CheckResult): Finding => {
  if (result.type === 'pass') {
    return {
      checkId: result.checkId,
      type: 'pass',
      message: result.message,
      severity: DEFAULT_SEVERITY,
    };
  }

  if (result.type === 'fail') {
    return {
      checkId: result.checkId,
      type: 'fail',
      message: result.message,
      severity: result.severity,
      obligationId: result.obligationId,
      articleReference: result.articleReference,
      fix: result.fix,
    };
  }

  // skip
  return {
    checkId: result.checkId,
    type: 'skip',
    message: result.reason,
    severity: DEFAULT_SEVERITY,
  };
};

const createFallbackScore = (findings: readonly Finding[]): ScoreBreakdown => {
  const passed = findings.filter((f) => f.type === 'pass').length;
  const failed = findings.filter((f) => f.type === 'fail').length;
  const skipped = findings.filter((f) => f.type === 'skip').length;
  const total = findings.length;
  const applicable = passed + failed;
  const score = applicable === 0 ? 100 : Math.round((passed / applicable) * 100);

  return {
    totalScore: score,
    zone: score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red',
    categoryScores: [],
    criticalCapApplied: false,
    totalChecks: total,
    passedChecks: passed,
    failedChecks: failed,
    skippedChecks: skipped,
  };
};

export interface Scanner {
  readonly scan: (ctx: ScanContext) => ScanResult;
}

export const createScanner = (scoringData?: ScoringData): Scanner => {
  const scan = (ctx: ScanContext): ScanResult => {
    const startTime = Date.now();

    const allResults: CheckResult[] = [];
    for (const check of ALL_CHECKS) {
      const results = check(ctx);
      allResults.push(...results);
    }

    const findings: readonly Finding[] = allResults.map(toFinding);
    const duration = Date.now() - startTime;

    const score = scoringData !== undefined
      ? calculateScore(allResults, scoringData)
      : createFallbackScore(findings);

    return {
      score,
      findings,
      projectPath: ctx.projectPath,
      scannedAt: new Date().toISOString(),
      duration,
      filesScanned: ctx.files.length,
    };
  };

  return { scan };
};

export { collectFiles } from './file-collector.js';
export type { FileInfo, ScanContext, CheckFunction } from './scanner.types.js';
