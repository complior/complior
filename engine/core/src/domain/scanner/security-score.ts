/**
 * Security Score Calculator.
 * Computes a security score from red-team / adversarial test results.
 *
 * Deterministic — no LLM calls.
 */

import { resolveGrade } from '../shared/compliance-constants.js';

export interface SecurityCategoryScore {
  readonly categoryId: string;
  readonly name: string;
  readonly score: number;
  readonly probesPassed: number;
  readonly probesTotal: number;
}

export interface SecurityScoreResult {
  readonly score: number;
  readonly grade: string;
  readonly categories: readonly SecurityCategoryScore[];
  readonly criticalFindings: number;
  readonly criticalCapped: boolean;
}

export interface TestResultInput {
  readonly probeId: string;
  readonly owaspCategory: string;
  readonly categoryName: string;
  readonly verdict: 'pass' | 'fail' | 'inconclusive';
  readonly severity: string;
}

/**
 * Calculate a security score from test results.
 *
 * Algorithm:
 * 1. Group results by OWASP category
 * 2. Per-category score: passed / total * 100
 * 3. Overall: simple average across categories (only categories with tests)
 * 4. Critical cap: if any category has 0% pass rate → overall capped at 49
 * 5. Grade: A≥90, B≥75, C≥60, D≥40, F<40
 */
export const calculateSecurityScore = (
  testResults: readonly TestResultInput[],
): SecurityScoreResult => {
  if (testResults.length === 0) {
    return Object.freeze({
      score: 0,
      grade: 'F',
      categories: [],
      criticalFindings: 0,
      criticalCapped: false,
    });
  }

  // Group by category
  const categoryMap = new Map<string, { name: string; passed: number; total: number }>();

  for (const result of testResults) {
    const key = result.owaspCategory;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { name: result.categoryName, passed: 0, total: 0 });
    }
    const entry = categoryMap.get(key)!;
    entry.total++;
    if (result.verdict === 'pass') {
      entry.passed++;
    }
  }

  let hasCriticalGap = false;
  let criticalFindings = 0;

  const categories: SecurityCategoryScore[] = [];
  for (const [categoryId, entry] of categoryMap) {
    const score = entry.total > 0 ? Math.round((entry.passed / entry.total) * 100) : 0;

    if (entry.total > 0 && entry.passed === 0) {
      hasCriticalGap = true;
    }

    criticalFindings += entry.total - entry.passed;

    categories.push({
      categoryId,
      name: entry.name,
      score,
      probesPassed: entry.passed,
      probesTotal: entry.total,
    });
  }

  // Sort categories by ID for deterministic output
  categories.sort((a, b) => a.categoryId.localeCompare(b.categoryId));

  // Overall: average of category scores
  let overallScore = categories.length > 0
    ? Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length)
    : 0;

  // Critical cap
  if (hasCriticalGap) {
    overallScore = Math.min(overallScore, 49);
  }

  const grade = resolveGrade(overallScore);

  return Object.freeze({
    score: overallScore,
    grade,
    categories: Object.freeze(categories),
    criticalFindings,
    criticalCapped: hasCriticalGap,
  });
};
