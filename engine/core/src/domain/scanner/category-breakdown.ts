/**
 * V1-M10 T-2: Category Breakdown Generator
 *
 * Transforms ScoreBreakdown.categoryScores into enriched CategoryBreakdown[]
 * with impact levels, top failures, and human-readable explanations.
 */
import type { CategoryBreakdown, CategoryScore, Finding, ScoreBreakdown } from '../../types/common.types.js';
import checkIdData from '../../../data/scanner/check-id-categories.json' with { type: 'json' };

// CheckId → category mapping (mirrors score-calculator.ts approach)
const CHECK_ID_TO_CATEGORY: Readonly<Record<string, string>> = checkIdData.mapping;

/**
 * Determine impact level based on category score.
 * Lowest-scoring categories get 'high' impact (most urgent to address).
 */
const computeImpact = (
  score: number,
  allScores: readonly CategoryScore[],
): 'high' | 'medium' | 'low' => {
  if (allScores.length === 0) return 'low';
  if (allScores.length === 1) return 'low';
  if (allScores.length === 2) {
    return score <= Math.min(allScores[0]!.score, allScores[1]!.score) ? 'high' : 'low';
  }

  // Sort scores ascending; bottom third → high, middle third → medium, top third → low
  const sorted = [...allScores].sort((a, b) => a.score - b.score);
  const third = Math.ceil(sorted.length / 3);
  const rank = sorted.findIndex((s) => s.score === score);

  if (rank < third) return 'high';
  if (rank < third * 2) return 'medium';
  return 'low';
};

/**
 * Build per-category breakdown from score results and findings.
 *
 * @param score    — the scan score breakdown containing categoryScores[]
 * @param findings — all scan findings (used to populate topFailures per category)
 */
export function buildCategoryBreakdown(
  score: ScoreBreakdown,
  findings: readonly Finding[],
): CategoryBreakdown[] {
  if (score.categoryScores.length === 0) return [];

  // Assign impact levels across all categories
  const withImpact: Array<CategoryScore & { impact: 'high' | 'medium' | 'low' }> = score.categoryScores.map(
    (cs: CategoryScore) => ({
      ...cs,
      impact: computeImpact(cs.score, score.categoryScores),
    }),
  );

  // Group failing findings by category
  const failingByCategory = new Map<string, Finding[]>();
  for (const finding of findings) {
    if (finding.type !== 'fail') continue;

    // Route finding to category via checkId mapping
    const category: string | undefined = CHECK_ID_TO_CATEGORY[finding.checkId];
    if (category === undefined) continue;

    const existing = failingByCategory.get(category) ?? [];
    failingByCategory.set(category, [...existing, finding]);
  }

  // Build output
  const result: CategoryBreakdown[] = withImpact.map((cs) => {
    const failures = failingByCategory.get(cs.category) ?? [];
    const total = cs.passedCount + (cs.obligationCount - cs.passedCount);
    const failed = total - cs.passedCount;

    // Top up to 3 failures, sorted by severity
    const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    const topFailures = [...failures]
      .sort((a, b) => (sevOrder[a.severity] ?? 5) - (sevOrder[b.severity] ?? 5))
      .slice(0, 3)
      .map((f: Finding) => f.checkId);

    const explanation =
      `${cs.passedCount} of ${cs.obligationCount} obligations in this category are met.`;

    return Object.freeze({
      category: cs.category,
      score: cs.score,
      weight: cs.weight,
      passed: cs.passedCount,
      failed,
      impact: cs.impact,
      topFailures,
      explanation,
    });
  });

  // Sort: high impact first, then medium, then low; within same impact, lowest score first
  const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const mutable: CategoryBreakdown[] = [...result];
  mutable.sort((a, b) => {
    const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
    if (impactDiff !== 0) return impactDiff;
    return a.score - b.score; // lowest score first within same impact
  });
  return Object.freeze(mutable) as CategoryBreakdown[];
}
