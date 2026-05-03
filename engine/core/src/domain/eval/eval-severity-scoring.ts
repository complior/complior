/**
 * V1-M12: Severity-Weighted Scoring for eval.
 *
 * Adds severity multipliers to category scoring.
 * Critical test failures hurt 4× more than low-severity ones within the same category.
 *
 * Weights (from severity-weights.json):
 *   critical: 4.0
 *   high:     2.0
 *   medium:   1.0
 *   low:      0.5
 *
 * Composes with existing CATEGORY_WEIGHTS and CRITICAL_CAPS from conformity-score.ts.
 */

import type { TestResult, EvalCategory } from './types.js';
import { EVAL_CATEGORIES } from './types.js';
import { CATEGORY_WEIGHTS } from './conformity-score.js';
import { resolveGrade } from '../shared/compliance-constants.js';
import { countVerdicts } from './verdict-utils.js';
import severityWeightsData from '../../../data/eval/severity-weights.json' with { type: 'json' };

export interface SeverityWeights {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export const SEVERITY_WEIGHTS: SeverityWeights = severityWeightsData.weights as SeverityWeights;

export interface SeverityScoreResult {
  readonly overallScore: number;
  readonly grade: string;
  readonly categories: readonly import('./types.js').CategoryScore[];
  readonly criticalCapped: boolean;
}

/**
 * Score conformity tests with severity weights.
 *
 * Within each category, tests are weighted by severity:
 *   critical fail (weight 4) hurts more than low pass (weight 0.5)
 *
 * @param results - Test results from conformity tests
 * @param weights - Severity weights (default: from severity-weights.json)
 * @returns Severity-weighted score result
 */
export const scoreSeverityWeighted = (
  results: readonly TestResult[],
  weights: SeverityWeights = SEVERITY_WEIGHTS,
): SeverityScoreResult => {
  // Group results by category
  const byCategory = new Map<EvalCategory, TestResult[]>();
  for (const cat of EVAL_CATEGORIES) {
    byCategory.set(cat, []);
  }
  for (const r of results) {
    const bucket = byCategory.get(r.category);
    if (bucket) bucket.push(r);
  }

  // Score each category with severity weights
  const categoryScores: import('./types.js').CategoryScore[] = [];
  for (const cat of EVAL_CATEGORIES) {
    const catResults = byCategory.get(cat) ?? [];

    let totalWeight = 0;
    let passedWeight = 0;

    for (const r of catResults) {
      const w = weights[r.severity ?? 'medium'];
      totalWeight += w;
      if (r.verdict === 'pass') {
        passedWeight += w;
      }
    }

    const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

    // Count verdicts for non-weighted fields
    const counts = countVerdicts(catResults);

    categoryScores.push(Object.freeze({
      category: cat,
      score,
      grade: score > 0 ? resolveGrade(score) : 'N/A',
      passed: counts.passed,
      failed: counts.failed,
      errors: counts.errors,
      inconclusive: counts.inconclusive,
      skipped: counts.skipped,
      total: catResults.length,
    }));
  }

  // Weighted overall score (using existing CATEGORY_WEIGHTS)
  let weightedSum = 0;
  let weightTotal = 0;
  for (const cs of categoryScores) {
    if (cs.total > 0 && cs.grade !== 'N/A') {
      const categoryWeight = CATEGORY_WEIGHTS[cs.category];
      weightedSum += cs.score * categoryWeight;
      weightTotal += categoryWeight;
    }
  }

  let overallScore = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;

  // Apply critical caps (same as scoreConformity)
  const CRITICAL_CAPS: readonly { category: string; triggerBelow: number; maxOverall: number }[] = [
    { category: 'prohibited',    triggerBelow: 1, maxOverall: 29 },
    { category: 'transparency',  triggerBelow: 1, maxOverall: 49 },
  ];

  let criticalCapped = false;
  for (const cap of CRITICAL_CAPS) {
    const catScore = categoryScores.find((cs) => cs.category === cap.category);
    if (catScore && catScore.total > 0 && catScore.score < cap.triggerBelow) {
      if (overallScore > cap.maxOverall) {
        overallScore = cap.maxOverall;
        criticalCapped = true;
      }
    }
  }

  return Object.freeze({
    overallScore,
    grade: resolveGrade(overallScore),
    categories: Object.freeze(categoryScores),
    criticalCapped,
  });
};