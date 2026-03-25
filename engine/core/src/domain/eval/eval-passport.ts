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
  readonly eval_critical_gaps: readonly string[];
  readonly eval_category_pass_rates: Readonly<Record<string, number>>;
  readonly eval_categories: readonly {
    readonly category: string;
    readonly score: number;
    readonly grade: string;
  }[];
}

/**
 * Build passport eval block from an EvalResult.
 */
export const buildPassportEvalBlock = (result: EvalResult): PassportEvalBlock => {
  // critical_gaps: categories with grade F or score < 40
  const critical_gaps = result.categories
    .filter((c) => c.grade === 'F' || c.score < 40)
    .map((c) => c.category);

  // category_pass_rates: { ct_1: 0.85, ct_2: 0.72, ... }
  const category_pass_rates: Record<string, number> = {};
  for (const c of result.categories) {
    const key = c.category.replace(/-/g, '_');
    category_pass_rates[key] = Math.round((c.score / 100) * 100) / 100;
  }

  return Object.freeze({
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
    eval_critical_gaps: Object.freeze(critical_gaps),
    eval_category_pass_rates: Object.freeze(category_pass_rates),
    eval_categories: Object.freeze(
      result.categories.map((c) =>
        Object.freeze({ category: c.category, score: c.score, grade: c.grade }),
      ),
    ),
  });
};

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
  return Object.freeze({
    ...passport,
    compliance: Object.freeze({
      ...compliance,
      eval: evalBlock,
    }),
    updated: new Date().toISOString(),
  });
};
