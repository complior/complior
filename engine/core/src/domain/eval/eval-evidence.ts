/**
 * Eval Evidence Bridge — records eval results into the evidence chain.
 *
 * Translates EvalResult into Evidence entries compatible with the
 * existing EvidenceStore (domain/scanner/evidence-store.ts).
 */

import type { EvalResult, TestResult } from './types.js';
import { countVerdicts } from './verdict-utils.js';

/** Evidence type matching the scanner's Evidence interface. */
interface EvalEvidence {
  readonly type: 'eval';
  readonly checkId: string;
  readonly data: Record<string, unknown>;
}

/**
 * Convert an EvalResult to evidence entries for the evidence chain.
 *
 * Creates one entry per test result + a summary entry.
 */
export const evalResultToEvidence = (result: EvalResult): readonly EvalEvidence[] => {
  const entries: EvalEvidence[] = [];

  // Individual test results
  for (const r of result.results) {
    entries.push({
      type: 'eval',
      checkId: r.testId,
      data: {
        verdict: r.verdict,
        score: r.score,
        category: r.category,
        confidence: r.confidence,
        method: r.method,
      },
    });
  }

  // Summary entry
  entries.push({
    type: 'eval',
    checkId: 'eval-summary',
    data: {
      target: result.target,
      tier: result.tier,
      overallScore: result.overallScore,
      grade: result.grade,
      totalTests: result.totalTests,
      passed: result.passed,
      failed: result.failed,
      errors: result.errors,
      securityScore: result.securityScore,
      securityGrade: result.securityGrade,
      criticalCapped: result.criticalCapped,
      duration: result.duration,
      timestamp: result.timestamp,
      agent: result.agent,
    },
  });

  return Object.freeze(entries);
};

/**
 * Calculate a hash of an eval result for evidence verification.
 */
export const evalResultHash = (result: EvalResult): string => {
  const summary = {
    target: result.target,
    tier: result.tier,
    overallScore: result.overallScore,
    totalTests: result.totalTests,
    passed: result.passed,
    failed: result.failed,
    timestamp: result.timestamp,
  };
  return JSON.stringify(summary);
};

/**
 * Summarize test results for compact evidence storage.
 */
export const summarizeTestResults = (
  results: readonly TestResult[],
): {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly errors: number;
  readonly categories: readonly string[];
} => {
  const categories = [...new Set(results.map((r) => r.category))];
  const counts = countVerdicts(results);
  return Object.freeze({
    total: results.length,
    passed: counts.passed,
    failed: counts.failed,
    errors: counts.errors,
    categories,
  });
};
