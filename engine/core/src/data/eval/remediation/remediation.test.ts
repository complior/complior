/**
 * Remediation Knowledge Base — comprehensive validation tests.
 *
 * Validates all 22 playbooks (11 CT + 11 OWASP), their actions,
 * user guidance, lookup functions, and test-to-action mapping.
 */

import { describe, it, expect } from 'vitest';

import {
  ALL_CT_PLAYBOOKS,
  ALL_OWASP_PLAYBOOKS,
  ALL_PLAYBOOKS,
  getPlaybook,
  getAction,
  getActions,
} from './index.js';
import { getRemediationForTest, testRemediationMap } from './test-mapping.js';

// ── 1. Playbook-level validation ─────────────────────────────

describe('all 22 playbooks — structural validation', () => {
  it.each(ALL_PLAYBOOKS.map((p) => [p.category_id, p]))(
    '%s has non-empty category_id, label, article_ref, description and actions',
    (_id, playbook) => {
      expect(playbook.category_id).toBeTruthy();
      expect(playbook.label).toBeTruthy();
      expect(playbook.article_ref).toBeTruthy();
      expect(playbook.description).toBeTruthy();
      expect(playbook.actions.length).toBeGreaterThan(0);
    },
  );
});

// ── 2. Action-level validation ───────────────────────────────

describe('every action across all playbooks — required fields', () => {
  const allActions = ALL_PLAYBOOKS.flatMap((p) =>
    p.actions.map((a) => ({ categoryId: p.category_id, action: a })),
  );

  it.each(allActions.map((e) => [e.action.id, e.action]))(
    '%s has non-empty id, type, title, description, example, priority, effort, article_ref',
    (_id, action) => {
      expect(action.id).toBeTruthy();
      expect(action.type).toBeTruthy();
      expect(action.title).toBeTruthy();
      expect(action.description).toBeTruthy();
      expect(action.example).toBeTruthy();
      expect(action.priority).toBeTruthy();
      expect(action.effort).toBeTruthy();
      expect(action.article_ref).toBeTruthy();
    },
  );
});

// ── 3. User guidance validation ──────────────────────────────

describe('every action user_guidance — required fields', () => {
  const allActions = ALL_PLAYBOOKS.flatMap((p) => p.actions);

  it.each(allActions.map((a) => [a.id, a.user_guidance]))(
    '%s user_guidance has non-empty why, what_to_do (>= 1), verification, resources (>= 1)',
    (_id, guidance) => {
      expect(guidance.why).toBeTruthy();
      expect(guidance.what_to_do.length).toBeGreaterThanOrEqual(1);
      guidance.what_to_do.forEach((step) => expect(step).toBeTruthy());
      expect(guidance.verification).toBeTruthy();
      expect(guidance.resources.length).toBeGreaterThanOrEqual(1);
      guidance.resources.forEach((r) => expect(r).toBeTruthy());
    },
  );
});

// ── 4. No duplicate action IDs ───────────────────────────────

describe('action ID uniqueness', () => {
  it('no duplicate action IDs across all playbooks', () => {
    const allIds = ALL_PLAYBOOKS.flatMap((p) => p.actions.map((a) => a.id));
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const id of allIds) {
      if (seen.has(id)) duplicates.push(id);
      seen.add(id);
    }
    expect(duplicates).toEqual([]);
    expect(seen.size).toBe(allIds.length);
  });
});

// ── 5. Aggregated array counts ───────────────────────────────

describe('aggregated arrays', () => {
  it('ALL_CT_PLAYBOOKS has 11 entries', () => {
    expect(ALL_CT_PLAYBOOKS).toHaveLength(11);
  });

  it('ALL_OWASP_PLAYBOOKS has 11 entries', () => {
    expect(ALL_OWASP_PLAYBOOKS).toHaveLength(11);
  });

  it('ALL_PLAYBOOKS has 22 entries', () => {
    expect(ALL_PLAYBOOKS).toHaveLength(22);
  });
});

// ── 6. getPlaybook() — known category ────────────────────────

