/**
 * Eval Service — application-level orchestration for `complior eval`.
 *
 * Wires domain modules (runner, scorer, judge, adapters, security)
 * into a single entry point for HTTP routes and CLI.
 */

import type { EvalResult, EvalOptions, EvalProgressCallback } from '../domain/eval/types.js';
import type { TargetAdapter } from '../domain/eval/adapters/adapter-port.js';
import type { EvalRunnerDeps, EvalTestSources, EvalScorer, EvalJudge } from '../domain/eval/eval-runner.js';
import { createEvalRunner } from '../domain/eval/eval-runner.js';
import { autoDetectAdapter } from '../domain/eval/adapters/auto-detect.js';
import { createConformityScorer } from '../domain/eval/conformity-score.js';
import { createLlmJudge } from '../domain/eval/llm-judge.js';
import { createSecurityProbeLoader } from '../domain/eval/security-integration.js';
import { buildPassportEvalBlock, mergeEvalIntoPassport } from '../domain/eval/eval-passport.js';
import { generateEvalReport } from '../domain/eval/eval-report.js';
import type { EvidenceStore } from '../domain/scanner/evidence-store.js';
import type { AuditStore } from '../domain/audit/audit-trail.js';

// ── Service deps ─────────────────────────────────────────────────

export interface EvalServiceDeps {
  readonly getProjectPath: () => string;
  readonly callLlm?: (prompt: string, systemPrompt?: string) => Promise<string>;
  readonly evidenceStore?: EvidenceStore;
  readonly auditStore?: AuditStore;
}

// ── Factory ──────────────────────────────────────────────────────

export const createEvalService = (deps: EvalServiceDeps) => {
  const runnerDeps: EvalRunnerDeps = {
    getProjectPath: deps.getProjectPath,
    evidenceStore: deps.evidenceStore,
    auditStore: deps.auditStore,
    callLlm: deps.callLlm,
  };

  const runner = createEvalRunner(runnerDeps);
  const scorer: EvalScorer = createConformityScorer();

  // Lazy-load test sources (avoids importing large data at boot)
  let _testSources: EvalTestSources | null = null;
  const getTestSources = async (): Promise<EvalTestSources> => {
    if (_testSources) return _testSources;

    const { DETERMINISTIC_TESTS, LLM_JUDGED_TESTS } = await import('../data/eval/index.js');
    const { ATTACK_PROBES } = await import('../data/security/attack-probes.js');

    _testSources = {
      getDeterministicTests: () => DETERMINISTIC_TESTS,
      getLlmTests: () => LLM_JUDGED_TESTS,
      getSecurityProbes: createSecurityProbeLoader(ATTACK_PROBES),
    };
    return _testSources;
  };

  /**
   * Run a full eval against a target URL.
   *
   * @param options - Eval configuration (target URL, tier, categories, etc.)
   * @param onProgress - Optional progress callback for CLI/SSE
   * @returns Complete eval result
   */
  const runEval = async (
    options: EvalOptions,
    onProgress?: EvalProgressCallback,
  ): Promise<EvalResult> => {
    // Detect adapter from target URL
    const adapter: TargetAdapter = await autoDetectAdapter(
      options.target,
      options.model,
      options.apiKey,
    );

    const testSources = await getTestSources();

    // Create LLM judge if tier includes it and callLlm is available
    let judge: EvalJudge | undefined;
    if (deps.callLlm) {
      judge = createLlmJudge({ callLlm: deps.callLlm });
    }

    return runner.runEval(adapter, options, testSources, scorer, judge, onProgress);
  };

  /**
   * Run eval and return a markdown report.
   */
  const runEvalWithReport = async (
    options: EvalOptions,
    onProgress?: EvalProgressCallback,
  ): Promise<{ result: EvalResult; report: string }> => {
    const result = await runEval(options, onProgress);
    const report = generateEvalReport(result);
    return { result, report };
  };

  /**
   * Get the passport eval block for a completed eval.
   */
  const getPassportEvalBlock = (result: EvalResult) =>
    buildPassportEvalBlock(result);

  /**
   * Merge eval results into a passport.
   */
  const updatePassportWithEval = (
    passport: Record<string, unknown>,
    result: EvalResult,
  ): Record<string, unknown> => {
    const block = buildPassportEvalBlock(result);
    return mergeEvalIntoPassport(passport, block);
  };

  return Object.freeze({
    runEval,
    runEvalWithReport,
    getPassportEvalBlock,
    updatePassportWithEval,
  });
};

export type EvalService = ReturnType<typeof createEvalService>;
