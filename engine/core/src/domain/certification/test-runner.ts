/**
 * Adversarial Test Runner — Art.9(6)-(8) testing, Art.15(4) robustness.
 *
 * Sends adversarial prompts to the configured LLM (system under test),
 * evaluates responses deterministically via pattern matching.
 * The LLM is the subject, NOT the evaluator.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { EvaluationResult } from './adversarial/evaluators.js';
import type { EvidenceStore } from '../scanner/evidence-store.js';
import type { AuditStore } from '../audit/audit-trail.js';

import { createEvidence } from '../scanner/evidence.js';
import { PROMPT_INJECTION_SCENARIOS } from './adversarial/prompt-injection.js';
import { BIAS_TEST_PAIRS } from './adversarial/bias-tests.js';
import { SAFETY_BOUNDARY_SCENARIOS } from './adversarial/safety-boundary.js';

// ── Constants ────────────────────────────────────────────────────

export const ADVERSARIAL_OBLIGATIONS = ['OBL-003c', 'OBL-009b'] as const;

/** Max chars to store for bias pair prompt/response previews. */
const BIAS_PROMPT_PREVIEW_LEN = 100;
const BIAS_RESPONSE_PREVIEW_LEN = 500;

// ── Types ────────────────────────────────────────────────────────

export type TestCategory = 'prompt_injection' | 'bias_detection' | 'safety_boundary';
export type TestVerdict = 'pass' | 'fail' | 'inconclusive';

export interface TestScenario {
  readonly id: string;
  readonly category: TestCategory;
  readonly name: string;
  readonly description: string;
  readonly articleRef: string;
  readonly prompt: string;
  readonly systemPrompt?: string;
  readonly evaluate: (response: string) => EvaluationResult;
}

export interface BiasTestPair {
  readonly id: string;
  readonly category: 'bias_detection';
  readonly name: string;
  readonly description: string;
  readonly articleRef: string;
  readonly promptA: string;
  readonly promptB: string;
  readonly characteristicA: string;
  readonly characteristicB: string;
  readonly systemPrompt?: string;
  readonly evaluate: (responseA: string, responseB: string) => EvaluationResult;
}

export interface TestResult {
  readonly scenarioId: string;
  readonly category: TestCategory;
  readonly name: string;
  readonly verdict: TestVerdict;
  readonly confidence: number;
  readonly prompt: string;
  readonly response: string;
  readonly matchedPatterns: readonly string[];
  readonly reasoning: string;
  readonly durationMs: number;
  readonly articleRef: string;
}

export interface CategorySummary {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly inconclusive: number;
  readonly score: number;
}

export interface AdversarialReport {
  readonly agentName: string;
  readonly timestamp: string;
  readonly duration: number;
  readonly categories: Record<TestCategory, CategorySummary>;
  readonly results: readonly TestResult[];
  readonly overallScore: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly inconclusiveCount: number;
  readonly totalTests: number;
  readonly obligationRefs: readonly string[];
}

export interface TestRunnerDeps {
  readonly callLlm: (prompt: string, systemPrompt?: string) => Promise<string>;
  readonly evidenceStore?: EvidenceStore;
  readonly auditStore?: AuditStore;
  readonly getProjectPath: () => string;
}

// ── Pure helpers ─────────────────────────────────────────────────

/** Format current timestamp for safe use in filenames. */
const fileTimestamp = (): string => new Date().toISOString().replace(/[:.]/g, '-');

interface VerdictCounts {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly inconclusive: number;
}

/** Count verdicts in a result set, optionally filtered by category. */
const countVerdicts = (results: readonly TestResult[], category?: TestCategory): VerdictCounts => {
  const filtered = category ? results.filter(r => r.category === category) : results;
  let passed = 0, failed = 0, inconclusive = 0;
  for (const r of filtered) {
    if (r.verdict === 'pass') passed++;
    else if (r.verdict === 'fail') failed++;
    else inconclusive++;
  }
  return { total: filtered.length, passed, failed, inconclusive };
};

const toCategorySummary = (counts: VerdictCounts): CategorySummary => ({
  ...counts,
  score: counts.total > 0 ? Math.round((counts.passed / counts.total) * 100) : 0,
});

type ScenarioMeta = Pick<TestScenario, 'id' | 'category' | 'name' | 'articleRef'>;

/** Build a TestResult from scenario metadata + evaluation + timing. */
const toTestResult = (
  meta: ScenarioMeta,
  evaluation: EvaluationResult,
  prompt: string,
  response: string,
  durationMs: number,
): TestResult => ({
  scenarioId: meta.id,
  category: meta.category,
  name: meta.name,
  verdict: evaluation.verdict,
  confidence: evaluation.confidence,
  prompt,
  response,
  matchedPatterns: evaluation.matchedPatterns,
  reasoning: evaluation.reasoning,
  durationMs,
  articleRef: meta.articleRef,
});

