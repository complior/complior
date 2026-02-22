import type { PassiveScanData, ObligationAssessment, RegistryConfidence, RegistryTool, LlmTestResult, JurisdictionAssessment } from './types.js';

type ObligationStatus = 'met' | 'partially_met' | 'not_met' | 'unknown';

// --- Evidence → Obligation status mapping ---

interface EvidenceRule {
  readonly obligation_id: string;
  readonly evaluate: (scan: PassiveScanData) => ObligationStatus;
  readonly summarize: (scan: PassiveScanData) => string | null;
}

const EVIDENCE_RULES: readonly EvidenceRule[] = [
  // OBL-001: AI Literacy (can't verify from passive scan)
  {
    obligation_id: 'OBL-001',
    evaluate: () => 'unknown',
    summarize: () => null,
  },

  // OBL-015: AI Interaction Disclosure
  {
    obligation_id: 'OBL-015',
    evaluate: (s) => {
      if (s.disclosure.visible && s.disclosure.text) return 'met';
      if (s.disclosure.location !== 'none') return 'partially_met';
      return 'not_met';
    },
    summarize: (s) =>
      s.disclosure.visible
        ? `Disclosure visible at ${s.disclosure.location}: "${s.disclosure.text?.slice(0, 80)}"`
        : 'No visible AI disclosure found on homepage',
  },

  // OBL-016: Machine-Readable Content Marking
  {
    obligation_id: 'OBL-016',
    evaluate: (s) => {
      if (s.content_marking.c2pa) return 'met';
      if (s.content_marking.watermark || s.content_marking.exif_ai_tag) return 'partially_met';
      return 'unknown'; // Many tools don't generate content
    },
    summarize: (s) => {
      const marks = [];
      if (s.content_marking.c2pa) marks.push('C2PA');
      if (s.content_marking.watermark) marks.push('watermark');
      if (s.content_marking.exif_ai_tag) marks.push('EXIF AI tag');
      return marks.length > 0 ? `Content marking: ${marks.join(', ')}` : null;
    },
  },

  // OBL-016a: Content Marking sub-obligation
  {
    obligation_id: 'OBL-016a',
    evaluate: (s) => {
      if (s.content_marking.c2pa && s.content_marking.watermark) return 'met';
      if (s.content_marking.c2pa || s.content_marking.watermark) return 'partially_met';
      return 'unknown';
    },
    summarize: () => null,
  },

  // OBL-017: Emotion Recognition / Biometric Notification
  {
    obligation_id: 'OBL-017',
    evaluate: () => 'unknown', // Requires active testing
    summarize: () => null,
  },

  // OBL-018: Deep Fake Labeling
  {
    obligation_id: 'OBL-018',
    evaluate: (s) => {
      if (s.content_marking.c2pa || s.content_marking.watermark) return 'partially_met';
      return 'unknown';
    },
    summarize: () => null,
  },

  // OBL-022: GPAI Technical Documentation
  {
    obligation_id: 'OBL-022',
    evaluate: (s) => {
      if (s.model_card.has_model_card && s.model_card.has_training_data && s.model_card.has_evaluation) return 'met';
      if (s.model_card.has_model_card) return 'partially_met';
      return 'not_met';
    },
    summarize: (s) =>
      s.model_card.has_model_card
        ? `Model card found at ${s.model_card.model_card_url}`
        : 'No model card found',
  },

  // OBL-025: Regulatory Cooperation
  {
    obligation_id: 'OBL-025',
    evaluate: (s) => {
      if (s.trust.mentions_ai_act && s.trust.has_eu_ai_act_page) return 'met';
      if (s.trust.mentions_ai_act || s.trust.has_responsible_ai_page) return 'partially_met';
      if (s.web_search.eu_ai_act_media_mentions > 0 || s.web_search.has_transparency_report) return 'partially_met';
      return 'unknown';
    },
    summarize: (s) => {
      const parts: string[] = [];
      if (s.trust.mentions_ai_act) parts.push('EU AI Act mentioned on trust/compliance page');
      if (s.web_search.eu_ai_act_media_mentions > 0) parts.push(`${s.web_search.eu_ai_act_media_mentions} media mentions`);
      if (s.web_search.has_transparency_report) parts.push('has transparency report');
      return parts.length > 0 ? parts.join('; ') : null;
    },
  },

  // OBL-023: Systemic Risk — Adversarial Testing (gpai_systemic only)
  {
    obligation_id: 'OBL-023',
    evaluate: (s) => {
      if (s.web_search.has_public_bias_audit && s.trust.has_responsible_ai_page) return 'partially_met';
      if (s.web_search.has_public_bias_audit) return 'partially_met';
      return 'unknown';
    },
    summarize: (s) =>
      s.web_search.has_public_bias_audit
        ? `Public bias audit: ${s.web_search.bias_audit_url ?? 'found'}`
        : null,
  },

  // OBL-024: Systemic Risk — Incident Reporting
  {
    obligation_id: 'OBL-024',
    evaluate: (s) => {
      if (s.web_search.security_incidents.length > 0) return 'not_met';
      if (s.web_search.gdpr_enforcement_history.length > 0) return 'partially_met';
      return 'unknown';
    },
    summarize: (s) => {
      const items: string[] = [];
      if (s.web_search.security_incidents.length > 0) items.push(`Security incidents: ${s.web_search.security_incidents.join(', ')}`);
      if (s.web_search.gdpr_enforcement_history.length > 0) items.push(`GDPR history: ${s.web_search.gdpr_enforcement_history.join(', ')}`);
      return items.length > 0 ? items.join('; ') : null;
    },
  },
];

