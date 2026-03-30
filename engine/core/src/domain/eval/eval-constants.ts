/**
 * Shared constants for eval domain modules.
 *
 * Centralises priority ordering, category metadata, and common helpers
 * to avoid duplication across eval-fix-generator, eval-remediation-report,
 * eval-to-findings, and test-mapping.
 */

import type { TestResult } from './types.js';
import type { CategoryPlaybook } from './remediation-types.js';
import evalData from '../../../data/eval/eval-mappings.json' with { type: 'json' };

// ── Priority ordering ───────────────────────────────────────

export const PRIORITY_ORDER: Readonly<Record<string, number>> = evalData.priority_order;

/** Numeric priority value (lower = higher priority). */
export const priorityNum = (p: string): number => PRIORITY_ORDER[p] ?? 3;

// ── Category → EU AI Act article mapping ────────────────────

export const CATEGORY_ARTICLES: Readonly<Record<string, string>> = evalData.category_articles;

// ── Category → fine information ─────────────────────────────

export const CATEGORY_FINES: Readonly<Record<string, string>> = evalData.category_fines;

// ── Priority → timeline mapping ──────────────────────────────

export const PRIORITY_TIMELINE: Readonly<Record<string, string>> = evalData.priority_timeline;

// ── Helpers ─────────────────────────────────────────────────

/** Find a playbook by category_id. */
export const findPlaybook = (
  playbooks: readonly CategoryPlaybook[],
  categoryId: string,
): CategoryPlaybook | undefined => playbooks.find((p) => p.category_id === categoryId);

/**
 * Group failures by effective category (owaspCategory ?? category).
 * Returns a Map of category → TestResult[].
 */
export const groupFailuresByCategory = (
  failures: readonly TestResult[],
): Map<string, TestResult[]> => {
  const byCat = new Map<string, TestResult[]>();
  for (const f of failures) {
    const cat = f.owaspCategory ?? f.category;
    const arr = byCat.get(cat) ?? [];
    arr.push(f);
    byCat.set(cat, arr);
  }
  return byCat;
};
