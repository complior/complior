/**
 * Test → Remediation Mapping — maps each test ID to remediation action IDs.
 *
 * US-REM-03: Every failed test should yield concrete remediation actions.
 * - 176 deterministic tests: explicit mapping to 1-3 action IDs
 * - 300 security probes: map by owaspCategory → OWASP playbook
 * - Fallback: category-level top-3 actions sorted by priority
 */

import type { RemediationAction, CategoryPlaybook } from '../../../domain/eval/remediation-types.js';
import { priorityNum, findPlaybook } from '../../../domain/eval/eval-constants.js';

// ── CT category → playbook category_id ──────────────────────

const CT_TO_CATEGORY: Record<string, string> = {
  'CT-1': 'transparency',
  'CT-2': 'oversight',
  'CT-3': 'explanation',
  'CT-4': 'bias',
  'CT-5': 'accuracy',
  'CT-6': 'robustness',
  'CT-7': 'prohibited',
  'CT-8': 'logging',
  'CT-9': 'risk-awareness',
  'CT-10': 'gpai',
  'CT-11': 'industry',
};

// ── Explicit test → action ID mapping ────────────────────────

/**
 * Maps test IDs to specific remediation action IDs.
 * Tests not listed here fall back to category-level or OWASP-level playbooks.
 */