/** Build the final report from collected results. Pure function. */
export const buildReport = (
  agentName: string,
  results: readonly TestResult[],
  duration: number,
): AdversarialReport => {
  const overall = countVerdicts(results);

  return {
    agentName,
    timestamp: new Date().toISOString(),
    duration,
    categories: {
      prompt_injection: toCategorySummary(countVerdicts(results, 'prompt_injection')),
      bias_detection: toCategorySummary(countVerdicts(results, 'bias_detection')),
      safety_boundary: toCategorySummary(countVerdicts(results, 'safety_boundary')),
    },
    results,
    overallScore: overall.total > 0 ? Math.round((overall.passed / overall.total) * 100) : 0,
    passCount: overall.passed,
    failCount: overall.failed,
    inconclusiveCount: overall.inconclusive,
    totalTests: overall.total,
    obligationRefs: ADVERSARIAL_OBLIGATIONS,
  };
};

// ── I/O helpers (separated from domain logic) ────────────────────

const saveReport = async (report: AdversarialReport, projectPath: string): Promise<void> => {
  const reportsDir = join(projectPath, '.complior', 'reports');
  await mkdir(reportsDir, { recursive: true });
  const path = join(reportsDir, `adversarial-${report.agentName}-${fileTimestamp()}.json`);
  await writeFile(path, JSON.stringify(report, null, 2));
};

const recordEvidence = async (
  results: readonly TestResult[],
  evidenceStore: EvidenceStore,
): Promise<void> => {
  const items = results.map(r =>
    createEvidence(
      `adversarial-${r.scenarioId}`,
      'adversarial',
      'adversarial-test',
      { snippet: `${r.verdict}: ${r.reasoning}` },
    ),
  );
  await evidenceStore.append(items, `adversarial-${fileTimestamp()}`);
};

const recordAudit = async (
  report: AdversarialReport,
  auditStore: AuditStore,
): Promise<void> => {
  await auditStore.append('adversarial.completed', {
    totalTests: report.totalTests,
    passCount: report.passCount,
    failCount: report.failCount,
    inconclusiveCount: report.inconclusiveCount,
    overallScore: report.overallScore,
    categories: Object.fromEntries(
      Object.entries(report.categories).map(([k, v]) => [k, v.score]),
    ),
  }, report.agentName);
};

// ── Factory ──────────────────────────────────────────────────────

export const createTestRunner = (deps: TestRunnerDeps) => {
  const { callLlm, evidenceStore, auditStore, getProjectPath } = deps;

  /** Call LLM with error isolation — never throws. */
  const callLlmSafely = async (prompt: string, systemPrompt?: string): Promise<string> => {
    try {
      return await callLlm(prompt, systemPrompt);
    } catch (err) {
      return `[ERROR] LLM call failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  };

  const runScenario = async (scenario: TestScenario): Promise<TestResult> => {
    const start = Date.now();
    const response = await callLlmSafely(scenario.prompt, scenario.systemPrompt);
    const evaluation = scenario.evaluate(response);
    return toTestResult(scenario, evaluation, scenario.prompt, response, Date.now() - start);
  };

  const runBiasPair = async (pair: BiasTestPair): Promise<TestResult> => {
    const start = Date.now();
    const responseA = await callLlmSafely(pair.promptA, pair.systemPrompt);
    const responseB = await callLlmSafely(pair.promptB, pair.systemPrompt);
    const evaluation = pair.evaluate(responseA, responseB);

    const prompt = `A: ${pair.promptA.slice(0, BIAS_PROMPT_PREVIEW_LEN)}... | B: ${pair.promptB.slice(0, BIAS_PROMPT_PREVIEW_LEN)}...`;
    const response = `A: ${responseA.slice(0, BIAS_RESPONSE_PREVIEW_LEN)} | B: ${responseB.slice(0, BIAS_RESPONSE_PREVIEW_LEN)}`;
    return toTestResult(pair, evaluation, prompt, response, Date.now() - start);
  };

  const runAdversarialTests = async (
    agentName: string,
    categories?: readonly TestCategory[],
  ): Promise<AdversarialReport> => {
    const startTime = Date.now();
    const results: TestResult[] = [];
    const selected = categories ?? (['prompt_injection', 'bias_detection', 'safety_boundary'] as const);

    // Sequential execution to avoid rate limits
    if (selected.includes('prompt_injection')) {
      for (const scenario of PROMPT_INJECTION_SCENARIOS) {
        results.push(await runScenario(scenario));
      }
    }
    if (selected.includes('bias_detection')) {
      for (const pair of BIAS_TEST_PAIRS) {
        results.push(await runBiasPair(pair));
      }
    }
    if (selected.includes('safety_boundary')) {
      for (const scenario of SAFETY_BOUNDARY_SCENARIOS) {
        results.push(await runScenario(scenario));
      }
    }

    const report = buildReport(agentName, results, Date.now() - startTime);

    // I/O: persist results (fire-and-forget-safe; errors logged, not thrown)
    await saveReport(report, getProjectPath());
    if (evidenceStore) await recordEvidence(results, evidenceStore);
    if (auditStore) await recordAudit(report, auditStore);

    return Object.freeze(report);
  };

  return Object.freeze({ runAdversarialTests });
};
