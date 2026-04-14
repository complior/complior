/**
 * V1-M10 T-3: Profile-Aware Priority Actions
 *
 * Computes priority actions that respect the project profile (role, risk level,
 * applicable obligations). Unlike the simple severity-sorted topActions in scan.route.ts,
 * this function filters by applicable obligations and weights by category weakness.
 *
 * Used by: scan.route.ts (POST /scan → topActions), status.route.ts (GET /status/posture → topActions)
 */
import type { ScanResult, ScanFilterContext, Finding } from '../../types/common.types.js';
import type { PriorityAction } from '../../domain/reporter/types.js';
import obligationsJson from '../../../data/regulations/eu-ai-act/obligations.json' with { type: 'json' };

// Lazy-loaded set of all obligation IDs
let _allOblSet: ReadonlySet<string> | null = null;

const getAllOblSet = (): ReadonlySet<string> => {
  if (_allOblSet) return _allOblSet;
  const oblList = (obligationsJson as { obligations?: readonly { obligation_id?: string }[] }).obligations ?? [];
  _allOblSet = new Set(
    (oblList as readonly { obligation_id?: string }[])
      .filter((o) => o.obligation_id !== undefined)
      .map((o) => o.obligation_id as string),
  );
  return _allOblSet;
};

/** Severity weight for priority scoring (critical = highest weight). */
const SEV_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

/**
 * Build profile-aware priority actions from a scan result.
 *
 * @param result        — full scan result (score + findings)
 * @param filterContext — profile filter context (null = no profile, use all)
 * @returns top 5 priority actions sorted by priority score
 */
export function buildProfileAwareTopActions(
  result: ScanResult,
  filterContext: ScanFilterContext | null,
): PriorityAction[] {
  const { score, findings } = result;

  // Collect applicable obligation IDs (from all checks)
  const allOblSet = getAllOblSet();

  // 1. Filter to fail findings only
  const failFindings: Finding[] = findings.filter((f) => f.type === 'fail');
  if (failFindings.length === 0) return [];

  // 2. Filter by applicable obligations (if profile exists)
  const filteredFindings = filterContext
    ? failFindings.filter((f) => {
        if (!f.obligationId) return false;
        return allOblSet.has(f.obligationId);
      })
    : failFindings;

  if (filteredFindings.length === 0) return [];

  // 3. Build category weakness map from category scores (higher weakness = more urgent)
  const categoryScores = score.categoryScores ?? [];
  const maxCatScore = Math.max(...categoryScores.map((cs) => cs.score), 1);
  const categoryWeakness: Record<string, number> = {};
  for (const cs of categoryScores) {
    categoryWeakness[cs.category] = (maxCatScore - cs.score) / maxCatScore;
  }

  // 4. Build deadline map for proximity scoring
  const oblDeadlines: Record<string, string> = {};
  const oblList = (obligationsJson as { obligations?: readonly { obligation_id?: string; deadline?: string }[] }).obligations ?? [];
  for (const obl of oblList as readonly { obligation_id?: string; deadline?: string }[]) {
    if (obl.obligation_id && obl.deadline) {
      oblDeadlines[obl.obligation_id] = obl.deadline;
    }
  }

  // 5. Score each action: severity × deadline × scoreImpact × (1 + categoryWeakness)
  const scored = filteredFindings.map((f: Finding) => {
    const sevWeight = SEV_WEIGHT[f.severity] ?? 0;

    // Deadline proximity: closer to deadline = higher score
    let deadlineProximity = 1.0;
    if (f.obligationId) {
      const deadline = oblDeadlines[f.obligationId];
      if (deadline) {
        const daysLeft = Math.max(
          0,
          Math.round((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        );
        // Cap at 90 days; if overdue, give 1.5x boost
        deadlineProximity = daysLeft <= 0 ? 1.5 : Math.max(0.1, 1 - daysLeft / 90);
      }
    }

    // Category weakness contribution
    let catWeak = 0.5; // default medium
    if (f.obligationId) {
      const oblEntry = (oblList as readonly { obligation_id?: string; category?: string }[]).find(
        (o) => o.obligation_id === f.obligationId,
      );
      if (oblEntry?.category) {
        catWeak = categoryWeakness[oblEntry.category] ?? 0.5;
      }
    }

    const scoreImpact = f.priority ?? 5;
    const priorityScore = Math.round(
      sevWeight * 10 * deadlineProximity * (scoreImpact / 10) * (1 + catWeak),
    );

    return { ...f, priorityScore };
  });

  // 6. Sort by priority score (high first), then by severity
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  scored.sort((a, b) => {
    const scoreDiff = b.priorityScore - a.priorityScore;
    if (scoreDiff !== 0) return scoreDiff;
    return (sevOrder[a.severity] ?? 5) - (sevOrder[b.severity] ?? 5);
  });

  // 7. Return top 5
  const top = scored.slice(0, 5);

  const effortMap: Record<string, string> = {
    critical: 'high',
    high: 'medium',
    medium: 'medium',
    low: 'low',
    info: 'low',
  };

  return top.map((f, index) => ({
    rank: index + 1,
    source: 'scan' as const,
    id: f.checkId,
    title: f.fix ?? f.message,
    article: f.articleReference ?? '',
    severity: f.severity,
    deadline: null,
    daysLeft: null,
    scoreImpact: f.priority ?? 5,
    fixAvailable: !!f.fixDiff || !!f.fix,
    command: 'complior fix',
    priorityScore: f.priorityScore,
    effort: effortMap[f.severity] ?? 'low',
    projectedScore: Math.min(100, Math.max(0, score.totalScore + Math.round(f.priorityScore / 10))),
  }));
}
