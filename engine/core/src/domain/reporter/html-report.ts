import { generateReportHtml } from './html-renderer.js';
import type { ComplianceReport } from './types.js';

/**
 * V1-M22 / A-2: Build HTML report with zero placeholder leakage.
 * This is a thin wrapper around generateReportHtml that ensures
 * no template substitution failures (no $1, $2, {{placeholder}}, __PLACEHOLDER__).
 *
 * Also provides sensible defaults for optional/incomplete report data
 * so that partial mocks (e.g. from unit tests) can render the profile section
 * without requiring all ComplianceReport fields.
 */
export const buildHtmlReport = (input: unknown): string => {
  // Merge input with defaults for all required ComplianceReport fields
  const defaults: ComplianceReport = {
    generatedAt: new Date().toISOString(),
    compliorVersion: '1.0.0',
    readiness: {
      readinessScore: 0,
      zone: 'yellow',
      dimensions: {
        scan: { score: null, weight: 0, available: false },
        scanSecurity: { score: null, weight: 0, available: false },
        scanLlm: { score: null, weight: 0, available: false },
        docs: { score: null, weight: 0, available: false },
        documents: { score: null, weight: 0, available: false },
        passports: { score: null, weight: 0, available: false },
        eval: { score: null, weight: 0, available: false },
        evidence: { score: null, weight: 0, available: false },
      },
      trend: null,
      criticalCaps: [],
      daysUntilEnforcement: 0,
    },
    documents: { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, score: 0, documents: [] },
    obligations: { total: 0, covered: 0, uncovered: 0, coveragePercent: 0, byArticle: [], critical: [], excludedCount: 0 },
    passports: { totalAgents: 0, passports: [], averageCompleteness: 0 },
    actionPlan: { actions: [], totalActions: 0, shownActions: 0 },
    summary: {
      readinessScore: 0, zone: 'yellow', scanScore: null, evalScore: null,
      documentsTotal: 0, documentsReviewed: 0, obligationsTotal: 0, obligationsCovered: 0,
      passportsTotal: 0, passportsComplete: 0, evidenceChainLength: 0, evidenceVerified: false,
      totalFindings: 0, criticalFindings: 0, autoFixable: 0,
      daysUntilEnforcement: 0, enforcementDate: '', generatedAt: new Date().toISOString(), compliorVersion: '1.0.0',
    },
    findings: [],
    evalResults: null,
    fixHistory: [],
    documentContents: [],
  };

  const inp = input as Record<string, unknown>;

  // Only use input value for a field if it is a non-null object (not array/primitive).
  // This prevents partial mocks with obligations: [] from overriding the obligations default.
  const isObject = (v: unknown): v is Record<string, unknown> =>
    v !== null && typeof v === 'object' && !Array.isArray(v);

  const report: ComplianceReport = {
    ...defaults,
    generatedAt: isObject(inp) && typeof inp.generatedAt === 'string' ? inp.generatedAt : defaults.generatedAt,
    compliorVersion: isObject(inp) && typeof inp.compliorVersion === 'string' ? inp.compliorVersion : defaults.compliorVersion,
    readiness: isObject(inp) && isObject(inp.readiness) ? { ...defaults.readiness, ...(inp.readiness as Record<string, unknown>) } : defaults.readiness,
    documents: isObject(inp) && isObject(inp.documents) ? { ...defaults.documents, ...(inp.documents as Record<string, unknown>) } as typeof defaults.documents : defaults.documents,
    obligations: isObject(inp) && isObject(inp.obligations) ? { ...defaults.obligations, ...(inp.obligations as Record<string, unknown>) } as typeof defaults.obligations : defaults.obligations,
    passports: isObject(inp) && isObject(inp.passports) ? { ...defaults.passports, ...(inp.passports as Record<string, unknown>) } as typeof defaults.passports : defaults.passports,
    actionPlan: isObject(inp) && isObject(inp.actionPlan) ? { ...defaults.actionPlan, ...(inp.actionPlan as Record<string, unknown>) } as typeof defaults.actionPlan : defaults.actionPlan,
    summary: isObject(inp) && isObject(inp.summary) ? { ...defaults.summary, ...(inp.summary as Record<string, unknown>) } as typeof defaults.summary : defaults.summary,
    findings: Array.isArray(inp.findings) ? inp.findings as ComplianceReport['findings'] : defaults.findings,
    evalResults: inp.evalResults !== undefined ? inp.evalResults as ComplianceReport['evalResults'] : defaults.evalResults,
    fixHistory: Array.isArray(inp.fixHistory) ? inp.fixHistory as ComplianceReport['fixHistory'] : defaults.fixHistory,
    documentContents: Array.isArray(inp.documentContents) ? inp.documentContents as ComplianceReport['documentContents'] : defaults.documentContents,
    // profile is optional — only include if present and non-null in input
    ...(isObject(inp) && inp.profile !== undefined && inp.profile !== null
      ? { profile: inp.profile as ComplianceReport['profile'] }
      : {}),
  };

  const html = generateReportHtml(report);

  // Sanity check: verify no unsubstituted template placeholders.
  // We check for {{placeholder}} and __PLACEHOLDER__ patterns anywhere in the HTML.
  // For $N patterns, we exclude <script> tag bodies — the $1/$2 in regex replacements
  // like .replace(/^## (.+)$/gm,'<h3>$1</h3>') are legitimate JavaScript (not visible to users).
  // The original V1-M21 bug was literal <h2>$1</h2> in rendered HTML, not JS code.
  const bracesPat = /\{\{[A-Za-z_][A-Za-z0-9_]*\}\}/;
  const underscorePat = /__[A-Z_]{3,}__/;

  // Strip <script> and <style> tag bodies — $1/$2 in JS regex is NOT a bug
  // Also strip data-md attribute values (may contain markdown with $N in code samples)
  const stripHiddenContext = (s: string): string =>
    s
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/\sdata-md="[^"]*"/gi, '');

  const strippedHtml = stripHiddenContext(html);
  const dollarPat = /\$[0-9]/;
  if (dollarPat.test(strippedHtml) || bracesPat.test(html) || underscorePat.test(html)) {
    throw new Error('HTML report contains unsubstituted placeholders');
  }

  return html;
};
