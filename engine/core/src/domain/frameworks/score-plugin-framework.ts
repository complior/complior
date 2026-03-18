/**
 * Generic scoring helper for plugin-based security frameworks (OWASP, MITRE).
 * Eliminates duplication between owasp-llm-framework.ts and mitre-atlas-framework.ts.
 */

import type { FrameworkCategoryScore, FrameworkScoreResult, FoundationMetrics, ComplianceFramework } from '../../types/framework.types.js';
import { resolveGrade } from '../shared/compliance-constants.js';

export interface PluginCategory {
  readonly id: string;
  readonly name: string;
  readonly plugins: readonly string[];
}

export interface ScorePluginFrameworkOptions {
  /** Match predicate suffix for checkId (e.g., 'security-{suffix}'). */
  readonly matchPrefix: (cat: PluginCategory) => string;
  /** Cap overall score at 49 if any category has 0% pass rate. */
  readonly applyCriticalCap: boolean;
}

/**
 * Score a plugin-based framework against scan findings.
 * Groups findings by category using plugin-name matching, then computes per-category and overall scores.
 */
export const scorePluginFramework = (
  fw: ComplianceFramework,
  metrics: FoundationMetrics,
  dataCategories: readonly PluginCategory[],
  opts: ScorePluginFrameworkOptions,
): FrameworkScoreResult => {
  const scan = metrics.scanResult;

  if (!scan) {
    return Object.freeze({
      frameworkId: fw.id,
      frameworkName: fw.name,
      score: 0,
      grade: 'F',
      gradeType: 'letter' as const,
      gaps: 0,
      totalChecks: 0,
      passedChecks: 0,
      categories: [],
    });
  }

  const categoryResults = new Map<string, { passed: number; total: number }>();
  for (const cat of dataCategories) {
    categoryResults.set(cat.id, { passed: 0, total: 0 });
  }

  for (const finding of scan.findings) {
    const checkId = finding.checkId;
    for (const cat of dataCategories) {
      const prefix = opts.matchPrefix(cat);
      const isMatch = cat.plugins.some((plugin) =>
        checkId.includes(plugin) || checkId.startsWith(`security-${prefix}`),
      );
      if (isMatch) {
        const entry = categoryResults.get(cat.id)!;
        entry.total++;
        if (finding.type === 'pass') {
          entry.passed++;
        }
      }
    }
  }

  let totalPassed = 0;
  let totalChecks = 0;
  let hasCriticalGap = false;

  const categories: FrameworkCategoryScore[] = dataCategories.map((cat) => {
    const entry = categoryResults.get(cat.id)!;
    const score = entry.total > 0 ? (entry.passed / entry.total) * 100 : 0;

    if (opts.applyCriticalCap && entry.total > 0 && entry.passed === 0) {
      hasCriticalGap = true;
    }

    totalPassed += entry.passed;
    totalChecks += entry.total;

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      score: Math.round(score),
      weight: 1,
      passedChecks: entry.passed,
      totalChecks: entry.total,
    };
  });

  const categoriesWithChecks = categories.filter((c) => c.totalChecks > 0);
  let overallScore = categoriesWithChecks.length > 0
    ? categoriesWithChecks.reduce((sum, c) => sum + c.score, 0) / categoriesWithChecks.length
    : 0;

  if (hasCriticalGap) {
    overallScore = Math.min(overallScore, 49);
  }

  overallScore = Math.round(overallScore);

  return Object.freeze({
    frameworkId: fw.id,
    frameworkName: fw.name,
    score: overallScore,
    grade: resolveGrade(overallScore),
    gradeType: 'letter' as const,
    gaps: totalChecks - totalPassed,
    totalChecks,
    passedChecks: totalPassed,
    categories,
  });
};
