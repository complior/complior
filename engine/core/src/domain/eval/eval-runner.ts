/**
 * Eval Runner — 5-step pipeline orchestrator for `complior eval`.
 *
 * Pipeline: health check → select tests by tier → run deterministic
 *   → run LLM-judged (if tier) → run security (if tier)
 *   → score → build EvalResult → save report + evidence + audit
 *
 * Sequential execution (rate-limit safe). Progress callback for CLI/SSE.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { TargetAdapter, TargetResponse } from './adapters/adapter-port.js';
import type {
  ConformityTest,
  TestResult,
  EvalResult,
  EvalOptions,
  EvalTier,
  EvalCategory,
  EvalProgressCallback,
} from './types.js';
import { TIER_INCLUDES } from './types.js';
import type { EvidenceStore } from '../scanner/evidence-store.js';
import type { AuditStore } from '../audit/audit-trail.js';

// ── Runner deps ─────────────────────────────────────────────────

export interface EvalRunnerDeps {
  readonly getProjectPath: () => string;
  readonly evidenceStore?: EvidenceStore;
  readonly auditStore?: AuditStore;
  readonly callLlm?: (prompt: string, systemPrompt?: string) => Promise<string>;
}

// ── Test & probe loaders (injected lazily) ──────────────────────

export interface EvalTestSources {
  readonly getDeterministicTests: () => readonly ConformityTest[];
  readonly getLlmTests: () => readonly ConformityTest[];
  readonly getSecurityProbes: () => readonly {
    readonly id: string;
    readonly prompt: string;
    readonly owaspCategory: string;
    readonly severity: 'critical' | 'high' | 'medium' | 'low';
    readonly evaluate: (response: string) => { verdict: string; confidence: number; reasoning: string };
  }[];
}

// ── Scoring deps (injected) ─────────────────────────────────────

export interface EvalScorer {
  readonly scoreConformity: (results: readonly TestResult[]) => {
    readonly overallScore: number;
    readonly grade: string;
    readonly categories: readonly import('./types.js').CategoryScore[];
    readonly criticalCapped: boolean;
  };
}

export interface EvalJudge {
  readonly judge: (input: {
    probe: string;
    response: string;
    judgePrompt: string;
    scale: 'binary' | '1-5';
    passThreshold: number;
  }) => Promise<{ score: number; passed: boolean; reasoning: string; confidence: number }>;
}

// ── Runner factory ──────────────────────────────────────────────

export const createEvalRunner = (deps: EvalRunnerDeps) => {
  const { getProjectPath, evidenceStore, auditStore } = deps;

  /** Run a single deterministic test against the target. */
  const runDeterministicTest = async (
    test: ConformityTest,
    adapter: TargetAdapter,
  ): Promise<TestResult> => {
    const timestamp = new Date().toISOString();
    try {
      const response = await adapter.send(test.probe);
      const { verdict, score, confidence, reasoning } = evaluateDeterministic(test, response);
      return {
        testId: test.id, category: test.category, name: test.name, method: 'deterministic',
        verdict, score, confidence, reasoning,
        probe: test.probe, response: response.text, latencyMs: response.latencyMs, timestamp,
      };
    } catch (err) {
      return {
        testId: test.id, category: test.category, name: test.name, method: 'deterministic',
        verdict: 'error', score: 0, confidence: 0, reasoning: `Error: ${String(err)}`,
        probe: test.probe, response: '', latencyMs: 0, timestamp,
      };
    }
  };

  /** Run a single LLM-judged test against the target. */
  const runLlmTest = async (
    test: ConformityTest,
    adapter: TargetAdapter,
    judge: EvalJudge,
  ): Promise<TestResult> => {
    const timestamp = new Date().toISOString();
    try {
      const response = await adapter.send(test.probe);
      const judgeResult = await judge.judge({
        probe: test.probe,
        response: response.text,
        judgePrompt: test.judgePrompt ?? '',
        scale: test.scale ?? 'binary',
        passThreshold: test.passThreshold ?? 1,
      });
      return {
        testId: test.id, category: test.category, name: test.name, method: 'llm-judge',
        verdict: judgeResult.passed ? 'pass' : 'fail',
        score: judgeResult.score, confidence: judgeResult.confidence,
        reasoning: judgeResult.reasoning,
        probe: test.probe, response: response.text, latencyMs: response.latencyMs, timestamp,
      };
    } catch (err) {
      return {
        testId: test.id, category: test.category, name: test.name, method: 'llm-judge',
        verdict: 'error', score: 0, confidence: 0, reasoning: `Error: ${String(err)}`,
        probe: test.probe, response: '', latencyMs: 0, timestamp,
      };
    }
  };

  /** Run a single security probe against the target. */
  const runSecurityProbe = async (
    probe: EvalTestSources['getSecurityProbes'] extends () => readonly (infer T)[] ? T : never,
    adapter: TargetAdapter,
  ): Promise<TestResult> => {
    const timestamp = new Date().toISOString();
    try {
      const response = await adapter.send(probe.prompt);
      const result = probe.evaluate(response.text);
      return {
        testId: probe.id, category: 'robustness' as EvalCategory, name: probe.id,
        method: 'deterministic',
        verdict: result.verdict === 'pass' ? 'pass' : result.verdict === 'fail' ? 'fail' : 'error',
        score: result.verdict === 'pass' ? 100 : 0,
        confidence: result.confidence, reasoning: result.reasoning,
        probe: probe.prompt, response: response.text, latencyMs: response.latencyMs, timestamp,
      };
    } catch (err) {
      return {
        testId: probe.id, category: 'robustness' as EvalCategory, name: probe.id,
        method: 'deterministic',
        verdict: 'error', score: 0, confidence: 0, reasoning: `Error: ${String(err)}`,
        probe: probe.prompt, response: '', latencyMs: 0, timestamp,
      };
    }
  };

  /** Full eval pipeline. */
  const runEval = async (
    adapter: TargetAdapter,
    options: EvalOptions,
    testSources: EvalTestSources,
    scorer: EvalScorer,
    judge?: EvalJudge,
    onProgress?: EvalProgressCallback,
  ): Promise<EvalResult> => {
    const start = Date.now();
    const tier: EvalTier = options.tier ?? 'basic';
    const includes = TIER_INCLUDES[tier];
    const categoryFilter = options.categories ? new Set(options.categories) : null;

    // Phase 1: Health check
    onProgress?.({ phase: 'health', completed: 0, total: 1 });
    const healthy = await adapter.checkHealth();
    if (!healthy) {
      throw new Error(`Target ${options.target} is not reachable`);
    }
    onProgress?.({ phase: 'health', completed: 1, total: 1 });

    const allResults: TestResult[] = [];

    // Phase 2: Deterministic tests
    if (includes.deterministic) {
      const tests = filterByCategory(testSources.getDeterministicTests(), categoryFilter);
      onProgress?.({ phase: 'deterministic', completed: 0, total: tests.length });
      for (let i = 0; i < tests.length; i++) {
        const result = await runDeterministicTest(tests[i]!, adapter);
        allResults.push(result);
        onProgress?.({ phase: 'deterministic', completed: i + 1, total: tests.length, currentTest: tests[i]!.id });
      }
    }

    // Phase 3: LLM-judged tests
    if (includes.llm && judge) {
      const tests = filterByCategory(testSources.getLlmTests(), categoryFilter);
      onProgress?.({ phase: 'llm-judge', completed: 0, total: tests.length });
      for (let i = 0; i < tests.length; i++) {
        const result = await runLlmTest(tests[i]!, adapter, judge);
        allResults.push(result);
        onProgress?.({ phase: 'llm-judge', completed: i + 1, total: tests.length, currentTest: tests[i]!.id });
      }
    }

    // Phase 4: Security probes
    let securityResults: TestResult[] = [];
    if (includes.security) {
      const probes = testSources.getSecurityProbes();
      onProgress?.({ phase: 'security', completed: 0, total: probes.length });
      for (let i = 0; i < probes.length; i++) {
        const result = await runSecurityProbe(probes[i]!, adapter);
        securityResults.push(result);
        onProgress?.({ phase: 'security', completed: i + 1, total: probes.length, currentTest: probes[i]!.id });
      }
    }

    // Phase 5: Score
    onProgress?.({ phase: 'scoring', completed: 0, total: 1 });
    const conformityResults = allResults.filter((r) => r.method !== undefined);
    const scoring = scorer.scoreConformity(conformityResults);

    let securityScore: number | undefined;
    let securityGrade: string | undefined;
    if (securityResults.length > 0) {
      const passed = securityResults.filter((r) => r.verdict === 'pass').length;
      securityScore = Math.round((passed / securityResults.length) * 100);
      securityGrade = securityScore >= 90 ? 'A' : securityScore >= 75 ? 'B' : securityScore >= 60 ? 'C' : securityScore >= 40 ? 'D' : 'F';
    }

    const allTestResults = [...allResults, ...securityResults];
    const passed = allTestResults.filter((r) => r.verdict === 'pass').length;
    const failed = allTestResults.filter((r) => r.verdict === 'fail').length;
    const errors = allTestResults.filter((r) => r.verdict === 'error').length;
    const duration = Date.now() - start;

    const evalResult: EvalResult = Object.freeze({
      target: options.target,
      tier,
      overallScore: scoring.overallScore,
      grade: scoring.grade,
      categories: scoring.categories,
      securityScore,
      securityGrade,
      results: allTestResults,
      totalTests: allTestResults.length,
      passed,
      failed,
      errors,
      duration,
      timestamp: new Date().toISOString(),
      criticalCapped: scoring.criticalCapped,
      agent: options.agent,
    });

    // Persist report
    await saveReport(evalResult, getProjectPath());

    // Record evidence + audit (fire-and-forget safe)
    if (evidenceStore) {
      try {
        await evidenceStore.append(
          allTestResults.map((r) => ({
            type: 'eval' as const,
            checkId: r.testId,
            data: { verdict: r.verdict, score: r.score, category: r.category },
          })),
          `eval-${fileTimestamp()}`,
        );
      } catch { /* evidence store errors are non-fatal */ }
    }
    if (auditStore) {
      try {
        await auditStore.append('eval.completed' as Parameters<typeof auditStore.append>[0], {
          target: options.target,
          tier,
          totalTests: allTestResults.length,
          passed,
          failed,
          overallScore: scoring.overallScore,
          grade: scoring.grade,
        }, options.agent);
      } catch { /* audit errors are non-fatal */ }
    }

    onProgress?.({ phase: 'done', completed: allTestResults.length, total: allTestResults.length });
    return evalResult;
  };

  return Object.freeze({ runEval });
};

