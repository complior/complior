import type { DocumentValidator } from './layers/layer2-docs.js';
import { TEMPLATE_REGISTRY } from '../../data/template-registry.js';

/**
 * Map from L2 validator document name → template-registry docType.
 * Only entries where names differ need explicit mapping;
 * for identical names the lookup falls through to direct match.
 */
const VALIDATOR_TO_DOCTYPE: Record<string, string> = {
  'tech-documentation': 'technical-documentation',
  'declaration-conformity': 'declaration-of-conformity',
};

/** Look up obligation/article from template-registry (single source of truth). */
const fromRegistry = (document: string): { obligation: string; article: string } | undefined => {
  const docType = VALIDATOR_TO_DOCTYPE[document] ?? document;
  const entry = TEMPLATE_REGISTRY.find((e) => e.docType === docType);
  if (!entry) return undefined;
  return { obligation: entry.obligationId, article: entry.article };
};

/** Helper to build a validator, deriving obligation/article from registry when available. */
const v = (
  document: string,
  file_patterns: readonly string[],
  required_sections: DocumentValidator['required_sections'],
  fallback?: { obligation: string; article: string },
): DocumentValidator => {
  const registry = fromRegistry(document);
  const { obligation, article } = registry ?? fallback ?? { obligation: '', article: '' };
  return { document, obligation, article, file_patterns, required_sections };
};