describe('getPlaybook()', () => {
  it('returns correct playbook for known category ID', () => {
    const pb = getPlaybook('transparency');
    expect(pb).toBeDefined();
    expect(pb!.category_id).toBe('transparency');
    expect(pb!.label).toBe('Transparency & Disclosure');
  });

  it('returns correct OWASP playbook for known category ID', () => {
    const pb = getPlaybook('LLM01');
    expect(pb).toBeDefined();
    expect(pb!.category_id).toBe('LLM01');
    expect(pb!.label).toBe('Prompt Injection');
  });

  // ── 7. getPlaybook() — unknown category ──────────────────

  it('returns undefined for unknown category', () => {
    expect(getPlaybook('non-existent-category')).toBeUndefined();
  });
});

// ── 8. getAction() — known action ID ─────────────────────────

describe('getAction()', () => {
  it('returns correct action for known action ID', () => {
    const action = getAction('CT-1-A1');
    expect(action).toBeDefined();
    expect(action!.id).toBe('CT-1-A1');
    expect(action!.title).toBe('AI Disclosure & Identity');
  });

  it('returns correct OWASP action for known action ID', () => {
    const action = getAction('LLM01-A1');
    expect(action).toBeDefined();
    expect(action!.id).toBe('LLM01-A1');
    expect(action!.title).toBe('Prompt Injection Defense');
  });

  it('returns undefined for unknown action ID', () => {
    expect(getAction('UNKNOWN-99')).toBeUndefined();
  });
});

// ── 9. getActions() — multiple IDs ───────────────────────────

describe('getActions()', () => {
  it('returns correct actions for array of known IDs', () => {
    const actions = getActions(['CT-1-A1', 'LLM01-A2', 'CT-1-A3']);
    expect(actions).toHaveLength(3);
    expect(actions[0].id).toBe('CT-1-A1');
    expect(actions[1].id).toBe('LLM01-A2');
    expect(actions[2].id).toBe('CT-1-A3');
  });

  it('skips unknown IDs without error', () => {
    const actions = getActions(['CT-1-A1', 'DOES-NOT-EXIST', 'LLM01-A1']);
    expect(actions).toHaveLength(2);
    expect(actions[0].id).toBe('CT-1-A1');
    expect(actions[1].id).toBe('LLM01-A1');
  });

  it('returns empty array for all unknown IDs', () => {
    const actions = getActions(['UNKNOWN-1', 'UNKNOWN-2']);
    expect(actions).toHaveLength(0);
  });
});

// ── 10. test-mapping: getRemediationForTest — explicit mapping ─

describe('getRemediationForTest()', () => {
  it('returns non-empty actions for explicitly mapped test CT-1-001', () => {
    const actions = getRemediationForTest('CT-1-001', 'transparency', ALL_PLAYBOOKS);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].id).toBe('CT-1-A1');
  });

  // ── 11. test-mapping: category fallback ────────────────────

  it('returns non-empty actions for unmapped test via category fallback', () => {
    // CT-1-999 is not in testRemediationMap, should fall back to category
    const actions = getRemediationForTest('CT-1-999', 'transparency', ALL_PLAYBOOKS);
    expect(actions.length).toBeGreaterThan(0);
    // Fallback returns top-3 by priority from the category playbook
    expect(actions.length).toBeLessThanOrEqual(3);
  });

  it('returns non-empty actions for OWASP category fallback', () => {
    const actions = getRemediationForTest('SEC-PROBE-001', 'security', ALL_PLAYBOOKS, 'LLM01');
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.length).toBeLessThanOrEqual(3);
  });

  it('returns empty array for completely unknown test and category', () => {
    const actions = getRemediationForTest('UNKNOWN-999', 'unknown-category', ALL_PLAYBOOKS);
    expect(actions).toHaveLength(0);
  });
});

// ── 12. test-mapping: all mapped IDs refer to existing actions ─

describe('testRemediationMap integrity', () => {
  it('every mapped testId refers to action IDs that exist in ALL_PLAYBOOKS', () => {
    const allActionIds = new Set(ALL_PLAYBOOKS.flatMap((p) => p.actions.map((a) => a.id)));
    const invalid: Array<{ testId: string; actionId: string }> = [];

    for (const [testId, actionIds] of Object.entries(testRemediationMap)) {
      for (const actionId of actionIds) {
        if (!allActionIds.has(actionId)) {
          invalid.push({ testId, actionId });
        }
      }
    }

    expect(invalid).toEqual([]);
  });

  it('testRemediationMap is not empty', () => {
    expect(Object.keys(testRemediationMap).length).toBeGreaterThan(0);
  });
});
