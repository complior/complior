/**
 * Shared verdict counting and score calculation for eval subsystem.
 *
 * Single source of truth — used by eval-runner, conformity-score,
 * security-integration, and eval-evidence.
 */

// ── Verdict counting ────────────────────────────────────────────

export interface VerdictCounts {
  readonly passed: number;
  readonly failed: number;
  readonly errors: number;
  readonly inconclusive: number;
  readonly skipped: number;
}

/** Count verdicts from test results. Avoids repeated .filter() chains. */
export const countVerdicts = (
  results: readonly { verdict: string }[],
): VerdictCounts => {
  let passed = 0, failed = 0, errors = 0, inconclusive = 0, skipped = 0;
  for (const r of results) {
    switch (r.verdict) {
      case 'pass': passed++; break;
      case 'fail': failed++; break;
      case 'error': errors++; break;
      case 'inconclusive': inconclusive++; break;
      case 'skip': skipped++; break;
    }
  }
  return { passed, failed, errors, inconclusive, skipped };
};

// ── Verdict predicates ──────────────────────────────────────────

/** True when a test result represents a failure (fail or error). */
export const isFailedVerdict = (r: { verdict: string }): boolean =>
  r.verdict === 'fail' || r.verdict === 'error';

// ── Score calculation ───────────────────────────────────────────

/** Calculate percentage score. Returns null when total is 0 (no data). */
export const calculateScore = (passed: number, total: number): number | null =>
  total > 0 ? Math.round((passed / total) * 100) : null;