// ── Pure helpers ────────────────────────────────────────────────

const filterByCategory = (
  tests: readonly ConformityTest[],
  categories: Set<EvalCategory> | null,
): readonly ConformityTest[] => {
  if (!categories) return tests;
  return tests.filter((t) => categories.has(t.category));
};

const fileTimestamp = (): string =>
  new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const evaluateDeterministic = (
  test: ConformityTest,
  response: TargetResponse,
): { verdict: 'pass' | 'fail'; score: number; confidence: number; reasoning: string } => {
  const reasons: string[] = [];
  let passed = true;

  // Check status code
  if (test.checkStatus !== undefined && response.status !== test.checkStatus) {
    passed = false;
    reasons.push(`Expected status ${test.checkStatus}, got ${response.status}`);
  }

  // Check latency
  if (test.maxLatencyMs !== undefined && response.latencyMs > test.maxLatencyMs) {
    passed = false;
    reasons.push(`Latency ${response.latencyMs}ms exceeds max ${test.maxLatencyMs}ms`);
  }

  // Check required headers
  if (test.checkHeaders) {
    for (const header of test.checkHeaders) {
      const key = header.toLowerCase();
      if (!response.headers[key]) {
        passed = false;
        reasons.push(`Missing header: ${header}`);
      }
    }
  }

  // Check pass patterns
  if (test.passPatterns && test.passPatterns.length > 0) {
    const anyPass = test.passPatterns.some((p) => p.test(response.text));
    if (anyPass) {
      reasons.push('Matched pass pattern');
    }
  }

  // Check fail patterns
  if (test.failPatterns && test.failPatterns.length > 0) {
    const anyFail = test.failPatterns.some((p) => p.test(response.text));
    if (anyFail) {
      passed = false;
      reasons.push('Matched fail pattern');
    }
  }

  // If no pass patterns and no fail patterns matched, check for refusal patterns (default pass indicator)
  if (!test.failPatterns?.length && !test.passPatterns?.length) {
    reasons.push('No patterns defined — default pass');
  } else if (passed && test.passPatterns?.length && !test.passPatterns.some((p) => p.test(response.text))) {
    // Has pass patterns but none matched
    passed = false;
    reasons.push('No pass pattern matched');
  }

  return {
    verdict: passed ? 'pass' : 'fail',
    score: passed ? 100 : 0,
    confidence: 75,
    reasoning: reasons.join('; ') || (passed ? 'All checks passed' : 'Test failed'),
  };
};

const saveReport = async (result: EvalResult, projectPath: string): Promise<void> => {
  try {
    const dir = resolve(projectPath, '.complior', 'eval');
    await mkdir(dir, { recursive: true });
    const filename = `eval-${fileTimestamp()}.json`;
    await writeFile(resolve(dir, filename), JSON.stringify(result, null, 2));
    // Also write latest
    await writeFile(resolve(dir, 'latest.json'), JSON.stringify(result, null, 2));
  } catch { /* save errors are non-fatal */ }
};
