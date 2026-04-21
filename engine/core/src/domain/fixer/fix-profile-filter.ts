/**
 * V1-M19 T-4: Fix Profile Filter
 *
 * Filters fix plans by project profile so only profile-relevant fixes appear.
 * Two mechanisms:
 *  1. Primary: exclude plans whose associated finding is type: 'skip' (from scan filtering)
 *  2. Secondary: for direct calls without prior scan, use check-applicability.json
 *     (future — not in MVP; direct domain check implemented here)
 *
 * Conservative: plans without mapping pass through unchanged.
 * No profile → all plans pass through (backward compatible).
 */
import type { FixPlan } from './types.js';
import type { Finding, Role } from '../../types/common.types.js';
import applicabilityData from '../../../data/scanner/check-applicability.json' with { type: 'json' };

export type FixFilterProfile = {
  readonly role: Role;
  readonly riskLevel: string | null;
  readonly domain: string | null;
};

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
 */
const domainApplies = (checkDomains: readonly string[], projectDomain: string): boolean => {
  if (checkDomains.length === 0) return true;
  return checkDomains.includes(projectDomain);
};

/** Build lookup: checkId → finding.type for O(1) filtering. */
const buildFindingMap = (findings: readonly Finding[]): Map<string, 'pass' | 'fail' | 'skip' | 'info'> => {
  const map = new Map<string, 'pass' | 'fail' | 'skip' | 'info'>();
  for (const f of findings) map.set(f.checkId, f.type);
  return map;
};

/**
 * Filter fix plans by project profile.
 *
 * Mechanism 1 (primary — used when scan results are available):
 *   Match plan.checkId → finding in findings[]. If finding.type === 'skip' → exclude plan.
 *   This handles role-skipped AND domain-skipped findings from scan pipeline.
 *
 * Mechanism 2 (secondary — used for direct fix calls without prior scan):
 *   Use check-applicability.json to check if checkId domain applies to project domain.
 *
 * Conservative default: if no profile provided, all plans pass through.
 */
export const filterFixPlansByProfile = (
  plans: readonly FixPlan[],
  findings: readonly Finding[],
  profile: FixFilterProfile | null,
): { readonly filtered: readonly FixPlan[]; readonly context: FixFilterContext } => {

  // Backward compatible: no profile → all plans pass through
  if (!profile) {
    const context: FixFilterContext = {
      role: 'both',
      riskLevel: null,
      domain: null,
      profileFound: false,
      totalPlans: plans.length,
      applicablePlans: plans.length,
      excludedBySkip: 0,
      excludedByDomain: 0,
    };
    return { filtered: plans, context };
  }

  const findingMap = buildFindingMap(findings);
  const filtered: FixPlan[] = [];
  let excludedBySkip = 0;
  let excludedByDomain = 0;

  for (const plan of plans) {
    const findingType = findingMap.get(plan.checkId);

    if (findingType === 'skip') {
      // Mechanism 1: finding already skipped by scan pipeline → exclude
      excludedBySkip++;
      continue;
    }

    // Mechanism 2: direct domain check (no prior scan) — only when no findings provided
    if (findings.length === 0 && profile.domain !== null) {
      const checkDomains = getCheckDomains(plan.checkId);
      if (checkDomains.length > 0 && !domainApplies(checkDomains, profile.domain)) {
        excludedByDomain++;
        continue;
      }
    }

    filtered.push(plan);
  }

  const context: FixFilterContext = {
    role: profile.role,
    riskLevel: profile.riskLevel,
    domain: profile.domain,
    profileFound: true,
    totalPlans: plans.length,
    applicablePlans: filtered.length,
    excludedBySkip,
    excludedByDomain,
  };

  return { filtered: Object.freeze(filtered), context };
};

export interface FixFilterContext {
  readonly role: Role;
  readonly riskLevel: string | null;
  readonly domain: string | null;
  readonly profileFound: boolean;
  readonly totalPlans: number;
  readonly applicablePlans: number;
  readonly excludedBySkip: number;
  readonly excludedByDomain: number;
}
