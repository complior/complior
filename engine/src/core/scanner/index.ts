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
import { runLayer2, layer2ToCheckResults } from './layer2-docs.js';
import { runLayer3, layer3ToCheckResults } from './layer3-config.js';
import { runLayer4, layer4ToCheckResults } from './layer4-patterns.js';
import {
  l1Confidence,
  l2Confidence,
  l3Confidence,
  l4Confidence,
  summarizeConfidence,
} from './confidence.js';
import type { CheckWithConfidence } from './confidence.js';

// L1 checks: file presence (existing Sprint 1 checks)
const L1_CHECKS: readonly CheckFunction[] = [
  checkAiDisclosure,
  checkContentMarking,
  checkInteractionLogging,
  checkAiLiteracy,
  checkGpaiTransparency,
  checkComplianceMetadata,
  checkDocumentation,
];

const DEFAULT_SEVERITY: Severity = 'info';

const toFinding = (result: CheckResult, confidence?: CheckWithConfidence): Finding => {
  const base = {
    confidence: confidence?.confidence,
    confidenceLevel: confidence?.level,
  };

  if (result.type === 'pass') {
    return {
      checkId: result.checkId,
      type: 'pass',
      message: result.message,
      severity: DEFAULT_SEVERITY,
      ...base,
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
      ...base,
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
    const allConfidence: CheckWithConfidence[] = [];

    // L1: File presence checks
    for (const check of L1_CHECKS) {
      const results = check(ctx);
      for (const result of results) {
        allResults.push(result);
        if (result.type !== 'skip') {
          allConfidence.push({
            ...l1Confidence(result.type === 'pass'),
            obligationId: result.type === 'fail' ? result.obligationId : undefined,
          });
        }
      }
    }

    // L2: Document structure validation
    const l2Results = runLayer2(ctx);
    const l2Checks = layer2ToCheckResults(l2Results);
    allResults.push(...l2Checks);
    for (const l2r of l2Results) {
      allConfidence.push({
        ...l2Confidence(l2r.status),
        obligationId: l2r.obligationId,
      });
    }

    // L3: Config & dependency scanning
    const l3Results = runLayer3(ctx);
    const l3Checks = layer3ToCheckResults(l3Results);
    allResults.push(...l3Checks);
    for (const l3r of l3Results) {
      allConfidence.push({
        ...l3Confidence(l3r.status),
        obligationId: l3r.obligationId,
      });
    }

    // L4: Pattern matching
    const l4Results = runLayer4(ctx, l3Results);
    const l4Checks = layer4ToCheckResults(l4Results);
    allResults.push(...l4Checks);
    for (const l4r of l4Results) {
      allConfidence.push({
        ...l4Confidence(l4r.patternType, l4r.status),
        obligationId: l4r.obligationId,
      });
    }

    // Build findings with confidence attached
    const findings: Finding[] = [];
    let confidenceIdx = 0;
    for (let i = 0; i < allResults.length; i++) {
      const result = allResults[i];
      if (result.type === 'skip') {
        findings.push(toFinding(result));
      } else {
        const conf = confidenceIdx < allConfidence.length ? allConfidence[confidenceIdx] : undefined;
        findings.push(toFinding(result, conf));
        confidenceIdx++;
      }
    }

    const duration = Date.now() - startTime;

    const score = scoringData !== undefined
      ? calculateScore(allResults, scoringData)
      : createFallbackScore(findings);

    // Attach confidence summary to score
    const confidenceSummary = summarizeConfidence(allConfidence);

    return {
      score: { ...score, confidenceSummary },
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