// Privacy policy checks applicable to multiple obligations
const PRIVACY_RULES: readonly EvidenceRule[] = [
  // OBL-003: Risk Management (inferred from privacy + responsible AI)
  {
    obligation_id: 'OBL-003',
    evaluate: (s) => {
      if (s.trust.has_responsible_ai_page && s.privacy_policy.mentions_ai) return 'partially_met';
      return 'unknown';
    },
    summarize: (s) =>
      s.trust.has_responsible_ai_page ? 'Responsible AI page exists' : null,
  },

  // OBL-007: Transparency & Instructions for Use
  {
    obligation_id: 'OBL-007',
    evaluate: (s) => {
      if (s.disclosure.visible && s.privacy_policy.mentions_ai && s.infra.has_public_api) return 'met';
      if (s.disclosure.visible || s.privacy_policy.mentions_ai) return 'partially_met';
      return 'not_met';
    },
    summarize: (s) => {
      const parts = [];
      if (s.disclosure.visible) parts.push('AI disclosure visible');
      if (s.privacy_policy.mentions_ai) parts.push('privacy policy mentions AI');
      if (s.infra.has_public_api) parts.push('API docs available');
      return parts.length > 0 ? parts.join('; ') : null;
    },
  },

  // OBL-011: Deployer - GDPR / data handling
  {
    obligation_id: 'OBL-011',
    evaluate: (s) => {
      const checks = [
        s.privacy_policy.mentions_eu,
        s.privacy_policy.gdpr_compliant,
        s.privacy_policy.retention_specified,
        s.privacy_policy.deletion_right,
      ];
      const passed = checks.filter(Boolean).length;
      if (passed >= 3) return 'met';
      if (passed >= 1) return 'partially_met';
      return 'not_met';
    },
    summarize: (s) => {
      const items = [];
      if (s.privacy_policy.mentions_eu) items.push('EU mentioned');
      if (s.privacy_policy.gdpr_compliant) items.push('GDPR compliant');
      if (s.privacy_policy.retention_specified) items.push(`retention: ${s.privacy_policy.retention_period}`);
      if (s.privacy_policy.deletion_right) items.push('deletion right');
      return items.length > 0 ? `Privacy: ${items.join(', ')}` : null;
    },
  },
];

const ALL_RULES = [...EVIDENCE_RULES, ...PRIVACY_RULES];
const RULES_MAP = new Map(ALL_RULES.map(r => [r.obligation_id, r]));

// --- Scoring engine ---

export function evaluateObligationFromScan(
  obligationId: string,
  scan: PassiveScanData,
): { status: ObligationStatus; evidence_summary: string | null } {
  const rule = RULES_MAP.get(obligationId);
  if (!rule) {
    return { status: 'unknown', evidence_summary: null };
  }
  return {
    status: rule.evaluate(scan),
    evidence_summary: rule.summarize(scan),
  };
}

