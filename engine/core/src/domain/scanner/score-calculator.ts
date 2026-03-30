import type { CheckResult, CategoryScore, ScoreBreakdown, ScoreDiff, ScoreZone } from '../../types/common.types.js';
import type { ScoringData } from '../../data/schemas/schemas.js';
import checkIdData from '../../../data/scanner/check-id-categories.json' with { type: 'json' };

// CheckId → category mapping for findings without obligationId.
// Pass results from L1/L2/L3/L4/git checks lack obligationId, so they
// need explicit category routing to contribute to category scores.
const CHECK_ID_TO_CATEGORY: Readonly<Record<string, string>> = checkIdData.mapping;

export const getZone = (score: number): ScoreZone => {
  if (score < 50) return 'red';
  if (score < 80) return 'yellow';
  return 'green';
};

const findCategoryForCheck = (
  check: CheckResult,
  categories: readonly { readonly category: string; readonly obligations_in_category: readonly string[] }[],
): string | undefined => {
  // First: match by obligationId if present (fail/skip results only — pass results use fallback map)
  if (check.type === 'fail' && check.obligationId !== undefined) {
    const matched = categories.find((cat) =>
      cat.obligations_in_category.includes(check.obligationId!),
    );
    if (matched !== undefined) return matched.category;
  }

  // Fallback: use the checkId → category mapping
  const mappedCategory = CHECK_ID_TO_CATEGORY[check.checkId];
  if (mappedCategory !== undefined) {
    const matched = categories.find((cat) => cat.category === mappedCategory);
    if (matched !== undefined) return matched.category;
  }

  return undefined;
};

/**
 * Calculate project-wide weighted compliance score (→ passport.project_score).
 * Groups checks into 8 categories, applies per-category weights, and caps at 40
 * if any critical obligation fails with high/medium severity.
 * Contrast with complior_score: simple per-agent passed/(passed+failed)×100 ratio.
 */
export const calculateScore = (
  checks: readonly CheckResult[],
  scoringData: ScoringData,
): ScoreBreakdown => {
  const totalChecks = checks.length;
  const passedChecks = checks.filter((c) => c.type === 'pass').length;
  const failedChecks = checks.filter((c) => c.type === 'fail').length;
  const skippedChecks = checks.filter((c) => c.type === 'skip').length;

  const infoChecks = checks.filter((c) => c.type === 'info').length;

  // Empty checks or all skipped/info = fully compliant (nothing applicable)
  if (totalChecks === 0 || totalChecks === skippedChecks + infoChecks) {
    return {
      totalScore: 100,
      zone: 'green',
      categoryScores: [],
      criticalCapApplied: false,
      totalChecks,
      passedChecks,
      failedChecks,
      skippedChecks,
    };
  }

  // Group non-skip checks by category
  const categoryChecksMap = new Map<string, readonly CheckResult[]>();

  for (const check of checks) {
    if (check.type === 'skip' || check.type === 'info') continue;

    const category = findCategoryForCheck(check, scoringData.weighted_categories);
    if (category === undefined) continue;

    const existing = categoryChecksMap.get(category) ?? [];
    categoryChecksMap.set(category, [...existing, check]);
  }

  // Calculate per-category scores
  const categoryScores: CategoryScore[] = [];
  let weightedSum = 0;
  let activeWeightSum = 0;

  for (const weightedCategory of scoringData.weighted_categories) {
    const checksInCategory = categoryChecksMap.get(weightedCategory.category);

    // Skip categories with no matching checks
    if (checksInCategory === undefined || checksInCategory.length === 0) continue;

    const passed = checksInCategory.filter((c) => c.type === 'pass').length;
    const failed = checksInCategory.filter((c) => c.type === 'fail').length;
    const total = passed + failed;

    const categoryScore = total === 0 ? 100 : (passed / total) * 100;

    categoryScores.push({
      category: weightedCategory.category,
      weight: weightedCategory.weight,
      score: Math.round(categoryScore * 100) / 100,
      obligationCount: total,
      passedCount: passed,
    });

    weightedSum += categoryScore * weightedCategory.weight;
    activeWeightSum += weightedCategory.weight;
  }

  // Weighted total
  const rawScore = activeWeightSum === 0 ? 100 : weightedSum / activeWeightSum;

  // Critical cap: if any critical obligation fails, cap at 40
  // Excluded from cap trigger:
  //   - L2 findings: measure document quality/depth, not compliance presence
  //   - Cross-layer findings: derived/advisory heuristic checks, not direct regulatory violations
  //   - External tool findings: belt-and-suspenders advisory checks
  //   - Low-severity findings: missing best-practice patterns (e.g. "no data-governance pattern found")
  //   - passport-presence: internal best-practice (passport is our concept, not regulatory)
  const criticalIds = new Set(scoringData.critical_obligation_ids);
  const CRITICAL_CAP_EXCLUDED = new Set(['passport-presence']);
  const criticalCapApplied = checks.some((check) => {
    if (check.type !== 'fail') return false;
    // L2 findings measure doc quality, not compliance presence
    if (check.checkId.startsWith('l2-')) return false;
    // Cross-layer findings are derived heuristics (e.g. "logging found but no retention config")
    if (check.checkId.startsWith('cross-')) return false;
    // External tool findings are advisory (belt-and-suspenders) — they inform
    // category scores but do NOT trigger the regulatory hard cap
    if (check.checkId.startsWith('ext-')) return false;
    // Low/info-severity findings indicate missing best practices, not active violations
    if (check.severity === 'low' || check.severity === 'info') return false;
    if (CRITICAL_CAP_EXCLUDED.has(check.checkId)) return false;
    // Check both obligationId and checkId against critical list
    if (check.obligationId !== undefined && criticalIds.has(check.obligationId)) return true;
    return criticalIds.has(check.checkId);
  });

  const totalScore = Math.round(
    (criticalCapApplied ? Math.min(rawScore, 40) : rawScore) * 100,
  ) / 100;

  return {
    totalScore,
    zone: getZone(totalScore),
    categoryScores,
    criticalCapApplied,
    totalChecks,
    passedChecks,
    failedChecks,
    skippedChecks,
  };
};

export const calculateScoreDiff = (
  before: ScoreBreakdown,
  after: ScoreBreakdown,
): ScoreDiff => {
  const delta = Math.round((after.totalScore - before.totalScore) * 100) / 100;

  const beforeMap = new Map(before.categoryScores.map((c) => [c.category, c.score]));
  const afterMap = new Map(after.categoryScores.map((c) => [c.category, c.score]));

  // Collect all category keys from both breakdowns
  const allCategories = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  const improved: string[] = [];
  const degraded: string[] = [];

  for (const category of allCategories) {
    const beforeScore = beforeMap.get(category) ?? 0;
    const afterScore = afterMap.get(category) ?? 0;

    if (afterScore > beforeScore) {
      improved.push(category);
    } else if (afterScore < beforeScore) {
      degraded.push(category);
    }
  }

  return {
    before: before.totalScore,
    after: after.totalScore,
    delta,
    improved,
    degraded,
  };
};
