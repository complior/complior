/**
 * V1-M18 T-5: Domain Filter
 *
 * Filters scanner findings by project industry domain.
 * Uses check-applicability.json for domain→checkId overrides.
 * Conservative default: checks with NO domain mapping apply to ALL domains.
 *
 * Pattern mirrors role-filter.ts and risk-level-filter.ts:
 * findings for inapplicable domains become type: 'skip' (visible but not scored).
 */
import type { Finding } from '../../types/common.types.js';
import applicabilityData from '../../../data/scanner/check-applicability.json' with { type: 'json' };

const data = applicabilityData as {
  version: string;
  defaults: { roles: string[]; riskLevels: string[]; domains: string[] };
  overrides: Readonly<Record<string, { roles?: string[]; domains?: string[]; riskLevels?: string[] }>>;
};

/** Get applicable domains for a checkId. Unlisted → all domains (conservative default). */
const getCheckDomains = (checkId: string): readonly string[] => {
  const override = data.overrides[checkId];
  if (!override) return data.defaults.domains; // empty = all domains
  return override.domains ?? data.defaults.domains;
};

/**
 * Check if an checkId applies to the given domain.
 * If checkId has no domain restriction → applies to all.
 * If project domain is in the check's domain list → applies.
 */
const domainApplies = (checkDomains: readonly string[], projectDomain: string): boolean => {
  // Empty = applies to ALL domains (conservative default from data.defaults.domains)
  if (checkDomains.length === 0) return true;
  return checkDomains.includes(projectDomain);
};

/**
 * Filter findings by project industry domain.
 *
 * Logic:
 * 1. If projectDomain is null → no filtering, return unchanged (backward compat)
 * 2. For each finding, look up domain restriction from check-applicability.json
 * 3. If check's domains don't include projectDomain → skip
 * 4. If check has no domain mapping → pass through (conservative default)
 *
 * Mirrors role-filter.ts: findings become type: 'skip' so they are visible but not scored.
 */
export const filterFindingsByDomain = (
  findings: readonly Finding[],
  projectDomain: string | null,
): readonly Finding[] => {
  // No filtering when domain is unknown (no profile) — backward compatible
  if (projectDomain === null) return findings;

  let changed = false;
  const result = findings.map((f) => {
    const checkDomains = getCheckDomains(f.checkId);

    // If check has no domain restriction → pass through unchanged
    if (checkDomains.length === 0) return f;

    // Skip if project domain does NOT apply to this check
    if (!domainApplies(checkDomains, projectDomain)) {
      changed = true;
      return {
        ...f,
        type: 'skip' as const,
        message: `Skipped: not applicable for ${projectDomain} domain (check requires: ${checkDomains.join(', ')})`,
      };
    }

    return f;
  });

  // Same-reference optimization: return original array when nothing changed
  return changed ? Object.freeze(result) : findings;
};
