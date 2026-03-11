/**
 * AIUC-1 Framework Adapter — wraps existing computeReadiness results.
 * Calls computeReadiness(input) and maps ReadinessResult → FrameworkScoreResult.
 */

import type {
  ComplianceFramework,
  FoundationMetrics,
  FrameworkCategory,
  FrameworkCategoryScore,
  FrameworkCheck,
  FrameworkScoreResult,
} from '../../types/framework.types.js';
import { AIUC1_REQUIREMENTS, AIUC1_CATEGORIES } from '../certification/aiuc1-requirements.js';
import type { Aiuc1Category } from '../certification/aiuc1-requirements.js';
import { computeReadiness } from '../certification/aiuc1-readiness.js';

const LEVEL_THRESHOLDS = [
  { minScore: 90, grade: 'Level 4' },
  { minScore: 70, grade: 'Level 3' },
  { minScore: 40, grade: 'Level 2' },
  { minScore: 0, grade: 'Level 1' },
] as const;

export const createAiuc1Framework = (): ComplianceFramework => {
  const categories: FrameworkCategory[] = (
    Object.entries(AIUC1_CATEGORIES) as [Aiuc1Category, { label: string; weight: number }][]
  ).map(([id, info]) => ({
    id,
    name: info.label,
    weight: info.weight,
  }));

  const checks: FrameworkCheck[] = AIUC1_REQUIREMENTS.flatMap((req) =>
    req.checks.map((check, idx) => ({
      id: `${req.id}-${idx}`,
      name: check.description,
      source: check.type,
      target: check.target,
      categoryId: req.category,
      weight: req.weight / req.checks.length,
      description: check.description,
    })),
  );

  return Object.freeze({
    id: 'aiuc-1',
    name: 'AIUC-1 Readiness',
    version: '1.0',
    checks,
    categories,
    gradeMapping: {
      type: 'level',
      thresholds: LEVEL_THRESHOLDS,
    },
  });
};

export const scoreAiuc1 = (
  fw: ComplianceFramework,
  metrics: FoundationMetrics,
): FrameworkScoreResult => {
  if (!metrics.passport) {
    return Object.freeze({
      frameworkId: fw.id,
      frameworkName: fw.name,
      score: 0,
      grade: 'Level 1',
      gradeType: 'level' as const,
      gaps: fw.checks.length,
      totalChecks: fw.checks.length,
      passedChecks: 0,
      categories: [],
    });
  }

  const readiness = computeReadiness({
    passport: metrics.passport,
    scanResult: metrics.scanResult,
    documents: metrics.documents,
    evidenceSummary: {
      totalEntries: metrics.evidenceEntryCount,
      scanCount: metrics.evidenceScanCount,
      firstEntry: '',
      lastEntry: '',
      chainValid: metrics.evidenceChainValid,
      uniqueFindings: 0,
    },
  });

  const grade =
    LEVEL_THRESHOLDS.find((t) => readiness.overallScore >= t.minScore)?.grade ?? 'Level 1';

  // Count passed/total from requirement statuses grouped by category
  const catCounts = new Map<string, { passed: number; total: number }>();
  for (const req of readiness.requirements) {
    const entry = catCounts.get(req.category) ?? { passed: 0, total: 0 };
    entry.total++;
    if (req.status === 'met') entry.passed++;
    catCounts.set(req.category, entry);
  }

  const categories: FrameworkCategoryScore[] = readiness.categories.map((cat) => {
    const counts = catCounts.get(cat.category) ?? { passed: 0, total: 0 };
    return {
      categoryId: cat.category,
      categoryName: cat.label,
      score: cat.score,
      weight: AIUC1_CATEGORIES[cat.category].weight,
      passedChecks: counts.passed,
      totalChecks: counts.total,
    };
  });

  return Object.freeze({
    frameworkId: fw.id,
    frameworkName: fw.name,
    score: readiness.overallScore,
    grade,
    gradeType: 'level' as const,
    gaps: readiness.gaps.length,
    totalChecks: readiness.totalRequirements,
    passedChecks: readiness.metRequirements,
    categories,
  });
};
