import type { Role, Finding } from '../../types/common.types.js';

/**
 * Static mapping: checkId → required role.
 * Checks NOT listed here apply to 'both' (all roles).
 */
const CHECK_ROLE: ReadonlyMap<string, Role> = new Map([
  // Provider-only (org builds AI system)
  ['qms', 'provider'],
  ['gpai-transparency', 'provider'],
  ['gpai-systemic-risk', 'provider'],
  ['l3-missing-bias-testing', 'provider'],
  ['l4-data-governance', 'provider'],
  ['l4-content-marking', 'provider'],
  ['l4-gpai-transparency', 'provider'],
  ['l4-conformity-assessment', 'provider'],
  ['content-marking', 'provider'],

  // Deployer-only (org uses AI system)
  ['monitoring-policy', 'deployer'],
  ['worker-notification', 'deployer'],
  ['incident-report', 'deployer'],
  ['fria', 'deployer'],
  ['l4-deployer-monitoring', 'deployer'],
  ['l4-record-keeping', 'deployer'],
]);

/** Get the required role for a check. Unlisted checks → 'both'. */
export const getCheckRole = (checkId: string): Role =>
  CHECK_ROLE.get(checkId) ?? 'both';

/**
 * Filter findings by project role.
 * Findings for an inapplicable role become type: 'skip' (visible but not scored).
 * If projectRole is 'both', all findings pass through unchanged.
 */
export const filterFindingsByRole = (
  findings: readonly Finding[],
  projectRole: Role,
): readonly Finding[] => {
  if (projectRole === 'both') return findings;
  return findings.map(f => {
    const role = getCheckRole(f.checkId);
    if (role === 'both' || role === projectRole) return f;
    return {
      ...f,
      type: 'skip' as const,
      message: `Skipped: ${role}-only check (project role: ${projectRole})`,
    };
  });
};
