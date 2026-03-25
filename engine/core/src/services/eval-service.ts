/**
 * Eval Service — application-level orchestration for `complior eval`.
 *
 * Wires domain modules (runner, scorer, judge, adapters, security)
 * into a single entry point for HTTP routes and CLI.
 */

import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { EvalResult, EvalOptions, EvalProgressCallback, TestResult } from '../domain/eval/types.js';
import type { TargetAdapter } from '../domain/eval/adapters/adapter-port.js';
import type { EvalRunnerDeps, EvalTestSources, EvalScorer, EvalJudge } from '../domain/eval/eval-runner.js';
import { createEvalRunner } from '../domain/eval/eval-runner.js';
import { autoDetectAdapter } from '../domain/eval/adapters/auto-detect.js';
import { createConformityScorer } from '../domain/eval/conformity-score.js';
import { createLlmJudge } from '../domain/eval/llm-judge.js';
import { createSecurityProbeLoader } from '../domain/eval/security-integration.js';
import { getSecurityRubric } from '../data/eval/security-rubrics.js';
import { buildPassportEvalBlock, mergeEvalIntoPassport } from '../domain/eval/eval-passport.js';
import { generateEvalReport } from '../domain/eval/eval-report.js';
import type { EvidenceStore } from '../domain/scanner/evidence-store.js';
import type { AuditStore } from '../domain/audit/audit-trail.js';
import type { RemediationAction, RemediationReport } from '../domain/eval/remediation-types.js';
import type { EvalFinding } from '../domain/eval/eval-to-findings.js';

// ── Service deps ─────────────────────────────────────────────────

export interface EvalServiceDeps {
  readonly getProjectPath: () => string;
  readonly callLlm?: (prompt: string, systemPrompt?: string) => Promise<string>;
  readonly evidenceStore?: EvidenceStore;
  readonly auditStore?: AuditStore;
  /** Optional: auto-sync eval results into agent passport (US-REM-04). */
  readonly updatePassportEval?: (result: EvalResult) => Promise<void>;
}

// ── Factory ──────────────────────────────────────────────────────

/**
 * Auto-detect judge provider from API key format.
 * Returns { provider, model, baseUrl } for adapter creation.
 */
