import type { Finding, Role } from '../../types/common.types.js';
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

/** Check if an obligation applies to the given project role. */
const roleApplies = (oblRole: string, projectRole: Role): boolean => {
  if (projectRole === 'both') return true;
  return oblRole === 'both' || oblRole === projectRole;
};

/** Check if an obligation applies to the given risk level (V1-M08 T-7). */
const riskApplies = (riskLevels: readonly string[], projectRisk: string | null): boolean => {
  if (!projectRisk) return true; // no profile → all apply
  if (riskLevels.includes('all')) return true;
  return riskLevels.includes(projectRisk);
};

export const buildObligationCoverage = (
  obligations: readonly ObligationRecord[],
  findings: readonly Finding[],
  projectRole: Role = 'both',
  /** V1-M08 T-7: filter obligations by risk level (from profile). */
  projectRisk: string | null = null,
  /** V1-M30: filter obligations by industry domain (e.g., healthcare, finance). */
  projectDomain: string | null = null,
): ObligationCoverage => {
  const oblToChecks = buildOblToChecks();

  /** V1-M30: Filter by industry domain BEFORE role/risk filtering to count exclusions */
  const preFiltered = projectDomain && projectDomain !== 'general'
    ? obligations.filter((obl) => {
        const domainKeywords: Record<string, readonly string[]> = {
          healthcare: ['healthcare', 'medical'],
          finance: ['finance'],
          education: ['education'],
          hr: ['hr', 'recruitment'],
          legal: ['legal'],
          'critical infra': ['critical infra'],
        };
        const oblTitle = (obl.title ?? '').toLowerCase();
        const oblArticle = (obl.article_reference ?? '').toLowerCase();
        const allowedKeywords = domainKeywords[projectDomain] ?? [projectDomain];
        return allowedKeywords.some(kw => oblTitle.includes(kw) || oblArticle.includes(kw));
      })
    : obligations;

  // Filter obligations by project role AND risk level
  const applicable = preFiltered.filter((obl) => {
    if (!roleApplies(String(obl.applies_to_role ?? 'both'), projectRole)) return false;
    if (!riskApplies(obl.applies_to_risk_level as readonly string[] ?? [], projectRisk)) return false;
    return true;
  });

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
  const details: ObligationDetail[] = applicable.map((obl) => {
    const rawId = obl.obligation_id ?? '';
    const shortId = rawId.replace(/^eu-ai-act-/i, '').toUpperCase();
    return {
      id: shortId,
      article: String(obl.article_reference ?? ''),
      title: String(obl.title ?? ''),
      role: String(obl.applies_to_role ?? 'both'),
      severity: String(obl.severity ?? 'medium'),
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
    excludedCount: obligations.length - obligations.filter(obl => { // industry exclusions only
      const domainKeywords: Record<string, readonly string[]> = {
        healthcare: ['healthcare', 'medical'],
        finance: ['finance'],
        education: ['education'],
        hr: ['hr', 'recruitment'],
        legal: ['legal'],
        'critical infra': ['critical infra'],
      };
      if (!projectDomain || projectDomain === 'general') return false;
      const oblTitle = (obl.title ?? '').toLowerCase();
      const oblArticle = (obl.article_reference ?? '').toLowerCase();
      const allowed = domainKeywords[projectDomain] ?? [projectDomain];
      return !allowed.some(kw => oblTitle.includes(kw) || oblArticle.includes(kw));
    }).length,
  };
};
