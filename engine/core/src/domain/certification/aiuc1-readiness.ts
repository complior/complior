/**
 * AIUC-1 Readiness Score — pure scorer function.
 * Evaluates each requirement against scan results, passport data,
 * generated documents, and evidence chain summary.
 */

import type { ScanResult, Finding } from '../../types/common.types.js';
import type { AgentPassport } from '../../types/passport.types.js';
import type { EvidenceChainSummary } from '../scanner/evidence-store.js';
import { AIUC1_REQUIREMENTS, AIUC1_CATEGORIES } from './aiuc1-requirements.js';
import type { Aiuc1Category, Aiuc1Check } from './aiuc1-requirements.js';

// --- Types ---

export interface ReadinessInput {
  readonly passport: AgentPassport;
  readonly scanResult: ScanResult | null;
  readonly documents: ReadonlySet<string>;
  readonly evidenceSummary: EvidenceChainSummary;
}

export interface CheckStatus {
  readonly description: string;
  readonly passed: boolean;
  readonly detail?: string;
}

export interface RequirementStatus {
  readonly id: string;
  readonly title: string;
  readonly category: Aiuc1Category;
  readonly status: 'met' | 'partial' | 'unmet';
  readonly weight: number;
  readonly articleRef: string;
  readonly checks: readonly CheckStatus[];
}

export interface CategoryScore {
  readonly category: Aiuc1Category;
  readonly label: string;
  readonly score: number;
  readonly maxWeight: number;
  readonly achievedWeight: number;
}

export interface ReadinessResult {
  readonly overallScore: number;
  readonly readinessLevel: 'certified' | 'near_ready' | 'in_progress' | 'early';
  readonly requirements: readonly RequirementStatus[];
  readonly categories: readonly CategoryScore[];
  readonly gaps: readonly string[];
  readonly totalRequirements: number;
  readonly metRequirements: number;
  readonly partialRequirements: number;
  readonly unmetRequirements: number;
}

// --- Check evaluators ---

