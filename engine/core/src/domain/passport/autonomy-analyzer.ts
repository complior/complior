import type { L4CheckResult } from '../scanner/layers/layer4-patterns.js';
import type { AutonomyLevel, AgentType, AutonomyEvidence } from '../../types/passport.types.js';

// --- Analysis result ---

export interface AutonomyAnalysis {
  readonly level: AutonomyLevel;
  readonly evidence: AutonomyEvidence;
  readonly agentType: AgentType;
  readonly killSwitchPresent: boolean;
}

// --- Helpers ---

const countMatches = (
  results: readonly L4CheckResult[],
  category: string,
  patternType: 'positive' | 'negative',
  status: 'FOUND' | 'NOT_FOUND',
): number =>
  results.filter(
    (r) =>
      r.category === category &&
      r.patternType === patternType &&
      r.status === status,
  ).length;

const hasMatch = (
  results: readonly L4CheckResult[],
  category: string,
  patternType: 'positive' | 'negative',
  status: 'FOUND' | 'NOT_FOUND',
): boolean => countMatches(results, category, patternType, status) > 0;

// --- Autonomy level determination ---

const determineLevel = (
  humanGates: number,
  unsupervised: number,
  loggingPresent: boolean,
): AutonomyLevel => {
  if (humanGates > 0 && unsupervised === 0) return 'L2';
  if (humanGates > 0 && unsupervised > 0) return 'L3';
  if (humanGates === 0 && unsupervised > 0 && loggingPresent) return 'L4';
  if (humanGates === 0 && unsupervised > 0 && !loggingPresent) return 'L5';
  // Default: no gates, no unsupervised actions detected
  return 'L1';
};

// --- Agent type determination ---

const determineAgentType = (level: AutonomyLevel): AgentType => {
  switch (level) {
    case 'L1':
    case 'L2':
      return 'assistive';
    case 'L3':
      return 'hybrid';
    case 'L4':
    case 'L5':
      return 'autonomous';
  }
};

// --- Main analysis function ---

export const analyzeAutonomy = (
  l4Results: readonly L4CheckResult[],
): AutonomyAnalysis => {
  // 1. Count human approval gates (human-oversight, positive, FOUND)
  const humanApprovalGates = countMatches(
    l4Results,
    'human-oversight',
    'positive',
    'FOUND',
  );

  // 2. Count unsupervised actions (bare-llm, negative, FOUND)
  const unsupervisedActions = countMatches(
    l4Results,
    'bare-llm',
    'negative',
    'FOUND',
  );

  // 3. Check logging presence (logging, positive, FOUND)
  const loggingPresent = hasMatch(l4Results, 'logging', 'positive', 'FOUND');

  // 4. Check kill switch (kill-switch, positive, FOUND)
  const killSwitchPresent = hasMatch(l4Results, 'kill-switch', 'positive', 'FOUND');

  // 5. Determine autonomy level
  const level = determineLevel(
    humanApprovalGates,
    unsupervisedActions,
    loggingPresent,
  );

  // 6. Determine agent type
  const agentType = determineAgentType(level);

  // 7. Build evidence
  const noLoggingActions = !loggingPresent ? unsupervisedActions : 0;

  const evidence: AutonomyEvidence = {
    human_approval_gates: humanApprovalGates,
    unsupervised_actions: unsupervisedActions,
    no_logging_actions: noLoggingActions,
    auto_rated: true,
  };

  return { level, evidence, agentType, killSwitchPresent };
};