export const testRemediationMap: Record<string, readonly string[]> = Object.freeze({
  // CT-1: Transparency
  'CT-1-001': ['CT-1-A1'],
  'CT-1-002': ['CT-1-A1'],
  'CT-1-003': ['CT-1-A1', 'CT-1-A3'],
  'CT-1-004': ['CT-1-A1'],
  'CT-1-005': ['CT-1-A4'],
  'CT-1-006': ['CT-1-A3'],
  'CT-1-007': ['CT-1-A3'],
  'CT-1-008': ['CT-1-A2'],
  'CT-1-009': ['CT-1-A1'],
  'CT-1-010': ['CT-1-A1'],
  'CT-1-011': ['CT-1-A1'],
  'CT-1-012': ['CT-1-A2'],
  'CT-1-013': ['CT-1-A2'],
  'CT-1-014': ['CT-1-A2'],
  'CT-1-015': ['CT-1-A2'],
  'CT-1-016': ['CT-1-A1'],
  'CT-1-017': ['CT-1-A1'],
  'CT-1-018': ['CT-1-A3'],
  'CT-1-019': ['CT-1-A2'],
  'CT-1-020': ['CT-1-A2'],

  // CT-2: Oversight
  'CT-2-001': ['CT-2-A1'],
  'CT-2-002': ['CT-2-A1'],
  'CT-2-003': ['CT-2-A1'],
  'CT-2-004': ['CT-2-A1'],
  'CT-2-005': ['CT-2-A1'],
  'CT-2-006': ['CT-2-A1'],
  'CT-2-007': ['CT-2-A2'],
  'CT-2-008': ['CT-2-A1'],
  'CT-2-009': ['CT-2-A3'],
  'CT-2-010': ['CT-2-A1'],
  'CT-2-011': ['CT-2-A1'],
  'CT-2-012': ['CT-2-A1'],
  'CT-2-013': ['CT-2-A1'],
  'CT-2-014': ['CT-2-A2'],
  'CT-2-015': ['CT-2-A3'],

  // CT-3: Explanation (LLM-judged — mapped to fallback)
  'CT-3-051': ['CT-3-A1'],
  'CT-3-052': ['CT-3-A2'],
  'CT-3-053': ['CT-3-A3'],

  // CT-4: Bias
  'CT-4-001': ['CT-4-A1'],
  'CT-4-002': ['CT-4-A1'],
  'CT-4-003': ['CT-4-A1'],
  'CT-4-004': ['CT-4-A1'],
  'CT-4-005': ['CT-4-A1'],
  'CT-4-006': ['CT-4-A2'],
  'CT-4-007': ['CT-4-A2'],
  'CT-4-008': ['CT-4-A1'],
  'CT-4-009': ['CT-4-A1'],
  'CT-4-010': ['CT-4-A1'],
  'CT-4-011': ['CT-4-A2'],
  'CT-4-012': ['CT-4-A2'],
  'CT-4-013': ['CT-4-A1'],
  'CT-4-014': ['CT-4-A1'],
  'CT-4-015': ['CT-4-A1'],
  'CT-4-016': ['CT-4-A2'],
  'CT-4-017': ['CT-4-A2'],
  'CT-4-018': ['CT-4-A1'],
  'CT-4-019': ['CT-4-A1'],
  'CT-4-020': ['CT-4-A1'],
  'CT-4-021': ['CT-4-A1', 'CT-4-A2'],
  'CT-4-022': ['CT-4-A1', 'CT-4-A2'],
  'CT-4-023': ['CT-4-A1'],
  'CT-4-024': ['CT-4-A1'],
  'CT-4-025': ['CT-4-A3'],

  // CT-5: Accuracy
  'CT-5-001': ['CT-5-A1'],
  'CT-5-002': ['CT-5-A1'],
  'CT-5-003': ['CT-5-A1'],
  'CT-5-004': ['CT-5-A1'],
  'CT-5-005': ['CT-5-A1'],
  'CT-5-006': ['CT-5-A2'],
  'CT-5-007': ['CT-5-A1'],
  'CT-5-008': ['CT-5-A2'],
  'CT-5-009': ['CT-5-A1'],
  'CT-5-010': ['CT-5-A1'],
  'CT-5-011': ['CT-5-A3'],
  'CT-5-012': ['CT-5-A1'],
  'CT-5-013': ['CT-5-A1'],
  'CT-5-014': ['CT-5-A2'],
  'CT-5-015': ['CT-5-A3'],

  // CT-6: Robustness
  'CT-6-001': ['CT-6-A1'],
  'CT-6-002': ['CT-6-A1'],
  'CT-6-003': ['CT-6-A1'],
  'CT-6-004': ['CT-6-A1'],
  'CT-6-005': ['CT-6-A1'],
  'CT-6-006': ['CT-6-A1'],
  'CT-6-007': ['CT-6-A1'],
  'CT-6-008': ['CT-6-A1'],
  'CT-6-009': ['CT-6-A1'],
  'CT-6-010': ['CT-6-A1'],
  'CT-6-011': ['CT-6-A2'],
  'CT-6-012': ['CT-6-A2'],
  'CT-6-013': ['CT-6-A3'],
  'CT-6-014': ['CT-6-A3'],
  'CT-6-015': ['CT-6-A3'],
  'CT-6-016': ['CT-6-A1'],
  'CT-6-017': ['CT-6-A1'],
  'CT-6-018': ['CT-6-A1'],
  'CT-6-019': ['CT-6-A1'],
  'CT-6-020': ['CT-6-A1'],
  'CT-6-021': ['CT-6-A2'],
  'CT-6-022': ['CT-6-A2'],
  'CT-6-023': ['CT-6-A2'],
  'CT-6-024': ['CT-6-A2'],
  'CT-6-025': ['CT-6-A3'],
  'CT-6-026': ['CT-6-A1'],
  'CT-6-027': ['CT-6-A1'],
  'CT-6-028': ['CT-6-A1'],
  'CT-6-029': ['CT-6-A1'],
  'CT-6-030': ['CT-6-A1'],
  'CT-6-031': ['CT-6-A1'],
  'CT-6-032': ['CT-6-A1'],
  'CT-6-033': ['CT-6-A1'],
  'CT-6-034': ['CT-6-A1'],
  'CT-6-035': ['CT-6-A3'],

  // CT-7: Prohibited
  'CT-7-001': ['CT-7-A1'],
  'CT-7-002': ['CT-7-A1'],
  'CT-7-003': ['CT-7-A2'],
  'CT-7-004': ['CT-7-A2'],
  'CT-7-005': ['CT-7-A3'],
  'CT-7-006': ['CT-7-A3'],
  'CT-7-007': ['CT-7-A2'],
  'CT-7-008': ['CT-7-A1'],
  'CT-7-009': ['CT-7-A1'],
  'CT-7-010': ['CT-7-A1'],
  'CT-7-011': ['CT-7-A2'],
  'CT-7-012': ['CT-7-A2'],
  'CT-7-013': ['CT-7-A3'],
  'CT-7-014': ['CT-7-A1'],
  'CT-7-015': ['CT-7-A4'],
  'CT-7-051': ['CT-7-A1'],
  'CT-7-052': ['CT-7-A2'],
  'CT-7-053': ['CT-7-A2'],
  'CT-7-054': ['CT-7-A3'],
  'CT-7-055': ['CT-7-A4'],

  // CT-8: Logging
  'CT-8-001': ['CT-8-A1'],
  'CT-8-002': ['CT-8-A1'],
  'CT-8-003': ['CT-8-A1'],
  'CT-8-004': ['CT-8-A1'],
  'CT-8-005': ['CT-8-A1'],
  'CT-8-006': ['CT-8-A2'],
  'CT-8-007': ['CT-8-A2'],
  'CT-8-008': ['CT-8-A2'],
  'CT-8-009': ['CT-8-A1'],
  'CT-8-010': ['CT-8-A3'],
  'CT-8-011': ['CT-8-A3'],
  'CT-8-012': ['CT-8-A1'],
  'CT-8-013': ['CT-8-A2'],
  'CT-8-014': ['CT-8-A3'],
  'CT-8-015': ['CT-8-A1'],

  // CT-9: Risk Awareness
  'CT-9-001': ['CT-9-A1'],
  'CT-9-002': ['CT-9-A1'],
  'CT-9-003': ['CT-9-A2'],
  'CT-9-004': ['CT-9-A2'],
  'CT-9-005': ['CT-9-A1'],
  'CT-9-051': ['CT-9-A1'],
  'CT-9-052': ['CT-9-A2'],
  'CT-9-053': ['CT-9-A3'],

  // CT-10: GPAI
  'CT-10-001': ['CT-10-A1'],
  'CT-10-002': ['CT-10-A1'],
  'CT-10-003': ['CT-10-A2'],
  'CT-10-004': ['CT-10-A3'],
  'CT-10-051': ['CT-10-A2'],
  'CT-10-052': ['CT-10-A3'],

  // CT-11: Industry
  'CT-11-001': ['CT-11-A1'],
  'CT-11-002': ['CT-11-A1'],
  'CT-11-003': ['CT-11-A2'],
  'CT-11-004': ['CT-11-A2'],
  'CT-11-005': ['CT-11-A1'],
  'CT-11-006': ['CT-11-A2'],
  'CT-11-007': ['CT-11-A1'],
  'CT-11-008': ['CT-11-A2'],
  'CT-11-009': ['CT-11-A3'],
  'CT-11-051': ['CT-11-A1'],
  'CT-11-052': ['CT-11-A1'],
  'CT-11-053': ['CT-11-A2'],
  'CT-11-054': ['CT-11-A2'],
  'CT-11-055': ['CT-11-A3'],

  // Security probes — explicit mappings per AC (US-REM-03)
  'PROBE-091': ['LLM01-A3', 'LLM07-A1'],   // authority impersonation
  'PROBE-168': ['LLM05-A1', 'LLM05-A3'],   // XSS via output
});


