/**
 * Remediation Knowledge Base — barrel export for all 22 playbooks.
 *
 * 11 CT (conformity test) playbooks + 11 OWASP playbooks.
 */

import type { CategoryPlaybook, OwaspPlaybook, RemediationAction } from '../../../domain/eval/remediation-types.js';

import { CT_1_PLAYBOOK } from './ct-1-transparency.js';
import { CT_2_PLAYBOOK } from './ct-2-oversight.js';
import { CT_3_PLAYBOOK } from './ct-3-explanation.js';
import { CT_4_PLAYBOOK } from './ct-4-bias.js';
import { CT_5_PLAYBOOK } from './ct-5-accuracy.js';
import { CT_6_PLAYBOOK } from './ct-6-robustness.js';
import { CT_7_PLAYBOOK } from './ct-7-prohibited.js';
import { CT_8_PLAYBOOK } from './ct-8-logging.js';
import { CT_9_PLAYBOOK } from './ct-9-risk-awareness.js';
import { CT_10_PLAYBOOK } from './ct-10-gpai.js';
import { CT_11_PLAYBOOK } from './ct-11-industry.js';

import { LLM01_PLAYBOOK } from './owasp-llm01.js';
import { LLM02_PLAYBOOK } from './owasp-llm02.js';
import { LLM03_PLAYBOOK } from './owasp-llm03.js';
import { LLM04_PLAYBOOK } from './owasp-llm04.js';
import { LLM05_PLAYBOOK } from './owasp-llm05.js';
import { LLM06_PLAYBOOK } from './owasp-llm06.js';
import { LLM07_PLAYBOOK } from './owasp-llm07.js';
import { LLM08_PLAYBOOK } from './owasp-llm08.js';
import { LLM09_PLAYBOOK } from './owasp-llm09.js';
import { LLM10_PLAYBOOK } from './owasp-llm10.js';
import { ART5_PLAYBOOK } from './owasp-art5.js';

// ── Re-exports ───────────────────────────────────────────────

export {
  CT_1_PLAYBOOK, CT_2_PLAYBOOK, CT_3_PLAYBOOK, CT_4_PLAYBOOK,
  CT_5_PLAYBOOK, CT_6_PLAYBOOK, CT_7_PLAYBOOK, CT_8_PLAYBOOK,
  CT_9_PLAYBOOK, CT_10_PLAYBOOK, CT_11_PLAYBOOK,
  LLM01_PLAYBOOK, LLM02_PLAYBOOK, LLM03_PLAYBOOK, LLM04_PLAYBOOK,
  LLM05_PLAYBOOK, LLM06_PLAYBOOK, LLM07_PLAYBOOK, LLM08_PLAYBOOK,
  LLM09_PLAYBOOK, LLM10_PLAYBOOK, ART5_PLAYBOOK,
};

// ── Aggregated arrays ────────────────────────────────────────

export const ALL_CT_PLAYBOOKS: readonly CategoryPlaybook[] = Object.freeze([
  CT_1_PLAYBOOK, CT_2_PLAYBOOK, CT_3_PLAYBOOK, CT_4_PLAYBOOK,
  CT_5_PLAYBOOK, CT_6_PLAYBOOK, CT_7_PLAYBOOK, CT_8_PLAYBOOK,
  CT_9_PLAYBOOK, CT_10_PLAYBOOK, CT_11_PLAYBOOK,
]);

export const ALL_OWASP_PLAYBOOKS: readonly OwaspPlaybook[] = Object.freeze([
  LLM01_PLAYBOOK, LLM02_PLAYBOOK, LLM03_PLAYBOOK, LLM04_PLAYBOOK,
  LLM05_PLAYBOOK, LLM06_PLAYBOOK, LLM07_PLAYBOOK, LLM08_PLAYBOOK,
  LLM09_PLAYBOOK, LLM10_PLAYBOOK, ART5_PLAYBOOK,
]);

export const ALL_PLAYBOOKS: readonly CategoryPlaybook[] = Object.freeze([
  ...ALL_CT_PLAYBOOKS,
  ...ALL_OWASP_PLAYBOOKS,
]);

// ── Lookup ───────────────────────────────────────────────────

const playbookMap = new Map<string, CategoryPlaybook>();
for (const p of ALL_PLAYBOOKS) {
  playbookMap.set(p.category_id, p);
}

/** Get a playbook by category_id (e.g. "transparency", "LLM01"). */
export const getPlaybook = (categoryId: string): CategoryPlaybook | undefined =>
  playbookMap.get(categoryId);

// ── Action lookup ────────────────────────────────────────────

const actionMap = new Map<string, RemediationAction>();
for (const p of ALL_PLAYBOOKS) {
  for (const a of p.actions) {
    actionMap.set(a.id, a);
  }
}

/** Get a remediation action by ID (e.g. "CT-1-A1", "LLM01-A2"). */
export const getAction = (actionId: string): RemediationAction | undefined =>
  actionMap.get(actionId);

/** Get multiple actions by IDs. Skips unknown IDs. */
export const getActions = (actionIds: readonly string[]): readonly RemediationAction[] =>
  actionIds.map((id) => actionMap.get(id)).filter((a): a is RemediationAction => a !== undefined);
