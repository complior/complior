import { z } from 'zod';
import type { AgentManifest } from '../../../types/passport.types.js';

// --- AIUC-1 Compliance Profile Schema ---

const DomainStatusSchema = z.object({
  status: z.enum(['not_assessed', 'partial', 'compliant']),
  findings: z.array(z.string()),
  coveragePercent: z.number().min(0).max(100),
});

export const AIUC1ProfileSchema = z.object({
  framework: z.literal('AIUC-1'),
  version: z.literal('1.0'),
  agent: z.object({ name: z.string(), id: z.string(), version: z.string() }),
  domains: z.object({
    a_data_privacy: DomainStatusSchema,
    b_security: DomainStatusSchema,
    c_safety: DomainStatusSchema,
    d_reliability: DomainStatusSchema,
    e_accountability: DomainStatusSchema,
    f_society: DomainStatusSchema,
  }),
  overallReadiness: z.number().min(0).max(100),
  assessmentDate: z.string(),
});

export type AIUC1Profile = z.infer<typeof AIUC1ProfileSchema>;

type DomainStatus = z.infer<typeof DomainStatusSchema>;

// --- Shared assessment helper (DRY: used by all 6 domain assessors) ---

interface DomainCheck {
  readonly filled: boolean;
  readonly label: string;
}

const assessDomain = (checks: readonly DomainCheck[]): DomainStatus => {
  const passed = checks.filter(c => c.filled);
  const total = checks.length;
  const ratio = total === 0 ? 0 : passed.length / total;

  return {
    status: ratio >= 1 ? 'compliant' : ratio > 0 ? 'partial' : 'not_assessed',
    findings: passed.map(c => c.label),
    coveragePercent: Math.round(ratio * 100),
  };
};

// --- Domain assessors (pure functions, each returns checklist for its domain) ---

const dataPrivacyChecks = (m: AgentManifest): readonly DomainCheck[] => [
  { filled: m.disclosure.user_facing, label: 'User-facing disclosure configured' },
  { filled: m.disclosure.disclosure_text !== '', label: 'Disclosure text provided' },
  { filled: m.disclosure.ai_marking.responses_marked, label: 'AI marking enabled' },
  { filled: m.logging.actions_logged, label: 'Actions logging enabled' },
  { filled: m.model.data_residency !== '', label: 'Data residency specified' },
];

const securityChecks = (m: AgentManifest): readonly DomainCheck[] => [
  { filled: m.constraints.rate_limits.max_actions_per_minute > 0, label: 'Rate limits configured' },
  { filled: m.constraints.budget.max_cost_per_session_usd > 0, label: 'Budget limits set' },
  { filled: m.permissions.denied.length > 0, label: 'Denied permissions defined' },
  { filled: m.constraints.human_approval_required.length > 0, label: 'Human approval gates defined' },
];

const safetyChecks = (m: AgentManifest): readonly DomainCheck[] => [
  { filled: true, label: `Autonomy level assessed: ${m.autonomy_level}` },
  { filled: m.constraints.human_approval_required.length > 0, label: 'Human approval required for critical actions' },
  { filled: m.compliance.fria_completed === true, label: 'FRIA completed' },
  { filled: m.autonomy_evidence.human_approval_gates > 0, label: 'Human approval gates present' },
];

const reliabilityChecks = (m: AgentManifest): readonly DomainCheck[] => [
  { filled: m.compliance.complior_score > 0, label: `Complior score: ${m.compliance.complior_score}` },
  { filled: m.logging.includes_decision_rationale, label: 'Decision rationale logging enabled' },
  { filled: m.compliance.last_scan !== '', label: 'Compliance scan performed' },
  { filled: m.source.confidence > 0.5, label: `Source confidence: ${Math.round(m.source.confidence * 100)}%` },
];

const accountabilityChecks = (m: AgentManifest): readonly DomainCheck[] => [
  { filled: m.logging.actions_logged, label: 'Actions logged' },
  { filled: m.logging.retention_days > 0, label: `Retention: ${m.logging.retention_days} days` },
  { filled: m.owner.responsible_person !== '', label: `Responsible person: ${m.owner.responsible_person}` },
  { filled: m.owner.contact !== '', label: 'Contact information provided' },
  { filled: m.lifecycle.review_frequency_days > 0, label: `Review frequency: ${m.lifecycle.review_frequency_days} days` },
];

const societyChecks = (m: AgentManifest): readonly DomainCheck[] => [
  { filled: m.constraints.prohibited_actions.length > 0, label: 'Prohibited actions policy defined' },
  { filled: true, label: `EU AI Act risk class: ${m.compliance.eu_ai_act.risk_class}` },
  { filled: m.compliance.eu_ai_act.applicable_articles.length > 0, label: 'Applicable articles identified' },
  { filled: m.compliance.worker_notification_sent === true, label: 'Worker notification sent' },
];

// --- Main export function ---

export const mapToAIUC1 = (manifest: AgentManifest): AIUC1Profile => {
  const domains = {
    a_data_privacy: assessDomain(dataPrivacyChecks(manifest)),
    b_security: assessDomain(securityChecks(manifest)),
    c_safety: assessDomain(safetyChecks(manifest)),
    d_reliability: assessDomain(reliabilityChecks(manifest)),
    e_accountability: assessDomain(accountabilityChecks(manifest)),
    f_society: assessDomain(societyChecks(manifest)),
  };

  const allCoverages = Object.values(domains).map(d => d.coveragePercent);
  const overallReadiness = Math.round(
    allCoverages.reduce((sum, c) => sum + c, 0) / allCoverages.length,
  );

  return {
    framework: 'AIUC-1' as const,
    version: '1.0' as const,
    agent: {
      name: manifest.display_name,
      id: manifest.agent_id,
      version: manifest.version,
    },
    domains,
    overallReadiness,
    assessmentDate: new Date().toISOString(),
  };
};
