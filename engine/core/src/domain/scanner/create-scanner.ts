import type { CheckResult, Finding, ScanResult, Severity } from '../../types/common.types.js';
import type { ScanContext } from '../../ports/scanner.port.js';
import type { ScoringData } from '../../data/schemas.js';
import { calculateScore } from './score-calculator.js';
import { L1_CHECKS } from './layers/layer1-files.js';
import { runLayer2, layer2ToCheckResults } from './layers/layer2-docs.js';
import { runLayer3, layer3ToCheckResults } from './layers/layer3-config.js';
import { runLayer4, layer4ToCheckResults } from './layers/layer4-patterns.js';
import type { Layer5Analyzer } from './layers/layer5-llm.js';
import { runCrossLayerChecks, crossLayerToCheckResults } from './cross-layer.js';
import { createEvidence, createEvidenceCollector } from './evidence.js';
import { createRegulationVersion } from './regulation-version.js';
import {
  l1Confidence,
  l2Confidence,
  l3Confidence,
  l4Confidence,
  summarizeConfidence,
} from './confidence.js';
import type { CheckWithConfidence } from './confidence.js';
import { buildFixDiff, buildCodeContext } from './fix-diff-builder.js';
import { explainFindings } from './finding-explainer.js';

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
      file: result.file,
      line: result.line,
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

/** Enrich findings with codeContext and fixDiff using file contents from scan. */
const enrichFindings = (
  findings: readonly Finding[],
  fileMap: ReadonlyMap<string, string>,
): readonly Finding[] => {
  let enriched = 0;
  return findings.map((f) => {
    if (enriched >= 20) return f; // Limit enrichment to top-20
    if (f.file === undefined || f.type !== 'fail') return f;

    const content = fileMap.get(f.file);
    if (content === undefined) return f;

    enriched++;
    const codeContext = f.line !== undefined ? buildCodeContext(content, f.line) : undefined;
    const fixDiff = f.line !== undefined
      ? buildFixDiff(content, f.line, f.file, f.checkId)
      : undefined;

    if (codeContext === undefined && fixDiff === undefined) return f;
    return { ...f, codeContext, fixDiff };
  });
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
  readonly scanDeep?: (ctx: ScanContext, fileContents: ReadonlyMap<string, string>) => Promise<ScanResult>;
}

export const createScanner = (scoringData?: ScoringData, layer5?: Layer5Analyzer): Scanner => {
  const scan = (ctx: ScanContext): ScanResult => {
    const startTime = Date.now();

    const allResults: CheckResult[] = [];
    const allConfidence: CheckWithConfidence[] = [];
    const evidenceCollector = createEvidenceCollector();

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
          evidenceCollector.add(createEvidence(result.checkId, 'L1', 'file-presence', {
            snippet: result.type === 'pass' ? `File check passed: ${result.message}` : undefined,
          }));
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
      evidenceCollector.add(createEvidence(`l2-${l2r.document}`, 'L2', 'heading-match', {
        snippet: `Status: ${l2r.status}, matched ${l2r.matchedRequired}/${l2r.totalRequired} sections`,
      }));
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
      evidenceCollector.add(createEvidence(`l3-${l3r.type}`, 'L3', 'dependency', {
        snippet: l3r.message,
        file: l3r.file,
      }));
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
      evidenceCollector.add(createEvidence(`l4-${l4r.category}`, 'L4', 'pattern-match', {
        snippet: `${l4r.patternType} pattern "${l4r.matchedPattern}" ${l4r.status}`,
        file: l4r.file,
        line: l4r.line,
      }));
    }

    // Cross-layer verification
    const l1Checks = allResults.slice(0, allResults.length - l2Checks.length - l3Checks.length - l4Checks.length);
    const crossLayerFindings = runCrossLayerChecks(l1Checks, l2Results, l3Results, l4Results);
    const crossLayerCheckResults = crossLayerToCheckResults(crossLayerFindings);
    allResults.push(...crossLayerCheckResults);
    for (const clf of crossLayerFindings) {
      evidenceCollector.add(createEvidence(clf.ruleId, 'cross-layer', 'cross-layer', {
        snippet: clf.description,
      }));
    }

    // Build findings with confidence and evidence attached
    const findings: Finding[] = [];
    let confidenceIdx = 0;
    for (let i = 0; i < allResults.length; i++) {
      const result = allResults[i];
      if (result.type === 'skip') {
        findings.push(toFinding(result));
      } else {
        const conf = confidenceIdx < allConfidence.length ? allConfidence[confidenceIdx] : undefined;
        const evidence = evidenceCollector.getByFinding(result.checkId);
        const finding = toFinding(result, conf);
        findings.push(evidence.length > 0 ? { ...finding, evidence } : finding);
        confidenceIdx++;
      }
    }

    // Enrich findings with code context from files already in memory
    const fileMap = new Map<string, string>();
    for (const f of ctx.files) {
      fileMap.set(f.relativePath, f.content);
    }
    const enrichedFindings = enrichFindings(findings, fileMap);

    // US-S05-07: Attach explanations (article, penalty, deadline, business_impact)
    const explainedFindings = explainFindings(enrichedFindings);

    const duration = Date.now() - startTime;

    const score = scoringData !== undefined
      ? calculateScore(allResults, scoringData)
      : createFallbackScore(explainedFindings);

    // Attach confidence summary to score
    const confidenceSummary = summarizeConfidence(allConfidence);

    return {
      score: { ...score, confidenceSummary },
      findings: explainedFindings,
      projectPath: ctx.projectPath,
      scannedAt: new Date().toISOString(),
      duration,
      filesScanned: ctx.files.length,
      regulationVersion: createRegulationVersion(allResults.length),
    };
  };

  const scanDeep = layer5 !== undefined
    ? async (ctx: ScanContext, fileContents: ReadonlyMap<string, string>): Promise<ScanResult> => {
      // Run L1-L4 synchronously first
      const baseResult = scan(ctx);

      // Pass uncertain findings to L5 for deeper analysis
      const l5Results = await layer5.analyzeFindings(baseResult.findings, fileContents);

      if (l5Results.length === 0) return baseResult;

      // Merge L5 results back into findings
      const enhancedFindings = layer5.applyResults(baseResult.findings, l5Results);

      // Recalculate score with enhanced findings
      const enhancedCheckResults: CheckResult[] = enhancedFindings.map((f): CheckResult => {
        if (f.type === 'pass') return { type: 'pass', checkId: f.checkId, message: f.message };
        if (f.type === 'fail') return {
          type: 'fail', checkId: f.checkId, message: f.message,
          severity: f.severity, obligationId: f.obligationId, articleReference: f.articleReference, fix: f.fix,
        };
        return { type: 'skip', checkId: f.checkId, reason: f.message };
      });

      const score = scoringData !== undefined
        ? calculateScore(enhancedCheckResults, scoringData)
        : createFallbackScore(enhancedFindings);

      return {
        ...baseResult,
        score: { ...score, confidenceSummary: baseResult.score.confidenceSummary },
        findings: enhancedFindings,
        deepAnalysis: true,
        l5Cost: layer5.getTotalCost(l5Results),
      } as ScanResult;
    }
    : undefined;

  return Object.freeze({ scan, scanDeep });
};

// Re-export types for backward compatibility
export type { CheckFunction, ScanContext, FileInfo } from '../../ports/scanner.port.js';
