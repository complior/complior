/**
 * Eval Service — application-level orchestration for `complior eval`.
 *
 * Wires domain modules (runner, scorer, judge, adapters, security)
 * into a single entry point for HTTP routes and CLI.
 */

import { readFile, readdir, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { z } from 'zod';
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
import type { LlmPort } from '../ports/llm.port.js';
import type { LoggerPort } from '../ports/logger.port.js';
import { createLogger } from '../infra/logger.js';

// ── Service deps ─────────────────────────────────────────────────

export interface EvalServiceDeps {
  readonly getProjectPath: () => string;
  readonly llm?: LlmPort;
  readonly callLlm?: (prompt: string, systemPrompt?: string) => Promise<string>;
  readonly evidenceStore?: EvidenceStore;
  readonly auditStore?: AuditStore;
  /** Optional: auto-sync eval results into agent passport (US-REM-04). */
  readonly updatePassportEval?: (result: EvalResult) => Promise<void>;
  readonly log?: LoggerPort;
}

export const createEvalService = (deps: EvalServiceDeps) => {
  const log = deps.log ?? createLogger('eval');

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
    //   1. llm-adapter (user's configured model from .complior/.env)
    //   2. Target adapter (same API/key as target)
    //   3. deps.callLlm (composition-root closure)
    let judge: EvalJudge | undefined;

    // 1. Try llm-adapter — user's own model from .complior/.env
    if (deps.llm) {
      try {
        const routing = deps.llm.routeModel('classify');
        const model = await deps.llm.getModel(routing.provider, routing.modelId);
        const { generateText } = await import('ai');
        const callJudge = async (prompt: string, systemPrompt?: string): Promise<string> => {
          const result = await generateText({ model, prompt, system: systemPrompt, maxTokens: 2048 });
          return result.text;
        };
        await callJudge('Say "ok"');
        judge = createLlmJudge({ callLlm: callJudge });
        runnerDeps = { ...runnerDeps, callLlm: callJudge };
      } catch (error) {
        log.warn(`LLM judge probe failed: ${error instanceof Error ? error.message : error}`);
      }
    }

    // 2. Fallback: target adapter (same API as eval target)
    const callLlmViaTarget = (options.apiKey && options.model)
      ? async (prompt: string, systemPrompt?: string): Promise<string> => {
          const resp = await adapter.send(prompt, { systemPrompt, temperature: 0, maxTokens: 2048 });
          return resp.text;
        }
      : undefined;

    if (!judge && callLlmViaTarget) {
      judge = createLlmJudge({ callLlm: callLlmViaTarget });
      runnerDeps = { ...runnerDeps, callLlm: callLlmViaTarget };
    }

    // 3. Fallback: deps.callLlm (composition-root closure)
    if (!judge && deps.callLlm) {
      judge = createLlmJudge({ callLlm: deps.callLlm });
    }

    if (!judge) {
      log.warn('No LLM judge available. Set an API key in .complior/.env for LLM-judged tests.');
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

  // Minimal schema for validating persisted eval results
  const EvalResultSchema = z.object({
    target: z.string(),
    overallScore: z.number(),
    grade: z.string(),
    totalTests: z.number(),
    passed: z.number(),
    failed: z.number(),
    results: z.array(z.object({ testId: z.string(), verdict: z.string() }).passthrough()),
  }).passthrough();

  /** Get last eval result from disk. */
  const getLastResult = async (): Promise<EvalResult | null> => {
    try {
      const latestPath = resolve(deps.getProjectPath(), '.complior', 'eval', 'latest.json');
      const raw = await readFile(latestPath, 'utf-8');
      const parsed = EvalResultSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        log.warn('Invalid eval result on disk:', parsed.error.message);
        return null;
      }
      return parsed.data as unknown as EvalResult;
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

  /**
   * Apply eval fixes: only Type B (config/file creation) findings.
   * Type A (system-prompt) findings are returned as manual guidance.
   */
  const applyEvalFixes = async (): Promise<{
    applied: readonly { checkId: string; file: string; type: 'B' }[];
    manual: readonly { checkId: string; title: string; fixDescription: string; type: 'A' }[];
  }> => {
    const evalResult = await getLastResult();
    if (!evalResult) {
      return { applied: [], manual: [] };
    }

    const findings = await getEvalFindings(evalResult);

    const applied: { checkId: string; file: string; type: 'B' }[] = [];
    const manual: { checkId: string; title: string; fixDescription: string; type: 'A' }[] = [];
    const projectPath = deps.getProjectPath();

    for (const finding of findings) {
      if (finding.type === 'A') {
        // System prompt patches — can't auto-apply, return as guidance
        manual.push({
          checkId: finding.checkId,
          title: finding.title,
          fixDescription: finding.fixDescription,
          type: 'A',
        });
      } else {
        // Type B — create config/fix files
        const fullPath = resolve(projectPath, finding.file);
        try {
          await mkdir(dirname(fullPath), { recursive: true });

          // Backup existing file if present
          const backupDir = resolve(projectPath, '.complior', 'backups');
          await mkdir(backupDir, { recursive: true });
          try {
            await copyFile(fullPath, resolve(backupDir, `${Date.now()}-${finding.file.replace(/[\\/]/g, '_')}`));
          } catch { /* file doesn't exist yet */ }

          // Write the fix content
          const content = JSON.stringify({
            checkId: finding.checkId,
            article: finding.article,
            description: finding.description,
            fixDescription: finding.fixDescription,
            fixExample: finding.fixExample,
            generatedAt: new Date().toISOString(),
          }, null, 2);
          await writeFile(fullPath, content, 'utf-8');

          applied.push({
            checkId: finding.checkId,
            file: finding.file,
            type: 'B',
          });
        } catch (err) {
          log.warn(`Failed to apply eval fix for ${finding.checkId}: ${err instanceof Error ? err.message : err}`);
        }
      }
    }

    return { applied, manual };
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
    applyEvalFixes,
  });
};

export type EvalService = ReturnType<typeof createEvalService>;
