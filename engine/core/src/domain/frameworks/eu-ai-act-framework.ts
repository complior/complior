/**
 * EU AI Act Framework Adapter — wraps existing calculateScore results.
 * Does NOT re-run calculateScore; reads metrics.scanResult.score directly.
 */

import type { ScoringData, WeightedCategory } from '../../data/schemas.js';
import type {
  ComplianceFramework,
  FoundationMetrics,
  FrameworkCategory,
  FrameworkCategoryScore,
  FrameworkCheck,
  FrameworkScoreResult,
} from '../../types/framework.types.js';
import { EU_AI_ACT_DEADLINE_ISO } from '../shared/compliance-constants.js';

const GRADE_THRESHOLDS = [
  { minScore: 90, grade: 'A' },
  { minScore: 75, grade: 'B' },
  { minScore: 60, grade: 'C' },
  { minScore: 40, grade: 'D' },
  { minScore: 0, grade: 'F' },
] as const;

export const createEuAiActFramework = (
  scoringData: ScoringData | undefined,
): ComplianceFramework => {
  const categories: FrameworkCategory[] = (scoringData?.weighted_categories ?? []).map(
    (wc: WeightedCategory) => ({
      id: wc.category,
      name: wc.category,
      weight: wc.weight,
    }),
  );

  const checks: FrameworkCheck[] = (scoringData?.weighted_categories ?? []).flatMap(
    (wc: WeightedCategory) =>
      wc.obligations_in_category.map((oblId) => ({
        id: oblId,
        name: oblId,
        source: 'scan_check' as const,
        target: oblId,
        categoryId: wc.category,
        weight: 1,
        description: `EU AI Act obligation ${oblId}`,
      })),
  );

  return Object.freeze({
    id: 'eu-ai-act',
    name: 'EU AI Act',
    version: '2024/1689',
    deadline: EU_AI_ACT_DEADLINE_ISO,
    checks,
    categories,
    gradeMapping: {
      type: 'letter',
      thresholds: GRADE_THRESHOLDS,
    },
  });
};

export const scoreEuAiAct = (
  fw: ComplianceFramework,
  metrics: FoundationMetrics,
): FrameworkScoreResult => {
  const scanScore = metrics.scanResult?.score;

  if (!scanScore) {
    return Object.freeze({
      frameworkId: fw.id,
      frameworkName: fw.name,
      score: 0,
      grade: 'F',
      gradeType: 'letter' as const,
      gaps: 0,
      totalChecks: 0,
      passedChecks: 0,
      deadline: fw.deadline,
      categories: [],
    });
  }

  const grade =
    GRADE_THRESHOLDS.find((t) => scanScore.totalScore >= t.minScore)?.grade ?? 'F';

  const categories: FrameworkCategoryScore[] = scanScore.categoryScores.map((cs) => ({
    categoryId: cs.category,
    categoryName: cs.category,
    score: cs.score,
    weight: cs.weight,
    passedChecks: cs.passedCount,
    totalChecks: cs.obligationCount,
  }));

  return Object.freeze({
    frameworkId: fw.id,
    frameworkName: fw.name,
    score: scanScore.totalScore,
    grade,
    gradeType: 'letter' as const,
    gaps: scanScore.failedChecks,
    totalChecks: scanScore.totalChecks,
    passedChecks: scanScore.passedChecks,
    deadline: fw.deadline,
    categories,
  });
};