const resolveJudgeConfig = (apiKey: string): { provider: string; model: string; baseUrl: string } => {
  if (apiKey.startsWith('sk-ant-')) {
    return { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', baseUrl: 'https://api.anthropic.com' };
  }
  if (apiKey.startsWith('sk-or-v1-')) {
    return { provider: 'openrouter', model: 'anthropic/claude-sonnet-4-5-20250929', baseUrl: 'https://openrouter.ai/api' };
  }
  // Default: OpenAI-compatible
  return { provider: 'openai', model: 'gpt-4o', baseUrl: 'https://api.openai.com' };
};

export const createEvalService = (deps: EvalServiceDeps) => {
  let runnerDeps: EvalRunnerDeps = {
    getProjectPath: deps.getProjectPath,
    evidenceStore: deps.evidenceStore,
    auditStore: deps.auditStore,
    callLlm: deps.callLlm,
    getSecurityRubric,
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
      {
        model: options.model,
        apiKey: options.apiKey,
        requestTemplate: options.requestTemplate,
        responsePath: options.responsePath,
        headers: options.headers,
      },
    );

    const testSources = await getTestSources();

    // Create LLM judge — priority order:
    //   1. COMPLIOR_JUDGE_API_KEY (dedicated judge, avoids circular grading)
    //   2. deps.callLlm (engine's configured LLM)
    //   3. Target adapter (same API/key as target — circular but functional)
    //
    // callLlm wrapper uses fail-fast: if dedicated judge fails on first call,
    // automatically falls back to target adapter for all subsequent calls.
    let judge: EvalJudge | undefined;
    const judgeApiKey = process.env.COMPLIOR_JUDGE_API_KEY;

    // Build target-based callLlm (always available as fallback)
    const callLlmViaTarget = (options.apiKey && options.model)
      ? async (prompt: string, systemPrompt?: string): Promise<string> => {
          const resp = await adapter.send(prompt, { systemPrompt, temperature: 0, maxTokens: 2048 });
          return resp.text;
        }
      : undefined;

    if (judgeApiKey) {
      const judgeConfig = resolveJudgeConfig(judgeApiKey);
      try {
        const judgeAdapter = await autoDetectAdapter(judgeConfig.baseUrl, {
          model: judgeConfig.model,
          apiKey: judgeApiKey,
        });
        // Verify judge works with a probe call before committing
        await judgeAdapter.send('Say "ok"', { temperature: 0, maxTokens: 16 });
        const callJudge = async (prompt: string, systemPrompt?: string): Promise<string> => {
          const resp = await judgeAdapter.send(prompt, { systemPrompt, temperature: 0, maxTokens: 2048 });
          return resp.text;
        };
        judge = createLlmJudge({ callLlm: callJudge });
        runnerDeps = { ...runnerDeps, callLlm: callJudge };
      } catch {
        // Judge adapter failed — fall through to next fallback
      }
    }
    // Prefer target adapter over deps.callLlm — target is a real working API,
    // while deps.callLlm may be an engine stub that returns "[ERROR] LLM unavailable"
    if (!judge && callLlmViaTarget) {
      judge = createLlmJudge({ callLlm: callLlmViaTarget });
      runnerDeps = { ...runnerDeps, callLlm: callLlmViaTarget };
    }
    if (!judge && deps.callLlm) {
      judge = createLlmJudge({ callLlm: deps.callLlm });
    }

    // Re-create runner with potentially updated callLlm
    const effectiveRunner = runnerDeps.callLlm !== deps.callLlm
      ? createEvalRunner(runnerDeps)
      : runner;

    const result = await effectiveRunner.runEval(adapter, options, testSources, scorer, judge, onProgress);

    // US-REM-04: Auto-sync eval results into agent passport (non-fatal)
    if (deps.updatePassportEval) {
      try { await deps.updatePassportEval(result); } catch { /* non-fatal */ }
    }

    return result;
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

  /** Get last eval result from disk. */
  const getLastResult = async (): Promise<EvalResult | null> => {
    try {
      const latestPath = resolve(deps.getProjectPath(), '.complior', 'eval', 'latest.json');
      const raw = await readFile(latestPath, 'utf-8');
      return JSON.parse(raw) as EvalResult;
    } catch {
      return null;
    }
  };

  /** List eval result filenames (newest first). */
  const listResults = async (): Promise<string[]> => {
    try {
      const evalDir = resolve(deps.getProjectPath(), '.complior', 'eval');
      const files = await readdir(evalDir);
      return files
        .filter((f) => f.startsWith('eval-') && f.endsWith('.json') && f !== 'latest.json')
        .sort()
        .reverse();
    } catch {
      return [];
    }
  };

  // ── Remediation methods (US-REM-03..10) ─────────────────────

  /**
   * Get remediation actions for specific test IDs.
   * Lazy-loads remediation data to avoid boot-time import cost.
   */
  const getRemediationForTests = async (
    testIds: readonly string[],
    results: readonly TestResult[],
  ): Promise<Record<string, readonly RemediationAction[]>> => {
    const { ALL_PLAYBOOKS } = await import('../data/eval/remediation/index.js');
    const { getRemediationForTest } = await import('../data/eval/remediation/test-mapping.js');

    const out: Record<string, readonly RemediationAction[]> = {};
    for (const id of testIds) {
      const result = results.find((r) => r.testId === id);
      const category = result?.category ?? '';
      const owaspCategory = result?.owaspCategory;
      out[id] = getRemediationForTest(id, category, ALL_PLAYBOOKS, owaspCategory);
    }
    return out;
  };

  /**
   * Generate a full remediation report for a completed eval.
   */
  const generateRemediationReport = async (
    evalResult: EvalResult,
  ): Promise<RemediationReport> => {
    const { ALL_PLAYBOOKS } = await import('../data/eval/remediation/index.js');
    const { generateRemediationReport: genReport } = await import('../domain/eval/eval-remediation-report.js');

    const { isFailedVerdict } = await import('../domain/eval/verdict-utils.js');
    // Get remediation for all failures
    const failures = evalResult.results.filter(isFailedVerdict);
    const failedIds = failures.map((f) => f.testId);
    const remediation = await getRemediationForTests(failedIds, evalResult.results);

    return genReport(evalResult, remediation, ALL_PLAYBOOKS);
  };

  /**
   * Convert eval failures into scanner Finding format for fix pipeline (US-REM-09).
   */
  const getEvalFindings = async (
    evalResult: EvalResult,
  ): Promise<readonly EvalFinding[]> => {
    const { ALL_PLAYBOOKS } = await import('../data/eval/remediation/index.js');
    const { evalToFindings } = await import('../domain/eval/eval-to-findings.js');
    return evalToFindings(evalResult, ALL_PLAYBOOKS);
  };

  return Object.freeze({
    runEval,
    runEvalWithReport,
    getPassportEvalBlock,
    updatePassportWithEval,
    getLastResult,
    listResults,
    getRemediationForTests,
    generateRemediationReport,
    getEvalFindings,
  });
};

export type EvalService = ReturnType<typeof createEvalService>;
