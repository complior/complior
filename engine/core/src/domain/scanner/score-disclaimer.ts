/**
 * V1-M10 T-1: Score Disclaimer Generator
 *
 * Builds a `ScoreDisclaimer` that explains what the compliance score covers
 * and what it does NOT cover. Pure function: ScoreBreakdown + ScanFilterContext? + coveredIds → ScoreDisclaimer.
 */
import type { ScoreBreakdown, ScanFilterContext, ScoreDisclaimer } from '../../types/common.types.js';

/**
 * Build a score disclaimer explaining automated-check coverage vs total obligations.
 *
 * @param score   — the scan score breakdown
 * @param ctx     — scan filter context (null when no profile configured)
 * @param coveredIds — list of obligation IDs that have at least one passing check
 */
export function buildScoreDisclaimer(
  score: ScoreBreakdown,
  ctx: ScanFilterContext | null,
  coveredIds: readonly string[],
): ScoreDisclaimer {
  const totalApplicable = ctx?.applicableObligations ?? 108;
  const covered = coveredIds.length;
  const uncovered = Math.max(0, totalApplicable - covered);
  const coveragePercent = totalApplicable > 0 ? Math.round((covered / totalApplicable) * 1000) / 10 : 0;

  // Human-readable summary
  const summary = [
    `${score.totalChecks} automated checks run — score reflects ${score.passedChecks} passed.`,
    `These checks cover ${covered} of ${totalApplicable} applicable obligations.`,
    `${uncovered} obligations require manual evidence (FRIA, risk assessment, human oversight procedures, etc.).`,
    `Run \`complior report\` for the full obligation breakdown.`,
  ].join(' ');

  const limitations: readonly string[] = [
    `Score is based on ${score.totalChecks} automated checks only — does not measure ${uncovered} obligations requiring manual evidence.`,
    `Automated checks verify code patterns and documentation presence, not operational effectiveness.`,
    `LLM-specific findings (Article 50) require \`complior scan --llm\` and are excluded from the base score.`,
    `Manual obligations (FRIA, conformity assessment, post-market monitoring) cannot be checked automatically.`,
  ];

  let criticalCapExplanation: string | null = null;
  if (score.criticalCapApplied) {
    criticalCapExplanation = [
      `Your score is capped at ${score.totalScore} due to critical-severity findings.`,
      `EU AI Act critical-cap rule: scores are reduced to ${score.totalScore} when critical findings are present.`,
    ].join(' ');
  }

  return {
    summary,
    coveredObligations: covered,
    totalApplicableObligations: totalApplicable,
    coveragePercent,
    uncoveredCount: uncovered,
    limitations,
    criticalCapExplanation,
  };
}
