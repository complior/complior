/**
 * Pure domain functions to derive passport compliance fields from scan results.
 * Maps scanner checkIds → ComplianceBlock doc-status fields and builds scan_summary.
 */
import type { Finding } from '../../types/common.types.js';
import type { ComplianceBlock } from '../../types/passport.types.js';

// --- Check ID → compliance field mapping ---

type DocFieldMapper = (pass: boolean, date: string) => Partial<ComplianceBlock>;

const DOC_CHECK_TO_FIELD = new Map<string, DocFieldMapper>([
  ['fria', (p) => ({ fria_completed: p })],
  ['risk-management', (p, d) => ({ risk_management: { documented: p, last_review: d } })],
  ['data-governance', (p, d) => ({ data_governance: { documented: p, last_audit: d } })],
  ['technical-documentation', (p, d) => ({ technical_documentation: { documented: p, last_update: d } })],
  ['declaration-of-conformity', (p, d) => ({ declaration_of_conformity: { documented: p, date: d } })],
  ['art5-screening', (p, d) => ({ art5_screening: { completed: p, date: d } })],
  ['instructions-for-use', (p, d) => ({ instructions_for_use: { documented: p, last_update: d } })],
]);

/**
 * Derive document-status compliance fields from scan findings.
 * Looks at L1/L2 findings whose checkId starts with a known doc prefix.
 * A finding with type 'pass' → documented/completed = true.
 */
export const deriveDocStatusFromFindings = (
  findings: readonly Finding[],
  scanDate?: string,
): Partial<ComplianceBlock> => {
  const date = scanDate ?? new Date().toISOString();
  let result: Partial<ComplianceBlock> = {};

  for (const [prefix, mapper] of DOC_CHECK_TO_FIELD) {
    const match = findings.find(
      (f) => f.checkId === prefix || f.checkId.startsWith(`${prefix}-`) || f.checkId.startsWith(`l1-${prefix}`) || f.checkId.startsWith(`l2-${prefix}`),
    );
    if (match) {
      result = { ...result, ...mapper(match.type === 'pass', date) };
    }
  }

  return result;
};

/**
 * Build a scan_summary block from a findings array — computes totals from findings directly.
 * Accepts a filtered subset of findings (e.g. per-agent) rather than the full ScanResult.
 */
export const buildScanSummary = (
  findings: readonly Finding[],
  scanDate: string,
): ComplianceBlock['scan_summary'] => {
  const byCategory: Record<string, { passed: number; failed: number }> = {};
  const failedChecks: string[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const finding of findings) {
    if (finding.type === 'pass') passed++;
    else if (finding.type === 'fail') failed++;
    else if (finding.type === 'skip') skipped++;

    // Extract category from checkId (e.g. "risk-management" from "l1-risk-management")
    const category = extractCategory(finding.checkId);

    if (!byCategory[category]) {
      byCategory[category] = { passed: 0, failed: 0 };
    }

    if (finding.type === 'pass') {
      byCategory[category].passed++;
    } else if (finding.type === 'fail') {
      byCategory[category].failed++;
      failedChecks.push(finding.checkId);
    }
  }

  return {
    total_checks: passed + failed + skipped,
    passed,
    failed,
    skipped,
    by_category: byCategory,
    failed_checks: failedChecks,
    scan_date: scanDate,
  };
};

/** Known multi-segment category names (3+ words) that must not be truncated. */
const KNOWN_CATEGORIES: readonly string[] = [
  'declaration-of-conformity',
  'instructions-for-use',
  'art5-screening',
  'technical-documentation',
  'risk-management',
  'data-governance',
  'worker-notification',
  'monitoring-policy',
  'incident-report',
  'banned-with-wrapper',
];

/**
 * Extract semantic category from a checkId.
 * Strips layer prefix (l1-, l2-, l3-, l4-, l5-, cross-, ext-) if present,
 * then matches against known multi-segment categories before falling back
 * to first-two-segment truncation.
 */
const extractCategory = (checkId: string): string => {
  const stripped = checkId.replace(/^(?:l[1-5]-|cross-)/, '');

  // Check against known multi-segment categories first
  for (const known of KNOWN_CATEGORIES) {
    if (stripped === known || stripped.startsWith(known + '-')) return known;
  }

  // For external tool findings, keep the tool prefix (ext-semgrep, ext-detect)
  if (stripped.startsWith('ext-')) {
    const parts = stripped.split('-');
    return parts.slice(0, 2).join('-');
  }

  // Default: first two segments
  const parts = stripped.split('-');
  if (parts.length <= 2) return stripped;
  return parts.slice(0, 2).join('-');
};
