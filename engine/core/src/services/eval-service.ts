/**
 * Eval Service — application-level orchestration for `complior eval`.
 *
 * Wires domain modules (runner, scorer, judge, adapters, security)
 * into a single entry point for HTTP routes and CLI.
 */

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { z } from 'zod';
import type { EvalResult, EvalOptions, EvalProgressCallback, TestResult, ConformityTest } from '../domain/eval/types.js';
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
import { filterTestsByProfile, filterSecurityProbesByProfile, type FilterProfile } from '../domain/eval/eval-profile-filter.js';
import { buildEvalDisclaimer } from '../domain/eval/eval-disclaimer.js';
import type { EvidenceStore } from '../domain/scanner/evidence-store.js';
import type { AuditStore } from '../domain/audit/audit-trail.js';
import type { RemediationAction, RemediationReport } from '../domain/eval/remediation-types.js';
import type { EvalFinding } from '../domain/eval/eval-to-findings.js';
import type { LlmPort } from '../ports/llm.port.js';
import type { LoggerPort } from '../ports/logger.port.js';
import type { EventBusPort } from '../ports/events.port.js';
import type { UndoService } from './undo-service.js';
import type { ScanResult } from '../types/common.types.js';
import type { AgentPassport } from '../types/passport.types.js';
import { createEvidence } from '../domain/scanner/evidence.js';
import { createLogger } from '../infra/logger.js';
import { backupFile } from './shared/backup.js';

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
  readonly undoService?: UndoService;
  readonly events?: EventBusPort;
  readonly scanService?: { scan: (path: string) => Promise<ScanResult> };
  readonly listPassports?: () => Promise<readonly AgentPassport[]>;
  /** V1-M12 T-13: Load project profile for context-aware eval filtering. */
  readonly getProjectProfile?: (path: string) => Promise<{
    role: 'provider' | 'deployer' | 'both';
    riskLevel: string | null;
    domain: string | null;
  } | null>;
}