export const DOCUMENT_VALIDATORS: readonly DocumentValidator[] = [
  v('ai-literacy',
    ['AI-LITERACY.md', 'AI_LITERACY.md', 'ai-literacy.md', 'ai-literacy-policy.md'],
    [
      { title: 'Training Program', required: true },
      { title: 'Training Levels', required: true },
      { title: 'Assessment Methods', required: true },
      { title: 'Record Keeping', required: false },
      { title: 'Roles and Responsibilities', required: false },
    ],
  ),
  v('art5-screening',
    ['ART5-SCREENING.md', 'ART5_SCREENING.md', 'art5-screening.md', 'prohibited-practices.md'],
    [
      { title: 'Prohibited Practices', required: true },
      { title: 'Screening Results', required: true },
      { title: 'Mitigations', required: true },
      { title: 'Risk Assessment', required: false },
      { title: 'Review Schedule', required: false },
    ],
  ),
  v('tech-documentation',
    [
      'TECH-DOCUMENTATION.md', 'TECH_DOCUMENTATION.md', 'tech-documentation.md',
      'technical-documentation.md', 'TECHNICAL-DOCUMENTATION.md',
    ],
    [
      { title: 'General Description', required: true },
      { title: 'System Elements', required: true },
      { title: 'Monitoring, Functioning and Control', required: true },
      { title: 'Validation and Testing', required: true },
      { title: 'Accuracy, Robustness and Cybersecurity', required: true },
      { title: 'Risk Management', required: false },
      { title: 'Changes Throughout Lifecycle', required: false },
      { title: 'Standards and Conformity', required: false },
    ],
  ),
  v('monitoring-policy',
    ['MONITORING-POLICY.md', 'MONITORING_POLICY.md', 'monitoring-policy.md', 'ai-monitoring-policy.md'],
    [
      { title: 'Monitoring Scope', required: true },
      { title: 'Frequency', required: true },
      { title: 'Escalation Procedures', required: true },
      { title: 'Responsible Parties', required: false },
      { title: 'Reporting Requirements', required: false },
    ],
  ),
  v('worker-notification',
    ['WORKER-NOTIFICATION.md', 'WORKER_NOTIFICATION.md', 'worker-notification.md', 'employee-ai-notification.md'],
    [
      { title: 'Notification Scope', required: true },
      { title: 'Affected Workers', required: true },
      { title: 'Timeline', required: true },
      { title: 'Delivery Tracking', required: true },
      { title: 'Worker Rights', required: false },
      { title: 'Acknowledgment', required: false },
    ],
  ),
  v('fria',
    ['FRIA.md', 'fria.md', 'fundamental-rights-impact-assessment.md', 'FUNDAMENTAL-RIGHTS-IMPACT-ASSESSMENT.md'],
    [
      { title: 'Risk Assessment', required: true },
      { title: 'Impact Analysis', required: true },
      { title: 'Mitigation Measures', required: true },
      { title: 'Stakeholder Consultation', required: false },
      { title: 'Monitoring Plan', required: false },
    ],
  ),
  v('declaration-conformity',
    [
      'DECLARATION-OF-CONFORMITY.md', 'DECLARATION_OF_CONFORMITY.md',
      'declaration-of-conformity.md', 'declaration-conformity.md', 'CONFORMITY.md',
    ],
    [
      { title: 'Conformity Statement', required: true },
      { title: 'Standards Applied', required: true },
      { title: 'Evidence', required: true },
      { title: 'Signatory', required: false },
      { title: 'Date of Declaration', required: false },
    ],
  ),
  v('incident-report',
    ['INCIDENT-REPORT.md', 'INCIDENT_REPORT.md', 'incident-report.md', 'ai-incident-report.md'],
    [
      { title: 'Incident Description', required: true },
      { title: 'Root Cause', required: true },
      { title: 'Corrective Measures', required: true },
      { title: 'Timeline of Events', required: true },
      { title: 'Affected Persons', required: false },
      { title: 'Lessons Learned', required: false },
    ],
  ),
  v('risk-management',
    [
      'RISK-MANAGEMENT.md', 'RISK_MANAGEMENT.md', 'risk-management.md',
      'RISK-REGISTER.md', 'risk-register.md', 'risk-management-system.md',
    ],
    [
      { title: 'Known Risks', required: true },
      { title: 'Misuse Scenarios', required: true },
      { title: 'Residual Risk Assessment', required: true },
      { title: 'Test Results', required: false },
      { title: 'Mitigation Measures', required: false },
    ],
  ),
  v('data-governance',
    [
      'DATA-GOVERNANCE.md', 'DATA_GOVERNANCE.md', 'data-governance.md',
      'DATA-QUALITY.md', 'data-quality.md', 'data-governance-policy.md',
    ],
    [
      { title: 'Data Sources', required: true },
      { title: 'Collection Methods', required: true },
      { title: 'Quality Metrics', required: true },
      { title: 'Bias Analysis', required: false },
      { title: 'Representativeness', required: false },
    ],
  ),
  v('qms',
    [
      'QMS.md', 'QUALITY-MANAGEMENT.md', 'quality-management-system.md',
      'QUALITY_MANAGEMENT.md', 'qms-policy.md',
    ],
    [
      { title: 'Compliance Strategy', required: true },
      { title: 'Design Control', required: true },
      { title: 'Testing Procedures', required: true },
      { title: 'Data Management', required: false },
      { title: 'Resource Management', required: false },
    ],
  ),
  v('instructions-for-use',
    [
      'INSTRUCTIONS-FOR-USE.md', 'INSTRUCTIONS_FOR_USE.md', 'instructions-for-use.md',
      'AI-INSTRUCTIONS.md', 'ai-system-instructions.md',
    ],
    [
      { title: 'Intended Purpose', required: true },
      { title: 'Capabilities', required: true },
      { title: 'Limitations', required: true },
      { title: 'Performance Metrics', required: false },
      { title: 'Human Oversight Instructions', required: false },
    ],
  ),

  // --- Annex III domain-specific policy validators (no template-registry match) ---

  v('biometrics-ai-policy',
    [
      'biometrics-ai-policy.md', 'BIOMETRICS-AI-POLICY.md',
      'biometrics-policy.md', 'biometric-ai-policy.md',
    ],
    [
      { title: 'Art. 5 Compliance', required: true },
      { title: 'Bias and Fairness', required: true },
      { title: 'Data Governance', required: true },
      { title: 'Human Oversight', required: false },
      { title: 'Transparency', required: false },
    ],
    { obligation: 'eu-ai-act-OBL-003', article: 'Art. 6(2)' },
  ),
  v('critical-infra-ai-policy',
    [
      'critical-infra-ai-policy.md', 'CRITICAL-INFRA-AI-POLICY.md',
      'critical-infrastructure-ai-policy.md', 'infrastructure-ai-policy.md',
    ],
    [
      { title: 'Resilience and Redundancy', required: true },
      { title: 'Cybersecurity', required: true },
      { title: 'Safety Function', required: true },
      { title: 'Human Oversight', required: false },
      { title: 'Incident Response', required: false },
    ],
    { obligation: 'eu-ai-act-OBL-003', article: 'Art. 6(2)' },
  ),
  v('migration-ai-policy',
    [
      'migration-ai-policy.md', 'MIGRATION-AI-POLICY.md',
      'border-control-ai-policy.md', 'asylum-ai-policy.md',
    ],
    [
      { title: 'Fundamental Rights', required: true },
      { title: 'Non-Discrimination', required: true },
      { title: 'Human Oversight', required: true },
      { title: 'Transparency', required: false },
      { title: 'Data Governance', required: false },
    ],
    { obligation: 'eu-ai-act-OBL-008', article: 'Art. 6(2)' },
  ),
] as const;