export function scoreFromObligations(
  obligations: readonly ObligationAssessment[],
): number | null {
  const scorable = obligations.filter(o => o.status !== 'unknown');
  if (scorable.length === 0) return null;

  const statusScore: Record<ObligationStatus, number> = {
    met: 100,
    partially_met: 50,
    not_met: 0,
    unknown: 0,
  };

  // Weight by severity
  const severityWeight: Record<string, number> = {
    critical: 3,
    high: 2,
    medium: 1,
    low: 0.5,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const obl of scorable) {
    const w = severityWeight[obl.severity] ?? 1;
    weightedSum += statusScore[obl.status] * w;
    totalWeight += w;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
}

export function determineConfidence(
  obligations: readonly ObligationAssessment[],
  hasPassiveScan: boolean,
  hasLlmTests: boolean,
  hasHumanTests: boolean,
): RegistryConfidence {
  if (hasHumanTests && hasLlmTests && hasPassiveScan) return 'verified';
  if (hasPassiveScan) {
    const known = obligations.filter(o => o.status !== 'unknown').length;
    const ratio = obligations.length > 0 ? known / obligations.length : 0;
    return ratio >= 0.5 ? 'high' : 'approximate';
  }
  return 'approximate';
}

export function updateAssessmentWithScan(
  assessment: ObligationAssessment,
  scan: PassiveScanData,
): ObligationAssessment {
  const { status, evidence_summary } = evaluateObligationFromScan(assessment.obligation_id, scan);
  // Only update if we have better info than 'unknown'
  if (status === 'unknown' && assessment.status !== 'unknown') {
    return assessment;
  }
  return {
    ...assessment,
    status,
    evidence_summary,
  };
}

/**
 * Apply passive scan data and optional LLM test results to a tool.
 * Updates all obligation assessments, computes score and confidence,
 * and promotes level to 'scanned'.
 */
export function applyPassiveScanToTool(
  tool: RegistryTool,
  scan: PassiveScanData,
  llmTests: readonly LlmTestResult[] | null,
): RegistryTool {
  const euAssessment = tool.assessments['eu-ai-act'];
  if (!euAssessment) return tool;

  // Update each obligation with scan evidence
  const updatedDeployer = euAssessment.deployer_obligations.map(o =>
    updateAssessmentWithScan(o, scan),
  );
  const updatedProvider = euAssessment.provider_obligations.map(o =>
    updateAssessmentWithScan(o, scan),
  );

  // Enrich LLM-related obligations from test results
  const enrichedProvider = llmTests
    ? enrichWithLlmTests(updatedProvider, llmTests)
    : updatedProvider;
  const enrichedDeployer = llmTests
    ? enrichWithLlmTests(updatedDeployer, llmTests)
    : updatedDeployer;

  const allObligations = [...enrichedDeployer, ...enrichedProvider];
  const score = scoreFromObligations(allObligations);
  const confidence = determineConfidence(allObligations, true, llmTests !== null, false);

  const updatedAssessment: JurisdictionAssessment = {
    ...euAssessment,
    deployer_obligations: enrichedDeployer,
    provider_obligations: enrichedProvider,
    score,
    confidence,
    assessed_at: new Date().toISOString(),
  };

  return {
    ...tool,
    level: 'scanned',
    evidence: {
      ...tool.evidence,
      passive_scan: scan,
      llm_tests: llmTests ? [...llmTests] : null,
    },
    assessments: {
      ...tool.assessments,
      'eu-ai-act': updatedAssessment,
    },
    updated_at: new Date().toISOString(),
  };
}

/**
 * Enrich obligation assessments with LLM test results.
 * Maps test groups to obligation IDs:
 *   identity → OBL-015, safety → OBL-002a, bias → OBL-004a, factual → OBL-022
 */
function enrichWithLlmTests(
  obligations: readonly ObligationAssessment[],
  tests: readonly LlmTestResult[],
): ObligationAssessment[] {
  const groupToObligation: Record<string, string> = {
    identity: 'OBL-015',
    safety: 'OBL-002a',
    bias: 'OBL-004a',
    factual: 'OBL-022',
  };

  const groupResults = new Map<string, { total: number; passed: number }>();
  for (const t of tests) {
    const oblId = groupToObligation[t.group];
    if (!oblId) continue;
    const existing = groupResults.get(oblId) ?? { total: 0, passed: 0 };
    existing.total++;
    if (t.passed) existing.passed++;
    groupResults.set(oblId, existing);
  }

  return obligations.map(obl => {
    const result = groupResults.get(obl.obligation_id);
    if (!result) return obl;

    const ratio = result.passed / result.total;
    const status: ObligationStatus = ratio >= 0.67 ? 'met' : ratio >= 0.33 ? 'partially_met' : 'not_met';
    const summary = `LLM tests: ${result.passed}/${result.total} passed`;

    // Only override if LLM tests give better info
    if (obl.status !== 'unknown' && status === 'not_met') return obl;

    return {
      ...obl,
      status,
      evidence_summary: obl.evidence_summary
        ? `${obl.evidence_summary}; ${summary}`
        : summary,
    };
  });
}