export const createEvalService = (deps: EvalServiceDeps) => {
  const log = deps.log ?? createLogger('eval');

  // R9: Immutable base runner deps — callLlm resolved per-invocation inside runEval()
  const baseRunnerDeps: Omit<EvalRunnerDeps, 'callLlm'> = {
    getProjectPath: deps.getProjectPath,
    evidenceStore: deps.evidenceStore,
    auditStore: deps.auditStore,
    getSecurityRubric,
  };

  const baseRunner = createEvalRunner({ ...baseRunnerDeps, callLlm: deps.callLlm });
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
    // Auto-resolve agent if not specified (endpoint match → single-passport fallback)
    let resolvedOptions = options;
    if (!options.agent && deps.listPassports) {
      try {
        const passports = await deps.listPassports();
        // Strategy A: endpoint match (most specific)
        const endpointMatch = passports.find(p =>
          p.endpoints?.some(ep => options.target.startsWith(ep))
        );
        if (endpointMatch) {
          resolvedOptions = { ...options, agent: endpointMatch.name };
          log.info(`Auto-linked to passport: ${endpointMatch.name} (endpoint match)`);
        }
        // Strategy B: single passport fallback
        else if (passports.length === 1) {
          resolvedOptions = { ...options, agent: passports[0]!.name };
          log.info(`Auto-linked to passport: ${passports[0]!.name} (single passport)`);
        }
      } catch { /* non-fatal — proceed without agent */ }
    }

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
    let effectiveCallLlm = deps.callLlm;

    // 1. Try llm-adapter — user's own model from .complior/.env
    if (deps.llm) {
      try {
        const routing = deps.llm.routeModel('classify');
        const model = await deps.llm.getModel(routing.provider, routing.modelId);
        const { generateText } = await import('ai');
        const callJudge = async (prompt: string, systemPrompt?: string): Promise<string> => {
          const result = await generateText({ model, prompt, system: systemPrompt, maxOutputTokens: 2048 });
          return result.text;
        };
        await callJudge('Say "ok"');
        judge = createLlmJudge({ callLlm: callJudge });
        effectiveCallLlm = callJudge;
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
      effectiveCallLlm = callLlmViaTarget;
    }

    // 3. Fallback: deps.callLlm (composition-root closure)
    if (!judge && deps.callLlm) {
      judge = createLlmJudge({ callLlm: deps.callLlm });
    }

    if (!judge) {
      log.warn('No LLM judge available. Set an API key in .complior/.env for LLM-judged tests.');
    }

    // R9: Build immutable runner deps per invocation (no mutable closure state)
    const runnerDeps: EvalRunnerDeps = Object.freeze({ ...baseRunnerDeps, callLlm: effectiveCallLlm });
    const effectiveRunner = effectiveCallLlm !== deps.callLlm
      ? createEvalRunner(runnerDeps)
      : baseRunner;

    // V1-M12 T-13: Load profile for context-aware filtering
    const profile = deps.getProjectProfile
      ? await deps.getProjectProfile(deps.getProjectPath()).catch(() => null)
      : null;

    // V1-M12.1 T-1: Filter test sources BEFORE runEval() — saves HTTP/LLM costs
    // Build a filtered EvalTestSources so runner never sees inapplicable tests.
    const filterProfile: FilterProfile | null = profile
      ? {
          role: profile.role as 'provider' | 'deployer' | 'both',
          riskLevel: profile.riskLevel,
          domain: profile.domain,
        }
      : null;

    const filteredTestSources: EvalTestSources = {
      getDeterministicTests: () => {
        const all = testSources.getDeterministicTests();
        if (!filterProfile) return all;
        return filterTestsByProfile(all, filterProfile).filtered;
      },
      getLlmTests: () => {
        const all = testSources.getLlmTests();
        if (!filterProfile) return all;
        return filterTestsByProfile(all, filterProfile).filtered;
      },
      getSecurityProbes: () => {
        // Security probes: filter by profile using dedicated function (V1-M20 / TD-44)
        if (!filterProfile) return testSources.getSecurityProbes();
        return filterSecurityProbesByProfile(
          testSources.getSecurityProbes(),
          filterProfile,
        ).filtered;
      },
    };

    let result = await effectiveRunner.runEval(adapter, resolvedOptions, filteredTestSources, scorer, judge, onProgress);

    // V1-M12 T-12: Build filterContext + disclaimer from profile
    if (profile) {
      // Count from ORIGINAL test sources (before runner's category filter) for accurate metadata.
      // The filteredTestSources has category filter applied by runner, so re-filter here
      // from unfiltered sources to get full skipped counts.
      const allTests = [
        ...testSources.getDeterministicTests(),
        ...testSources.getLlmTests(),
      ];
      const { context: filterContext } = filterTestsByProfile(allTests, filterProfile);
      const disclaimer = buildEvalDisclaimer(filterContext, true);

      // V1-M12: Attach filterContext + disclaimer to result (merged object)
      result = Object.freeze({
        ...result,
        filterContext,
        disclaimer,
      });
    }

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
      return parsed.data;
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

  // R4: Render remediation report markdown via service (route should not import domain).
  const getRemediationReportMarkdown = async (): Promise<string> => {
    const { renderRemediationMarkdown } = await import('../domain/eval/eval-remediation-report.js');
    const result = await getLastResult();
    if (!result) return '# No eval results found';
    const report = await generateRemediationReport(result);
    return renderRemediationMarkdown(report);
  };

  // R5: Check if an LLM judge API key is configured (service reads env, not route).
  const isJudgeConfigured = (): boolean => {
    return !!(process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
  };

  /**
   * Apply eval fixes: only Type B (config/file creation) findings.
   * Type A (system-prompt) findings are returned as manual guidance.
   * R1: Records undo history, evidence chain, and emits score.updated event.
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

    // Capture score before applying fixes
    let scoreBefore = 0;
    if (deps.scanService) {
      try {
        const scan = await deps.scanService.scan(projectPath);
        scoreBefore = scan.score.totalScore;
      } catch { /* non-fatal */ }
    }

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

          // R3: Use shared backup utility
          await backupFile(finding.file, projectPath);

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

    // R1: Post-apply — re-scan, record undo history, append evidence, emit event
    let scoreAfter = scoreBefore;
    if (applied.length > 0 && deps.scanService) {
      try {
        const scan = await deps.scanService.scan(projectPath);
        scoreAfter = scan.score.totalScore;
      } catch { /* non-fatal */ }
    }

    for (const fix of applied) {
      // Record undo history
      if (deps.undoService) {
        try {
          const plan = {
            checkId: fix.checkId,
            obligationId: '',
            fixType: 'config_fix' as const,
            article: '',
            description: 'Eval fix',
            framework: '',
            actions: [{ type: 'create' as const, path: fix.file, description: 'Eval fix: create file' }],
            diff: '',
            scoreImpact: 0,
            commitMessage: '',
          };
          await deps.undoService.recordFix(
            { plan, applied: true, scoreBefore, scoreAfter, backedUpFiles: [] },
            plan,
          );
        } catch { /* non-fatal */ }
      }

      // Append evidence
      if (deps.evidenceStore) {
        try {
          const evidence = createEvidence(fix.checkId, 'eval-fix', 'fix', { file: fix.file });
          await deps.evidenceStore.append([evidence], randomUUID());
        } catch { /* non-fatal */ }
      }
    }

    // Emit score update event
    if (applied.length > 0 && deps.events) {
      deps.events.emit('score.updated', { before: scoreBefore, after: scoreAfter });
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
    getRemediationReportMarkdown,
    isJudgeConfigured,
  });
};

export type EvalService = ReturnType<typeof createEvalService>;
