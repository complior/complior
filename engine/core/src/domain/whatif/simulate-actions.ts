/**
 * US-S05-25: Compliance Simulation — deterministic what-if analysis.
 *
 * Given a set of planned actions (fix finding, add document, complete passport field),
 * projects the compliance score delta without actually executing anything.
 */

import type { SeverityLevel, ComplianceDocType } from '../shared/compliance-constants.js';

export interface SimulationAction {
  readonly type: 'fix' | 'add-doc' | 'complete-passport';
  /** checkId for fix, docType for add-doc, fieldName for complete-passport */
  readonly target: string;
}

export interface SimulationInput {
  readonly actions: readonly SimulationAction[];
  readonly currentScore: number;
  readonly findings: readonly { checkId: string; severity: string; status: string }[];
  readonly passportCompleteness: number;
}

export interface SimulatedActionResult {
  readonly type: string;
  readonly target: string;
  readonly scoreImpact: number;
  readonly description: string;
}

export interface SimulationResult {
  readonly currentScore: number;
  readonly projectedScore: number;
  readonly delta: number;
  readonly actions: readonly SimulatedActionResult[];
}

/** Score points gained per severity of fixed finding. */
const SEVERITY_IMPACT: Record<SeverityLevel, number> = {
  critical: 5.0,
  high: 3.0,
  medium: 1.5,
  low: 0.5,
};

/** Score points gained per added compliance document. */
const DOC_IMPACT: Record<ComplianceDocType, number> = {
  fria: 4.0,
  'technical-documentation': 3.0,
  'worker-notification': 2.0,
  'monitoring-policy': 2.0,
  'ai-literacy': 1.5,
  'declaration-of-conformity': 3.0,
  'incident-report': 1.0,
};

export const simulateActions = (input: SimulationInput): SimulationResult => {
  const { actions, currentScore, findings, passportCompleteness } = input;
  const results: SimulatedActionResult[] = [];
  let totalDelta = 0;

  for (const action of actions) {
    let impact = 0;
    let description = '';

    switch (action.type) {
      case 'fix': {
        const finding = findings.find(
          (f) => f.checkId === action.target && f.status === 'fail',
        );
        if (finding) {
          impact = SEVERITY_IMPACT[finding.severity as SeverityLevel] ?? 1.5;
          description = `Fix ${action.target} (${finding.severity}) → +${impact.toFixed(1)} points`;
        } else {
          description = `Finding ${action.target} not found or already passing`;
        }
        break;
      }
      case 'add-doc': {
        impact = DOC_IMPACT[action.target as ComplianceDocType] ?? 2.0;
        description = `Add ${action.target} document → +${impact.toFixed(1)} points`;
        break;
      }
      case 'complete-passport': {
        const currentPct = passportCompleteness;
        if (currentPct < 100) {
          impact = 1.0;
          description = `Complete passport field "${action.target}" → +${impact.toFixed(1)} points`;
        } else {
          description = 'Passport already 100% complete';
        }
        break;
      }
    }

    totalDelta += impact;
    results.push(
      Object.freeze({
        type: action.type,
        target: action.target,
        scoreImpact: impact,
        description,
      }),
    );
  }

  const projectedScore = Math.min(100, currentScore + totalDelta);

  return Object.freeze({
    currentScore,
    projectedScore,
    delta: Math.round((projectedScore - currentScore) * 10) / 10,
    actions: Object.freeze(results),
  });
};
