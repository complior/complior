/**
 * Pure domain functions to derive passport compliance fields from scan results.
 * Maps scanner checkIds → ComplianceBlock doc-status fields and builds scan_summary.
 */
import type { Finding } from '../../types/common.types.js';
import type { ComplianceBlock, DocQualityLevel } from '../../types/passport.types.js';

// --- Check ID → compliance field mapping ---

type DocFieldMapper = (pass: boolean, date: string, docQuality?: DocQualityLevel) => Partial<ComplianceBlock>;

const DOC_CHECK_TO_FIELD = new Map<string, DocFieldMapper>([
  ['fria', (p) => ({ fria_completed: p })],
  ['risk-management', (p, d, q) => ({ risk_management: { documented: p, last_review: d, doc_quality: q } })],
  ['data-governance', (p, d, q) => ({ data_governance: { documented: p, last_audit: d, doc_quality: q } })],
  ['technical-documentation', (p, d, q) => ({ technical_documentation: { documented: p, last_update: d, doc_quality: q } })],
  ['tech-documentation', (p, d, q) => ({ technical_documentation: { documented: p, last_update: d, doc_quality: q } })],
  ['declaration-of-conformity', (p, d, q) => ({ declaration_of_conformity: { documented: p, date: d, doc_quality: q } })],
  ['declaration-conformity', (p, d, q) => ({ declaration_of_conformity: { documented: p, date: d, doc_quality: q } })],
  ['art5-screening', (p, d, q) => ({ art5_screening: { completed: p, date: d, doc_quality: q } })],
  ['instructions-for-use', (p, d, q) => ({ instructions_for_use: { documented: p, last_update: d, doc_quality: q } })],
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
    const matches = findings.filter(
      (f) => f.checkId === prefix || f.checkId.startsWith(`${prefix}-`) || f.checkId.startsWith(`l1-${prefix}`) || f.checkId.startsWith(`l2-${prefix}`),
    );
    // Prefer worst-case: L2 SHALLOW (fail) overrides L1 presence (pass)
    const match = matches.find(f => f.type === 'fail') ?? matches[0];
    if (match) {
      // Extract docQuality from L2 finding (L1 findings won't have it)
      const docQuality = match.docQuality ?? (match.type === 'pass' ? 'draft' : 'none');
      result = { ...result, ...mapper(match.type === 'pass', date, docQuality) };
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

/**
 * Build a summary of document quality levels across all doc fields in the compliance block.
 * Counts how many docs are at each quality level (none, scaffold, draft, reviewed).
 */
export const buildDocQualitySummary = (
  compliance: Partial<ComplianceBlock>,
): ComplianceBlock['doc_quality_summary'] => {
  const summary = { none: 0, scaffold: 0, draft: 0, reviewed: 0 };

  const qualities: readonly (DocQualityLevel | undefined)[] = [
    compliance.risk_management?.doc_quality,
    compliance.data_governance?.doc_quality,
    compliance.technical_documentation?.doc_quality,
    compliance.declaration_of_conformity?.doc_quality,
    compliance.art5_screening?.doc_quality,
    compliance.instructions_for_use?.doc_quality,
  ];

  for (const quality of qualities) {
    if (quality !== undefined && quality in summary) {
      summary[quality]++;
    } else {
      summary.none++;
    }
  }

  return summary;
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
