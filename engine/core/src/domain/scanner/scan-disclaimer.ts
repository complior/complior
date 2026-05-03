// V1-M22 / B-2: Scan disclaimer builder (mirrors eval-disclaimer.ts pattern)
// Pure function — deterministic, Object.freeze on result

export interface FilterContext {
  readonly role: string;
  readonly riskLevel: string;
  readonly domain: string;
  readonly profileFound: boolean;
  readonly totalTests: number;
  readonly applicableTests: number;
  readonly skippedByRole: number;
  readonly skippedByRiskLevel: number;
  readonly skippedByDomain: number;
}

export interface Disclaimer {
  readonly summary: string;
  readonly limitations: readonly string[];
  readonly confidenceLevel: string;
}

/**
 * Build a disclaimer for scan results, similar to eval disclaimer.
 * Scan scope covers static code analysis (file presence, document structure,
 * dependencies, code patterns). It does NOT evaluate runtime behavior.
 */
export const buildScanDisclaimer = (filterContext: FilterContext): Disclaimer => {
  const limitations: string[] = [];

  if (!filterContext.profileFound) {
    limitations.push('No project profile found — results are based on default scan settings');
  }

  if (filterContext.skippedByRole > 0) {
    limitations.push(`${filterContext.skippedByRole} checks skipped (role-based filtering)`);
  }

  if (filterContext.skippedByRiskLevel > 0) {
    limitations.push(`${filterContext.skippedByRiskLevel} checks skipped (risk-level-based filtering)`);
  }

  if (filterContext.skippedByDomain > 0) {
    limitations.push(`${filterContext.skippedByDomain} checks skipped (industry-domain-based filtering)`);
  }

  const coverage = filterContext.totalTests > 0
    ? Math.round((filterContext.applicableTests / filterContext.totalTests) * 100)
    : 0;

  const summary = `Static compliance scan for ${filterContext.role} / ${filterContext.riskLevel} risk / ${filterContext.domain} domain. ${coverage}% of tests applicable to this profile. This is automated scanning, not legal certification.`;

  return Object.freeze({
    summary,
    limitations: Object.freeze(limitations),
    confidenceLevel: coverage >= 70 ? 'high' : coverage >= 40 ? 'medium' : 'low',
  });
};