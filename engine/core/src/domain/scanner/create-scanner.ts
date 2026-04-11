import type { CheckResult, Finding, ScanResult, Severity, ExternalToolResult } from '../../types/common.types.js';
import type { ScanContext } from '../../ports/scanner.port.js';
import type { ScoringData } from '../../data/schemas/schemas.js';
import { calculateScore } from './score-calculator.js';
import { L1_CHECKS } from './layers/layer1-files.js';
import { runLayer2, layer2ToCheckResults } from './layers/layer2-docs.js';
import { runLayer3, layer3ToCheckResults } from './layers/layer3-config.js';
import { runLayer4, layer4ToCheckResults } from './layers/layer4-patterns.js';
import type { Layer5Analyzer } from './layers/layer5-llm.js';
import { runNhiScan, nhiToCheckResults } from './checks/nhi-scanner.js';
import { runDepDeepScan, depScanToCheckResults } from './checks/dep-deep-scan.js';
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
import { applyAttestations } from './attestations.js';
// S08/S09: New scanner modules
import { buildImportGraph } from './import-graph.js';
import { analyzeStructure } from './ast/swc-analyzer.js';
import { detectProjectLanguages } from './languages/adapter.js';
import { selectUncertainFindings, buildTargetedPrompts, estimateTargetedCost } from './layers/layer5-targeted.js';
import type { GitHistoryPort } from './checks/git-history.js';
import { analyzeGitHistory, gitHistoryToCheckResults } from './checks/git-history.js';
import { detectDocType, getChecklist, buildDocValidationPrompt, parseDocValidationResponse, docValidationToFindings } from './layers/layer5-docs.js';
import type { ExternalRunners } from './external/runner-port.js';
import { mapExternalFindings } from './external/finding-mapper.js';
import { deduplicateFindings, mergeFindings } from './external/dedup.js';
import type { ProcessRunner } from '../../ports/process.port.js';

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

  if (result.type === 'info') {
    return {
      checkId: result.checkId,
      type: 'info',
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
  return findings.map((f) => {
    if (f.file === undefined || f.type !== 'fail') return f;

    const content = fileMap.get(f.file);
    if (content === undefined) return f;

    const codeContext = f.line !== undefined ? buildCodeContext(content, f.line) : undefined;
    const fixDiff = buildFixDiff(content, f.line ?? 0, f.file, f.checkId);

    if (codeContext === undefined && fixDiff === undefined) return f;
    return { ...f, codeContext, fixDiff };
  });
};

/** Convert Finding[] → CheckResult[] for score recalculation. */
const findingsToCheckResults = (findings: readonly Finding[]): readonly CheckResult[] =>
  findings.map((f): CheckResult => {
    if (f.type === 'pass') return { type: 'pass', checkId: f.checkId, message: f.message };
    if (f.type === 'fail') return {
      type: 'fail', checkId: f.checkId, message: f.message,
      severity: f.severity, obligationId: f.obligationId, articleReference: f.articleReference, fix: f.fix,
    };
    if (f.type === 'info') return {
      type: 'info', checkId: f.checkId, message: f.message,
      severity: f.severity, obligationId: f.obligationId, articleReference: f.articleReference, fix: f.fix,
    };
    return { type: 'skip', checkId: f.checkId, reason: f.message };
  });

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
  readonly scanTier2?: (ctx: ScanContext) => Promise<ScanResult>;
}

