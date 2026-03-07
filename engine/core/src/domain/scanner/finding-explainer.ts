/**
 * US-S05-07: Finding Explanations — static mapping check_id → explanation.
 *
 * Enriches findings with article reference, penalty, deadline, and business impact.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Finding, FindingExplanation } from '../../types/common.types.js';

export type { FindingExplanation } from '../../types/common.types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPLANATIONS_PATH = resolve(__dirname, '../../data/finding-explanations.json');

let cache: Record<string, FindingExplanation> | null = null;

const loadExplanations = (): Record<string, FindingExplanation> => {
  if (cache) return cache;
  const raw = readFileSync(EXPLANATIONS_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  // Filter out $schema/$comment keys
  const result: Record<string, FindingExplanation> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key.startsWith('$')) continue;
    result[key] = value as FindingExplanation;
  }
  cache = result;
  return result;
};

/**
 * Normalize a check_id for lookup: strip layer prefix, handle l3-banned-* pattern.
 */
const normalizeCheckId = (checkId: string): string => {
  // l3-banned-{package} → l3-banned-package (generic)
  if (checkId.startsWith('l3-banned-')) return 'l3-banned-package';
  // Strip cross- prefix for cross-layer checks
  if (checkId.startsWith('cross-')) return checkId;
  return checkId;
};

/**
 * Look up the explanation for a given check_id.
 */
export const getExplanation = (checkId: string): FindingExplanation | undefined => {
  const explanations = loadExplanations();
  const normalized = normalizeCheckId(checkId);
  return explanations[normalized];
};

/**
 * Enrich a single finding with its explanation.
 */
export const explainFinding = (finding: Finding): Finding & { explanation?: FindingExplanation } => {
  const explanation = getExplanation(finding.checkId);
  if (!explanation) return finding;
  return { ...finding, explanation };
};

/**
 * Enrich an array of findings with explanations.
 */
export const explainFindings = (findings: readonly Finding[]): (Finding & { explanation?: FindingExplanation })[] => {
  return findings.map(explainFinding);
};

/**
 * Get all available check_ids in the explanations database.
 */
export const getAvailableCheckIds = (): string[] => {
  return Object.keys(loadExplanations());
};
