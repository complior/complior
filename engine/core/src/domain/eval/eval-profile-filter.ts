/**
 * V1-M12: Eval Profile Filter.
 *
 * Filters eval conformity tests (ConformityTest[]) by project profile attributes
 * (role, risk level, industry domain) using the test-applicability.json map.
 *
 * Design decisions (from FA-02 §11-14):
 *  - Filter BEFORE execution — saves HTTP/LLM costs
 *  - Sparse applicability map — only ~60 overrides vs 680 defaults-to-include
 *  - Backward compatible — no profile → all tests pass through, profileFound = false
 */

import type { EvalFilterContext } from '../../types/common.types.js';
import type { ConformityTest } from './types.js';
import applicabilityData from '../../../data/eval/test-applicability.json' with { type: 'json' };

/** Profile input (partial — only defined fields filter). */
export interface FilterProfile {
  readonly role: 'provider' | 'deployer' | 'both';
  readonly riskLevel: string | null;
  readonly domain: string | null;
}

/** Result of filtering tests by profile. */
export interface FilterResult {
  readonly filtered: readonly ConformityTest[];
  readonly context: EvalFilterContext;
}

// ── Core filter function ─────────────────────────────────────────

/**
 * Filter conformity tests by project profile.
 *
 * @param tests - All available conformity tests
 * @param profile - Project profile (null = no filter, all tests pass through)
 * @param overrides - Applicability overrides map (default: from test-applicability.json)
 * @returns Filtered tests + filter context (counts, profile source)
 */
export const filterTestsByProfile = (
  tests: readonly ConformityTest[],
  profile: FilterProfile | null,
  overrides: Record<string, { roles?: readonly string[]; riskLevels?: readonly string[]; industries?: readonly string[] }> = applicabilityData.overrides as Record<string, { roles?: readonly string[]; riskLevels?: readonly string[]; industries?: readonly string[] }>,
): FilterResult => {
  const totalTests = tests.length;

  // Backward compatible: no profile → all tests pass through
  if (profile === null) {
    const context: EvalFilterContext = {
      role: 'both',
      riskLevel: null,
      domain: null,
      profileFound: false,
      totalTests,
      applicableTests: totalTests,
      skippedByRole: 0,
      skippedByRiskLevel: 0,
      skippedByDomain: 0,
    };
    return { filtered: tests, context };
  }

  let skippedByRole = 0;
  let skippedByRiskLevel = 0;
  let skippedByDomain = 0;

  const filtered: ConformityTest[] = [];

  for (const test of tests) {
    const override = overrides[test.id];

    // Role filter — 'both' passes all (no role restriction when role is 'both')
    if (override?.roles && profile.role !== 'both') {
      if (!override.roles.includes(profile.role)) {
        skippedByRole++;
        continue;
      }
    }

    // Risk level filter
    if (override?.riskLevels && profile.riskLevel !== null) {
      if (!override.riskLevels.includes(profile.riskLevel)) {
        skippedByRiskLevel++;
        continue;
      }
    }

    // Domain filter
    if (override?.industries && profile.domain !== null) {
      if (!override.industries.includes(profile.domain)) {
        skippedByDomain++;
        continue;
      }
    }

    filtered.push(test);
  }

  const context: EvalFilterContext = {
    role: profile.role,
    riskLevel: profile.riskLevel,
    domain: profile.domain,
    profileFound: true,
    totalTests,
    applicableTests: filtered.length,
    skippedByRole,
    skippedByRiskLevel,
    skippedByDomain,
  };

  return { filtered: Object.freeze(filtered), context };
};