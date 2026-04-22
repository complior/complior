/**
 * Shared accessor for check-applicability.json data.
 *
 * Used by:
 *  - domain-filter.ts (V1-M18) — scanner domain filtering
 *  - fix-profile-filter.ts (V1-M19) — fix plan domain filtering
 *
 * Single source of truth for getCheckDomains() and domainApplies() helpers.
 */
import applicabilityData from '../../../data/scanner/check-applicability.json' with { type: 'json' };

export const data = applicabilityData as {
  readonly version: string;
  readonly defaults: { readonly roles: string[]; readonly riskLevels: string[]; readonly domains: string[] };
  readonly overrides: Readonly<Record<string, { roles?: string[]; domains?: string[]; riskLevels?: string[] }>>;
};

/** Get applicable domains for a checkId. Unlisted check → empty array = all domains (conservative default). */
export const getCheckDomains = (checkId: string): readonly string[] => {
  const override = data.overrides[checkId];
  if (!override) return data.defaults.domains; // empty = all domains
  return override.domains ?? data.defaults.domains;
};

/**
 * Check if a checkId applies to the given project domain.
 * Empty domain list → applies to ALL domains (conservative default).
 * Non-empty → project domain must be in the list.
 */
export const domainApplies = (checkDomains: readonly string[], projectDomain: string): boolean => {
  if (checkDomains.length === 0) return true;
  return checkDomains.includes(projectDomain);
};
