import type { CheckResult, Finding, ScanResult, Severity } from '../../types/common.types.js';
import type { ScanContext } from '../../ports/scanner.port.js';
import type { ScoringData } from '../../data/schemas.js';
import { calculateScore } from './score-calculator.js';
import { L1_CHECKS } from './layers/layer1-files.js';
import { runLayer2, layer2ToCheckResults } from './layers/layer2-docs.js';
import { runLayer3, layer3ToCheckResults } from './layers/layer3-config.js';
import { runLayer4, layer4ToCheckResults } from './layers/layer4-patterns.js';
import {
  l1Confidence,
  l2Confidence,
  l3Confidence,
  l4Confidence,
  summarizeConfidence,
} from './confidence.js';
import type { CheckWithConfidence } from './confidence.js';

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

const createFallbackScore = (findings: readonly Finding[]) => {
  const passed = findings.filter((f) => f.type === 'pass').length;
  const failed = findings.filter((f) => f.type === 'fail').length;
  const skipped = findings.filter((f) => f.type === 'skip').length;
  const total = findings.length;
  const applicable = passed + failed;
  const score = applicable === 0 ? 100 : Math.round((passed / applicable) * 100);

  return {
    totalScore: score,
    zone: score >= 80 ? 'green' as const : score >= 50 ? 'yellow' as const : 'red' as const,
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

  return Object.freeze({ scan });
};

// Re-export types for backward compatibility
export type { CheckFunction, ScanContext, FileInfo } from '../../ports/scanner.port.js';
