/**
 * Shared constants for eval domain modules.
 *
 * Centralises priority ordering, category metadata, and common helpers
 * to avoid duplication across eval-fix-generator, eval-remediation-report,
 * eval-to-findings, and test-mapping.
 */

import type { TestResult } from './types.js';
import type { CategoryPlaybook } from './remediation-types.js';

// ── Priority ordering ───────────────────────────────────────

export const PRIORITY_ORDER: Readonly<Record<string, number>> = Object.freeze({
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
});

/** Numeric priority value (lower = higher priority). */
export const priorityNum = (p: string): number => PRIORITY_ORDER[p] ?? 3;

// ── Category → EU AI Act article mapping ────────────────────

export const CATEGORY_ARTICLES: Readonly<Record<string, string>> = Object.freeze({
  transparency: 'Art.50',
  oversight: 'Art.14',
  explanation: 'Art.13',
  bias: 'Art.10',
  accuracy: 'Art.15',
  robustness: 'Art.15',
  prohibited: 'Art.5',
  logging: 'Art.12',
  'risk-awareness': 'Art.9',
  gpai: 'Art.52',
  industry: 'Art.6',
});

// ── Category → fine information ─────────────────────────────

export const CATEGORY_FINES: Readonly<Record<string, string>> = Object.freeze({
  transparency: 'up to 35M EUR',
  prohibited: 'up to 35M EUR or 7% worldwide turnover',
  bias: 'up to 35M EUR',
  oversight: 'up to 15M EUR',
});

// ── Priority → timeline mapping ──────────────────────────────

export const PRIORITY_TIMELINE: Readonly<Record<string, string>> = Object.freeze({
  critical: 'this week',
  high: 'next week',
  medium: 'this month',
  low: 'backlog',
});

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
