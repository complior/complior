/**
 * Web Search Evidence Collector — §3.7.1
 * Runs 5 web searches per tool to gather real compliance evidence.
 *
 * Queries per tool:
 * 1. "{tool_name} EU AI Act compliance" → eu_ai_act_media_mentions
 * 2. "{tool_name} bias audit report" → has_public_bias_audit, bias_audit_url
 * 3. "{tool_name} privacy lawsuit GDPR fine" → gdpr_enforcement_history
 * 4. "{tool_name} data breach security incident" → security_incidents
 * 5. "{provider} transparency report 2025 2026" → has_transparency_report
 */

import type { WebSearchOverrides } from './parsers.js';

export interface WebSearchQuery {
  readonly query: string;
  readonly field: keyof WebSearchOverrides;
}

export function buildSearchQueries(
  toolName: string,
  providerName: string,
): readonly WebSearchQuery[] {
  return [
    { query: `"${toolName}" EU AI Act compliance`, field: 'eu_ai_act_media_mentions' },
    { query: `"${toolName}" bias audit report`, field: 'has_public_bias_audit' },
    { query: `"${toolName}" privacy lawsuit GDPR fine`, field: 'gdpr_enforcement_history' },
    { query: `"${toolName}" data breach security incident`, field: 'security_incidents' },
    { query: `"${providerName}" transparency report 2025 2026`, field: 'has_transparency_report' },
  ];
}

export interface SearchResult {
  readonly query: string;
  readonly resultCount: number;
  readonly topResults: readonly { title: string; snippet: string; url: string }[];
}

/**
 * Parse search results into WebSearchOverrides.
 */
export function parseSearchResults(results: readonly SearchResult[]): WebSearchOverrides {
  let euAiActMentions = 0;
  let hasPublicBiasAudit = false;
  let biasAuditUrl: string | null = null;
  const gdprHistory: string[] = [];
  const securityIncidents: string[] = [];
  let hasTransparencyReport = false;

  for (const r of results) {
    // EU AI Act mentions
    if (r.query.includes('EU AI Act compliance')) {
      euAiActMentions = r.resultCount;
    }

    // Bias audit
    if (r.query.includes('bias audit')) {
      hasPublicBiasAudit = r.resultCount > 0;
      if (r.topResults.length > 0) {
        const auditResult = r.topResults.find(
          t => /bias\s*audit/i.test(t.title) || /bias\s*audit/i.test(t.snippet),
        );
        if (auditResult) biasAuditUrl = auditResult.url;
      }
    }

    // GDPR enforcement
    if (r.query.includes('GDPR fine')) {
      for (const t of r.topResults) {
        if (/fine|penalty|enforcement|sanction|violation/i.test(t.snippet)) {
          gdprHistory.push(t.title.slice(0, 120));
        }
      }
    }

    // Security incidents
    if (r.query.includes('data breach')) {
      for (const t of r.topResults) {
        if (/breach|incident|leak|hack|vulnerabilit/i.test(t.snippet)) {
          securityIncidents.push(t.title.slice(0, 120));
        }
      }
    }

    // Transparency report
    if (r.query.includes('transparency report')) {
      hasTransparencyReport = r.topResults.some(
        t => /transparency\s*report/i.test(t.title) || /transparency\s*report/i.test(t.snippet),
      );
    }
  }

  return {
    eu_ai_act_media_mentions: euAiActMentions,
    has_public_bias_audit: hasPublicBiasAudit,
    bias_audit_url: biasAuditUrl,
    gdpr_enforcement_history: gdprHistory.slice(0, 5),
    security_incidents: securityIncidents.slice(0, 5),
    has_transparency_report: hasTransparencyReport,
  };
}
