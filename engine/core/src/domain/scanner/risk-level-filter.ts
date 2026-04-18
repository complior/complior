/**
 * V1-M08 T-2: Risk Level Filter
 *
 * Filters findings so obligations that don't apply to the project's risk level
 * become type: 'skip' (visible but not scored).
 *
 * Pattern mirrors role-filter.ts: filtering by obligation's risk level requirements.
 */
import type { Finding, RiskLevel } from '../../types/common.types.js';
import checkToObligationsJson from '../../../data/check-to-obligations.json' with { type: 'json' };
import obligationsJson from '../../../data/regulations/eu-ai-act/obligations.json' with { type: 'json' };

/** Single source of truth for checkId → obligation IDs. */
const CHECK_TO_OBLIGATIONS: Readonly<Record<string, readonly string[]>> = checkToObligationsJson;

/** Normalise an obligation ID from check-to-obligations (OBL-019) to the full form in obligations JSON (eu-ai-act-OBL-019). */
const toFullOblId = (shortId: string): string => {
  if (shortId.startsWith('eu-ai-act-')) return shortId;
  return `eu-ai-act-${shortId}`;
};

/** Build reverse map: normalised obligation ID → applies_to_risk_level array. */
const buildOblRiskMap = (): Map<string, readonly string[]> => {
  const map = new Map<string, readonly string[]>();
  // obligationsJson has structure { obligations: [...] }
  const obligations = (obligationsJson as { obligations?: readonly unknown[] }).obligations ?? [];
  for (const obl of obligations as readonly { obligation_id?: string; applies_to_risk_level?: readonly string[] }[]) {
    if (obl.obligation_id && Array.isArray(obl.applies_to_risk_level)) {
      map.set(obl.obligation_id, obl.applies_to_risk_level);
    }
  }
  return map;
};

// Cached lazy map (built once, reused across all calls)
let _oblRiskMap: Map<string, readonly string[]> | null = null;

const getOblRiskMap = (): Map<string, readonly string[]> => {
  if (!_oblRiskMap) _oblRiskMap = buildOblRiskMap();
  return _oblRiskMap;
};

/**
 * Check if an obligation applies to the given risk level.
 * If `applies_to_risk_level` contains 'all', the obligation applies to every level.
 * If the project risk level is in the array, it applies.
 */
const riskApplies = (riskLevels: readonly string[], projectRisk: RiskLevel): boolean => {
  if (riskLevels.includes('all')) return true;
  return riskLevels.includes(projectRisk);
};

/**
 * Filter findings by project risk level.
 *
 * Logic:
 * 1. Build reverse map: checkId → obligation IDs
 * 2. For each finding, look up its obligation(s)
 * 3. If ALL obligations for a checkId require risk levels NOT including projectRisk → skip
 * 4. If projectRisk is null (no profile) → no filtering, return unchanged
 *
 * Mirrors role-filter: findings become type: 'skip' so they are visible but not scored.
 */
export const filterFindingsByRiskLevel = (
  findings: readonly Finding[],
  projectRisk: RiskLevel | null,
): readonly Finding[] => {
  // No filtering when risk level is unknown (no profile)
  if (projectRisk === null) return findings;

  const oblRiskMap = getOblRiskMap();

  let changed = false;
  const result = findings.map((f) => {
    const oblIds = CHECK_TO_OBLIGATIONS[f.checkId];

    // No obligation mapping → pass through unchanged (conservative default)
    if (!oblIds || oblIds.length === 0) return f;

    // Check if ALL obligations for this check require OTHER risk levels
    const allOblsRequireOtherRisk = oblIds.every((oblId) => {
      const fullId = toFullOblId(oblId);
      const riskLevels = oblRiskMap.get(fullId);
      // If no risk level data for this obligation → treat as applying to all levels
      if (!riskLevels || riskLevels.length === 0) return false;
      // Skip if project risk does NOT apply to this obligation
      return !riskApplies(riskLevels, projectRisk);
    });

    if (!allOblsRequireOtherRisk) return f;

    changed = true;
    return {
      ...f,
      type: 'skip' as const,
      message: `Skipped: not applicable for ${projectRisk} risk level (obligation requires different risk classification)`,
    };
  });

  // Optimization: return same reference when nothing changed
  return changed ? result : findings;
};