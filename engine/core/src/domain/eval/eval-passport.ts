/**
 * Eval Passport — updates passport compliance block with eval results.
 *
 * After an eval run completes, this module enriches the passport's
 * compliance section with eval score, grade, and category breakdown.
 */

import type { EvalResult } from './types.js';

/** Eval data to be written into the passport compliance block. */
export interface PassportEvalBlock {
  readonly eval_score: number;
  readonly eval_grade: string;
  readonly eval_tier: string;
  readonly eval_target: string;
  readonly eval_date: string;
  readonly eval_tests_total: number;
  readonly eval_tests_passed: number;
  readonly eval_tests_failed: number;
  readonly eval_critical_capped: boolean;
  readonly eval_security_score?: number;
  readonly eval_security_grade?: string;
  readonly eval_categories: readonly {
    readonly category: string;
    readonly score: number;
    readonly grade: string;
  }[];
}

/**
 * Build passport eval block from an EvalResult.
 */
export const buildPassportEvalBlock = (result: EvalResult): PassportEvalBlock =>
  Object.freeze({
    eval_score: result.overallScore,
    eval_grade: result.grade,
    eval_tier: result.tier,
    eval_target: result.target,
    eval_date: result.timestamp,
    eval_tests_total: result.totalTests,
    eval_tests_passed: result.passed,
    eval_tests_failed: result.failed,
    eval_critical_capped: result.criticalCapped,
    eval_security_score: result.securityScore,
    eval_security_grade: result.securityGrade,
    eval_categories: Object.freeze(
      result.categories.map((c) =>
        Object.freeze({ category: c.category, score: c.score, grade: c.grade }),
      ),
    ),
  });

/**
 * Merge eval data into an existing passport JSON (mutable clone).
 *
 * Adds `compliance.eval` block without touching other passport fields.
 * Returns a NEW object — does not mutate input.
 */
export const mergeEvalIntoPassport = (
  passport: Record<string, unknown>,
  evalBlock: PassportEvalBlock,
): Record<string, unknown> => {
  const compliance = (passport.compliance ?? {}) as Record<string, unknown>;
  return {
    ...passport,
    compliance: {
      ...compliance,
      eval: evalBlock,
    },
    updated: new Date().toISOString(),
  };
};
