import type { Finding } from '../../types/common.types.js';
import type { ObligationCoverage, ObligationDetail, ArticleCoverage } from './types.js';
import { CHECK_TO_OBLIGATIONS, buildOblToChecks } from '../../data/check-to-obligations.js';

export interface ObligationRecord {
  readonly obligation_id: string;
  readonly article_reference: string;
  readonly title: string;
  readonly applies_to_role: string;
  readonly severity: string;
  readonly deadline?: string;
  readonly [key: string]: unknown;
}

export const buildObligationCoverage = (
  obligations: readonly ObligationRecord[],
  findings: readonly Finding[],
): ObligationCoverage => {
  const oblToChecks = buildOblToChecks();

  // Build set of covered obligation IDs from passing checks
  const coveredIds = new Set<string>();
  for (const finding of findings) {
    if (finding.type === 'pass') {
      const oblIds = CHECK_TO_OBLIGATIONS[finding.checkId];
      if (oblIds) {
        for (const id of oblIds) coveredIds.add(id);
      }
    }
  }

  // Map obligations to detail objects
  const details: ObligationDetail[] = obligations.map((obl) => {
    const rawId = obl.obligation_id ?? '';
    const shortId = rawId.replace(/^eu-ai-act-/i, '').toUpperCase();
    return {
      id: shortId,
      article: (obl.article_reference as string) ?? '',
      title: (obl.title as string) ?? '',
      role: (obl.applies_to_role as string) ?? 'both',
      severity: (obl.severity as string) ?? 'medium',
      deadline: (obl.deadline as string) ?? null,
      covered: coveredIds.has(shortId),
      linkedChecks: oblToChecks.get(shortId) ?? [],
    };
  });

  // Group by article
  const articleMap = new Map<string, ObligationDetail[]>();
  for (const d of details) {
    const art = d.article || 'Unknown';
    const list = articleMap.get(art) ?? [];
    list.push(d);
    articleMap.set(art, list);
  }

  const byArticle: ArticleCoverage[] = [...articleMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([article, obls]) => ({
      article,
      total: obls.length,
      covered: obls.filter((o) => o.covered).length,
      obligations: obls,
    }));

  const total = details.length;
  const covered = details.filter((d) => d.covered).length;
  const uncovered = total - covered;

  // Critical uncovered = high/critical severity + uncovered
  const critical = details.filter(
    (d) => !d.covered && (d.severity === 'critical' || d.severity === 'high'),
  );

  return {
    total,
    covered,
    uncovered,
    coveragePercent: total > 0 ? Math.round((covered / total) * 100) : 0,
    byArticle,
    critical,
  };
};
