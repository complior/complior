import type { ScanResult, Finding } from '../../types/common.types.js';

export type DriftSeverity = 'none' | 'minor' | 'major' | 'critical';

export interface DriftResult {
  readonly hasDrift: boolean;
  readonly newFailures: readonly Finding[];
  readonly resolvedFailures: readonly Finding[];
  readonly scoreChange: number;
  readonly affectedArticles: readonly string[];
  readonly severity: DriftSeverity;
}

const getFailFindings = (result: ScanResult): readonly Finding[] =>
  result.findings.filter((f) => f.type === 'fail');

const findingKey = (f: Finding): string =>
  `${f.checkId}::${f.file ?? ''}::${f.obligationId ?? ''}`;

const classifySeverity = (
  scoreChange: number,
  newFailures: readonly Finding[],
): DriftSeverity => {
  // Critical: new failure in Art. 5 prohibited practice
  const hasProhibited = newFailures.some(
    (f) => f.articleReference?.startsWith('Art. 5') || f.severity === 'critical',
  );
  if (hasProhibited) return 'critical';

  // Major: score dropped >10 points OR new high-severity finding
  const hasHighSeverity = newFailures.some((f) => f.severity === 'high');
  if (scoreChange < -10 || hasHighSeverity) return 'major';

  // Minor: score dropped 1-10 points
  if (scoreChange < 0) return 'minor';

  // None: score stable or improved
  return 'none';
};

export const detectDrift = (
  current: ScanResult,
  previous: ScanResult,
): DriftResult => {
  const currentFails = getFailFindings(current);
  const previousFails = getFailFindings(previous);

  const previousKeys = new Set(previousFails.map(findingKey));
  const currentKeys = new Set(currentFails.map(findingKey));

  const newFailures = currentFails.filter((f) => !previousKeys.has(findingKey(f)));
  const resolvedFailures = previousFails.filter((f) => !currentKeys.has(findingKey(f)));

  const scoreChange = current.score.totalScore - previous.score.totalScore;

  const affectedArticles = [
    ...new Set([
      ...newFailures.map((f) => f.articleReference).filter((a): a is string => a !== undefined),
      ...resolvedFailures.map((f) => f.articleReference).filter((a): a is string => a !== undefined),
    ]),
  ];

  const severity = classifySeverity(scoreChange, newFailures);

  return {
    hasDrift: newFailures.length > 0 || resolvedFailures.length > 0,
    newFailures,
    resolvedFailures,
    scoreChange,
    affectedArticles,
    severity,
  };
};