/**
 * Get remediation actions for a specific test.
 *
 * Resolution order:
 * 1. Explicit test mapping → exact action IDs
 * 2. OWASP playbook (security probes) → top-3 by priority
 * 3. CT category playbook → top-3 by priority
 */
export const getRemediationForTest = (
  testId: string,
  category: string,
  allPlaybooks: readonly CategoryPlaybook[],
  owaspCategory?: string,
): readonly RemediationAction[] => {
  // 1. Check explicit mapping
  const mapped = testRemediationMap[testId];
  if (mapped) {
    const actions: RemediationAction[] = [];
    for (const actionId of mapped) {
      for (const pb of allPlaybooks) {
        const found = pb.actions.find((a) => a.id === actionId);
        if (found) { actions.push(found); break; }
      }
    }
    if (actions.length > 0) return actions;
  }

  // 2. OWASP playbook fallback (security probes)
  if (owaspCategory) {
    const owaspPb = findPlaybook(allPlaybooks, owaspCategory);
    if (owaspPb) {
      return [...owaspPb.actions]
        .sort((a, b) => priorityNum(a.priority) - priorityNum(b.priority))
        .slice(0, 3);
    }
  }

  // 3. CT category fallback — derive from test ID prefix or category
  const ctPrefix = testId.match(/^(CT-\d+)/)?.[1];
  const categoryId = ctPrefix ? CT_TO_CATEGORY[ctPrefix] : category;
  if (categoryId) {
    const catPb = findPlaybook(allPlaybooks, categoryId);
    if (catPb) {
      return [...catPb.actions]
        .sort((a, b) => priorityNum(a.priority) - priorityNum(b.priority))
        .slice(0, 3);
    }
  }

  return [];
};
