import type { AgentPassport } from '../../types/passport.types.js';

/** Derive human-readable oversight description from passport autonomy data. */
export const deriveOversightDescription = (manifest: AgentPassport): string => {
  const parts: string[] = [];
  const level = manifest.autonomy_level;

  if (level === 'L1' || level === 'L2') {
    parts.push('System operates under direct human supervision.');
  } else if (level === 'L3') {
    parts.push('System operates semi-autonomously with human oversight checkpoints.');
  } else {
    parts.push('System operates autonomously; enhanced oversight measures required.');
  }

  if (manifest.constraints.human_approval_required.length > 0) {
    parts.push(`Human approval required for: ${manifest.constraints.human_approval_required.join(', ')}.`);
  }

  if (manifest.autonomy_evidence.human_approval_gates > 0) {
    parts.push(`${manifest.autonomy_evidence.human_approval_gates} human approval gate(s) detected in code.`);
  }

  return parts.join(' ');
};