export const createScanner = (
  scoringData?: ScoringData,
  layer5?: Layer5Analyzer,
  gitHistory?: GitHistoryPort,
  externalRunners?: ExternalRunners,
  runProcess?: ProcessRunner,
): Scanner => {
  // Cache import graph from last scan() for reuse in scanDeep()
  let lastImportGraph: ReturnType<typeof buildImportGraph> | null = null;

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

    // L3-ext: Dependency deep scan (lock file analysis)
    const depScanResult = runDepDeepScan(ctx);
    const depChecks = depScanToCheckResults(depScanResult);
    allResults.push(...depChecks);
    if (depScanResult.totalDeps > 0) {
      evidenceCollector.add(createEvidence('l3-dep-scan', 'L3', 'dependency', {
        snippet: `Analyzed ${depScanResult.totalDeps} deps: ${depScanResult.vulnerabilities.length} vulns, ${depScanResult.licenseIssues.length} license issues`,
      }));
    }

    // E-109: Build import graph for AI-relevance filtering
    const importGraph = buildImportGraph(ctx.files);
    lastImportGraph = importGraph;

    // E-111: Detect additional languages (Go, Rust, Java) and add their deps
    const extraLangs = detectProjectLanguages(ctx.files);
    for (const adapter of extraLangs) {
      for (const file of ctx.files) {
        const filename = file.relativePath.split('/').pop() ?? '';
        if (adapter.depFiles.includes(filename)) {
          const deps = adapter.detectDeps(file.content);
          for (const dep of deps) {
            if (dep.isAiSdk) {
              allResults.push({
                type: 'pass',
                checkId: 'l3-ai-sdk-detected',
                message: `AI SDK detected: ${dep.name} (${dep.version}) in ${adapter.name}`,
              });
            }
            if (dep.isBanned) {
              allResults.push({
                type: 'fail',
                checkId: 'l3-banned-dep',
                message: `Banned dependency: ${dep.name} — ${dep.bannedReason ?? 'prohibited'}`,
                severity: 'high',
                obligationId: 'OBL-001',
                articleReference: 'Art. 5',
                fix: `Remove ${dep.name} or document exemption`,
                file: file.relativePath,
              });
            }
          }
        }
      }
    }

    // L4: Pattern matching (with comment-filtered content)
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

    // E-110: Structural analysis (bare calls, wrappers, safety mutations)
    for (const file of ctx.files) {
      if (importGraph.aiRelevantFiles.has(file.relativePath) || importGraph.directAiFiles.has(file.relativePath)) {
        const structFindings = analyzeStructure(file.content, file.relativePath, file.extension);
        for (const sf of structFindings) {
          if (sf.type === 'safety-mutation' || sf.type === 'missing-error-handling') {
            allResults.push({
              type: 'fail',
              checkId: `l4-ast-${sf.type}`,
              message: sf.description,
              severity: sf.type === 'safety-mutation' ? 'high' : 'medium',
              obligationId: sf.type === 'safety-mutation' ? 'OBL-006' : 'OBL-015',
              articleReference: sf.type === 'safety-mutation' ? 'Art. 15' : 'Art. 14',
              fix: sf.type === 'safety-mutation'
                ? 'Remove safety config mutation or document exemption'
                : 'Add try-catch error handling around LLM calls',
              file: sf.file,
              line: sf.line,
            });
            allConfidence.push({
              ...l4Confidence('negative', 'FOUND'),
              obligationId: sf.type === 'safety-mutation' ? 'OBL-006' : 'OBL-015',
            });
          } else if (sf.type === 'wrapped-call' || sf.type === 'decorator-pattern') {
            allResults.push({
              type: 'pass',
              checkId: `l4-ast-${sf.type}`,
              message: `${sf.description} in ${sf.file}:${sf.line}`,
            });
          }
        }
      }
    }

    // NHI: Non-human identity / secret scanning
    const nhiResults = runNhiScan(ctx);
    const nhiChecks = nhiToCheckResults(nhiResults);
    allResults.push(...nhiChecks);
    for (const nhi of nhiResults) {
      evidenceCollector.add(createEvidence(`l4-nhi-${nhi.category}`, 'L4', 'nhi-scan', {
        snippet: `${nhi.description}: ${nhi.match}`,
        file: nhi.file,
        line: nhi.line,
      }));
    }

    // E-112: Git history analysis (document freshness, bulk commits, author diversity)
    if (gitHistory !== undefined) {
      const historyResult = analyzeGitHistory(ctx.projectPath, gitHistory);
      const historyChecks = gitHistoryToCheckResults(historyResult);
      allResults.push(...historyChecks);
      for (const check of historyChecks) {
        if (check.type !== 'skip') {
          evidenceCollector.add(createEvidence(check.checkId, 'git-history', 'git-analysis' as import('./evidence.js').EvidenceSource, {
            snippet: check.type === 'pass' ? check.message : `${check.message}`,
            file: check.type === 'fail' ? check.file : undefined,
          }));
        }
      }
    }

    // Cross-layer verification
    const l1Checks = allResults.slice(0, allResults.length - l2Checks.length - l3Checks.length - l4Checks.length - nhiChecks.length);
    const crossLayerFindings = runCrossLayerChecks(l1Checks, l2Results, l3Results, l4Results, ctx);
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

    // Attach docQuality from L2 results to corresponding findings
    const l2QualityMap = new Map(l2Results.map((r) => [`l2-${r.document}`, r.docQuality]));
    const findingsWithQuality = findings.map((f) => {
      const quality = l2QualityMap.get(f.checkId);
      return quality !== undefined ? { ...f, docQuality: quality } : f;
    });

    // Enrich findings with code context from files already in memory
    const fileMap = new Map<string, string>();
    for (const f of ctx.files) {
      fileMap.set(f.relativePath, f.content);
    }
    const enrichedFindings = enrichFindings(findingsWithQuality, fileMap);

    // Apply manual attestations from .complior/attestations.json
    const attestedFindings = applyAttestations(enrichedFindings, ctx);

    // US-S05-07: Attach explanations (article, penalty, deadline, business_impact)
    const explainedFindings = explainFindings(attestedFindings);

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

      // E-113: Targeted L5 — only uncertain findings (confidence 50-80%)
      const uncertainFindings = selectUncertainFindings(baseResult.findings);
      let totalL5Cost = 0;

      if (uncertainFindings.length > 0) {
        // Reuse import graph from base scan() instead of rebuilding
        const importGraph = lastImportGraph ?? buildImportGraph(ctx.files);
        const prompts = buildTargetedPrompts(uncertainFindings, fileContents, importGraph);
        totalL5Cost += estimateTargetedCost(prompts);
      }

      // Pass uncertain findings to L5 for deeper analysis
      const l5Results = await layer5.analyzeFindings(baseResult.findings, fileContents);

      // E-114a: L5 Document content validation — check .md docs against regulation checklists
      const docValidationResults = await Promise.all(
        ctx.files
          .filter((f) => f.extension === '.md')
          .map(async (file) => {
            const docType = detectDocType(file.relativePath);
            if (!docType) return null;
            const checklist = getChecklist(docType);
            if (!checklist) return null;

            try {
              const prompt = buildDocValidationPrompt(file.content, checklist);
              const { text, cost } = await layer5.callRaw(prompt);
              totalL5Cost += cost;
              return parseDocValidationResponse(text, docType, file.relativePath, checklist.elements.length);
            } catch {
              return null; // Skip doc validation on LLM/parse error — non-critical
            }
          }),
      );
      const docFindings = docValidationToFindings(
        docValidationResults.filter((r): r is NonNullable<typeof r> => r !== null),
      );

      if (l5Results.length === 0 && docFindings.length === 0) return baseResult;

      // Merge L5 results back into findings
      const l5Enhanced = layer5.applyResults(baseResult.findings, l5Results);
      const enhancedFindings = [...l5Enhanced, ...docFindings];

      // Recalculate score with enhanced findings
      const enhancedCheckResults = findingsToCheckResults(enhancedFindings);

      const score = scoringData !== undefined
        ? calculateScore(enhancedCheckResults, scoringData)
        : createFallbackScore(enhancedFindings);

      const deepResult: ScanResult = {
        score: { ...score, confidenceSummary: baseResult.score.confidenceSummary },
        findings: enhancedFindings,
        projectPath: baseResult.projectPath,
        scannedAt: baseResult.scannedAt,
        duration: baseResult.duration,
        filesScanned: baseResult.filesScanned,
        regulationVersion: baseResult.regulationVersion,
        deepAnalysis: true,
        l5Cost: totalL5Cost + layer5.getTotalCost(l5Results),
      };
      return deepResult;
    }
    : undefined;

  const scanTier2 = externalRunners !== undefined && runProcess !== undefined
    ? async (ctx: ScanContext): Promise<ScanResult> => {
      const tier2Start = Date.now();

      // 1. Run Tier 1 (L1-L4) synchronously
      const baseResult = scan(ctx);

      // 2. Run external tools in parallel
      const runnerDeps = {
        projectPath: ctx.projectPath,
        runProcess,
        files: ctx.files.map((f) => ({ relativePath: f.relativePath, extension: f.extension })),
      };

      const externalResults = await Promise.allSettled([
        externalRunners.semgrep.run(runnerDeps),
        externalRunners.bandit.run(runnerDeps),
        externalRunners.modelscan.run(runnerDeps),
        externalRunners.detectSecrets.run(runnerDeps),
      ]);

      // 3. Collect results and map to findings
      const toolResults: ExternalToolResult[] = [];
      let allExternalFindings: Finding[] = [];

      for (const settled of externalResults) {
        if (settled.status === 'rejected') continue;
        const result = settled.value;
        const mappedFindings = mapExternalFindings(result.rawFindings, result.tool);

        toolResults.push({
          tool: result.tool,
          version: result.version,
          findings: mappedFindings,
          duration: result.duration,
          exitCode: result.exitCode,
          error: result.error,
        });

        allExternalFindings.push(...mappedFindings);
      }

      // 4. Deduplicate external findings against base
      const dedupedExternal = deduplicateFindings(baseResult.findings, allExternalFindings);

      // 5. Merge
      const mergedFindings = mergeFindings(baseResult.findings, dedupedExternal);

      // 5b. Filter semgrep bare-call from files already wrapped with @complior/sdk.
      // After fix, source files have complior() wrapper but semgrep still flags method calls.
      const wrappedFiles = new Set<string>();
      for (const f of ctx.files) {
        if (f.content.includes('@complior/sdk') && /complior\s*\(/.test(f.content)) {
          wrappedFiles.add(f.relativePath);
        }
      }
      const filteredMerged = mergedFindings.filter((f) => {
        if (f.checkId.startsWith('ext-semgrep-complior-bare-call') && f.file && wrappedFiles.has(f.file)) return false;
        return true;
      });

      // 5c. Enrich external findings with fixDiff and codeContext
      const fileMap = new Map<string, string>();
      for (const f of ctx.files) {
        fileMap.set(f.relativePath, f.content);
      }
      const enrichedMerged = enrichFindings(filteredMerged, fileMap);

      // 6. Recalculate score
      const mergedCheckResults = findingsToCheckResults(enrichedMerged);

      const score = scoringData !== undefined
        ? calculateScore(mergedCheckResults, scoringData)
        : createFallbackScore(mergedFindings);

      return {
        score: { ...score, confidenceSummary: baseResult.score.confidenceSummary },
        findings: enrichedMerged,
        projectPath: baseResult.projectPath,
        scannedAt: baseResult.scannedAt,
        duration: Date.now() - tier2Start,
        filesScanned: baseResult.filesScanned,
        regulationVersion: baseResult.regulationVersion,
        tier: 2,
        externalToolResults: toolResults,
      };
    }
    : undefined;

  return Object.freeze({ scan, scanDeep, scanTier2 });
};

// Re-export types for backward compatibility
export type { CheckFunction, ScanContext, FileInfo } from '../../ports/scanner.port.js';