const resolvePassportField = (passport: AgentPassport, path: string): unknown => {
  const parts = path.split('.');
  let current: unknown = passport;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const isNonEmpty = (value: unknown): boolean => {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
};

const evaluateScanCheck = (
  target: string,
  scanResult: ScanResult | null,
): CheckStatus => {
  if (!scanResult) {
    return { description: '', passed: false, detail: 'No scan result available' };
  }

  // Special case: 'score' checks if scan was performed with score > 0
  if (target === 'score') {
    const passed = scanResult.score.totalScore > 0;
    return {
      description: '',
      passed,
      detail: passed ? `Score: ${scanResult.score.totalScore}` : 'Scan score is 0',
    };
  }

  // Look for findings matching the target checkId (substring match)
  const relevant = scanResult.findings.filter(
    (f: Finding) => f.checkId.includes(target),
  );

  if (relevant.length === 0) {
    return { description: '', passed: false, detail: `No findings for check '${target}'` };
  }

  // For 'banned-packages': passes when there are NO fail findings (no banned packages found)
  if (target === 'banned-packages') {
    const hasFails = relevant.some((f: Finding) => f.type === 'fail');
    return {
      description: '',
      passed: !hasFails,
      detail: hasFails ? 'Banned packages detected' : 'No banned packages',
    };
  }

  // General scan checks: pass if at least one 'pass' finding exists
  const hasPass = relevant.some((f: Finding) => f.type === 'pass');
  return {
    description: '',
    passed: hasPass,
    detail: hasPass ? `Check '${target}' passed` : `Check '${target}' failed`,
  };
};

const evaluatePassportField = (
  target: string,
  passport: AgentPassport,
): CheckStatus => {
  const value = resolvePassportField(passport, target);
  const passed = isNonEmpty(value);
  return {
    description: '',
    passed,
    detail: passed ? `Field '${target}' is set` : `Field '${target}' is missing or empty`,
  };
};

const evaluateDocument = (
  target: string,
  documents: ReadonlySet<string>,
): CheckStatus => {
  const passed = documents.has(target);
  return {
    description: '',
    passed,
    detail: passed ? `Document '${target}' exists` : `Document '${target}' not generated`,
  };
};

const evaluateEvidence = (
  target: string,
  evidenceSummary: EvidenceChainSummary,
): CheckStatus => {
  if (target === 'chain_active') {
    const passed = evidenceSummary.totalEntries > 0;
    return {
      description: '',
      passed,
      detail: passed
        ? `Evidence chain has ${evidenceSummary.totalEntries} entries`
        : 'Evidence chain is empty',
    };
  }

  if (target === 'scan_count') {
    const passed = evidenceSummary.scanCount >= 2;
    return {
      description: '',
      passed,
      detail: passed
        ? `${evidenceSummary.scanCount} scans performed`
        : `Only ${evidenceSummary.scanCount} scan(s) — need at least 2 for monitoring`,
    };
  }

  return { description: '', passed: false, detail: `Unknown evidence target: ${target}` };
};

const evaluateCheck = (
  check: Aiuc1Check,
  input: ReadinessInput,
): CheckStatus => {
  let result: CheckStatus;
  switch (check.type) {
    case 'scan_check':
      result = evaluateScanCheck(check.target, input.scanResult);
      break;
    case 'passport_field':
      result = evaluatePassportField(check.target, input.passport);
      break;
    case 'document':
      result = evaluateDocument(check.target, input.documents);
      break;
    case 'evidence':
      result = evaluateEvidence(check.target, input.evidenceSummary);
      break;
  }
  return { ...result, description: check.description };
};

// --- Main scorer ---

const determineReadinessLevel = (score: number): ReadinessResult['readinessLevel'] => {
  if (score >= 90) return 'certified';
  if (score >= 70) return 'near_ready';
  if (score >= 40) return 'in_progress';
  return 'early';
};

export const computeReadiness = (input: ReadinessInput): ReadinessResult => {
  const requirements: RequirementStatus[] = [];
  const gaps: string[] = [];

  for (const req of AIUC1_REQUIREMENTS) {
    const checkStatuses = req.checks.map((check) => evaluateCheck(check, input));

    const passedCount = checkStatuses.filter((c) => c.passed).length;
    const totalChecks = checkStatuses.length;

    let status: RequirementStatus['status'];
    if (passedCount === totalChecks) {
      status = 'met';
    } else if (passedCount > 0) {
      status = 'partial';
    } else {
      status = 'unmet';
    }

    if (status !== 'met') {
      const failedChecks = checkStatuses
        .filter((c) => !c.passed)
        .map((c) => c.description)
        .join(', ');
      gaps.push(`${req.id} ${req.title} (${req.articleRef}): ${failedChecks}`);
    }

    requirements.push({
      id: req.id,
      title: req.title,
      category: req.category,
      status,
      weight: req.weight,
      articleRef: req.articleRef,
      checks: checkStatuses,
    });
  }

  // Compute category scores
  const categoryMap = new Map<Aiuc1Category, { achieved: number; max: number }>();
  for (const [cat] of Object.entries(AIUC1_CATEGORIES)) {
    categoryMap.set(cat as Aiuc1Category, { achieved: 0, max: 0 });
  }

  for (const req of requirements) {
    const entry = categoryMap.get(req.category)!;
    entry.max += req.weight;
    if (req.status === 'met') {
      entry.achieved += req.weight;
    } else if (req.status === 'partial') {
      const passedChecks = req.checks.filter((c) => c.passed).length;
      entry.achieved += req.weight * (passedChecks / req.checks.length);
    }
  }

  const categories: CategoryScore[] = [];
  for (const [cat, info] of Object.entries(AIUC1_CATEGORIES)) {
    const entry = categoryMap.get(cat as Aiuc1Category)!;
    categories.push({
      category: cat as Aiuc1Category,
      label: info.label,
      score: entry.max > 0 ? Math.round((entry.achieved / entry.max) * 100) : 0,
      maxWeight: entry.max,
      achievedWeight: Math.round(entry.achieved * 10000) / 10000,
    });
  }

  // Overall score: sum of achieved weights / total weights * 100
  const totalWeight = [...categoryMap.values()].reduce((sum, e) => sum + e.max, 0);
  const achievedWeight = [...categoryMap.values()].reduce((sum, e) => sum + e.achieved, 0);
  const overallScore = totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;

  const metRequirements = requirements.filter((r) => r.status === 'met').length;
  const partialRequirements = requirements.filter((r) => r.status === 'partial').length;
  const unmetRequirements = requirements.filter((r) => r.status === 'unmet').length;

  return Object.freeze({
    overallScore,
    readinessLevel: determineReadinessLevel(overallScore),
    requirements,
    categories,
    gaps,
    totalRequirements: requirements.length,
    metRequirements,
    partialRequirements,
    unmetRequirements,
  });
};
