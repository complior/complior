/**
 * AIUC-1 Certification Requirements mapped to EU AI Act obligations.
 * Each requirement defines what evidence is needed and how to verify it.
 */

export interface Aiuc1Requirement {
  readonly id: string;
  readonly category: Aiuc1Category;
  readonly title: string;
  readonly description: string;
  readonly weight: number;
  readonly articleRef: string;
  readonly checks: readonly Aiuc1Check[];
}

export type Aiuc1Category =
  | 'documentation'
  | 'risk_management'
  | 'data_governance'
  | 'transparency'
  | 'human_oversight'
  | 'monitoring'
  | 'accuracy';

export interface Aiuc1Check {
  readonly type: 'scan_check' | 'passport_field' | 'document' | 'evidence';
  readonly target: string;
  readonly description: string;
}

export const AIUC1_CATEGORIES: Record<Aiuc1Category, { label: string; weight: number }> = {
  documentation: { label: 'Documentation', weight: 0.20 },
  risk_management: { label: 'Risk Management', weight: 0.20 },
  data_governance: { label: 'Data Governance', weight: 0.15 },
  transparency: { label: 'Transparency', weight: 0.15 },
  human_oversight: { label: 'Human Oversight', weight: 0.15 },
  monitoring: { label: 'Monitoring & Logging', weight: 0.10 },
  accuracy: { label: 'Accuracy & Robustness', weight: 0.05 },
};

export const AIUC1_REQUIREMENTS: readonly Aiuc1Requirement[] = [
  // --- Documentation (20%) ---
  {
    id: 'DOC-01',
    category: 'documentation',
    title: 'Technical Documentation',
    description: 'Technical documentation describing AI system design, development, and deployment (Art.11)',
    weight: 0.08,
    articleRef: 'Art.11',
    checks: [
      { type: 'scan_check', target: 'l1-architecture', description: 'Architecture documentation exists' },
      { type: 'scan_check', target: 'l2-docs', description: 'Documentation has sufficient depth' },
    ],
  },
  {
    id: 'DOC-02',
    category: 'documentation',
    title: 'Instructions for Use',
    description: 'Clear instructions for deployers on system use, capabilities, and limitations (Art.13)',
    weight: 0.06,
    articleRef: 'Art.13',
    checks: [
      { type: 'passport_field', target: 'description', description: 'System description provided' },
      { type: 'passport_field', target: 'capabilities', description: 'Capabilities documented' },
      { type: 'passport_field', target: 'limitations', description: 'Limitations documented' },
    ],
  },
  {
    id: 'DOC-03',
    category: 'documentation',
    title: 'Risk Documentation',
    description: 'Fundamental Rights Impact Assessment (Art.27) or equivalent risk documentation',
    weight: 0.06,
    articleRef: 'Art.27',
    checks: [
      { type: 'document', target: 'fria', description: 'FRIA document generated' },
      { type: 'passport_field', target: 'compliance.fria_completed', description: 'FRIA marked as completed' },
    ],
  },

  // --- Risk Management (20%) ---
  {
    id: 'RISK-01',
    category: 'risk_management',
    title: 'Risk Assessment',
    description: 'Systematic risk identification and assessment process (Art.9)',
    weight: 0.08,
    articleRef: 'Art.9',
    checks: [
      { type: 'scan_check', target: 'score', description: 'Compliance scan performed with score > 0' },
      { type: 'passport_field', target: 'compliance.eu_ai_act.risk_class', description: 'Risk class determined' },
    ],
  },
  {
    id: 'RISK-02',
    category: 'risk_management',
    title: 'Risk Mitigation',
    description: 'Measures to mitigate identified risks (Art.9(2))',
    weight: 0.06,
    articleRef: 'Art.9(2)',
    checks: [
      { type: 'passport_field', target: 'constraints', description: 'Behavioral constraints defined' },
      { type: 'scan_check', target: 'banned-packages', description: 'No banned/prohibited packages' },
    ],
  },
  {
    id: 'RISK-03',
    category: 'risk_management',
    title: 'Risk Classification',
    description: 'EU AI Act risk classification properly documented (Art.6)',
    weight: 0.06,
    articleRef: 'Art.6',
    checks: [
      { type: 'passport_field', target: 'compliance.eu_ai_act.risk_class', description: 'Risk class assigned' },
      { type: 'passport_field', target: 'compliance.eu_ai_act.applicable_articles', description: 'Applicable articles identified' },
    ],
  },

  // --- Data Governance (15%) ---
  {
    id: 'DATA-01',
    category: 'data_governance',
    title: 'Data Governance Framework',
    description: 'Data governance and management practices documented (Art.10)',
    weight: 0.08,
    articleRef: 'Art.10',
    checks: [
      { type: 'scan_check', target: 'l2-data-governance', description: 'Data governance documentation exists' },
      { type: 'document', target: 'policy', description: 'AI usage policy generated' },
    ],
  },
  {
    id: 'DATA-02',
    category: 'data_governance',
    title: 'PII Handling',
    description: 'Personal data handling procedures defined (GDPR compliance)',
    weight: 0.07,
    articleRef: 'Art.10(5)',
    checks: [
      { type: 'scan_check', target: 'sdk-disclosure', description: 'SDK disclosure/sanitize hooks configured' },
      { type: 'passport_field', target: 'permissions.data_boundaries', description: 'Data boundaries defined' },
    ],
  },

  // --- Transparency (15%) ---
  {
    id: 'TRANS-01',
    category: 'transparency',
    title: 'AI Disclosure',
    description: 'Users informed of AI interaction (Art.50(1))',
    weight: 0.08,
    articleRef: 'Art.50(1)',
    checks: [
      { type: 'scan_check', target: 'sdk-disclosure', description: 'Disclosure mechanism configured' },
    ],
  },
  {
    id: 'TRANS-02',
    category: 'transparency',
    title: 'Worker Notification',
    description: 'Workers notified of AI system deployment (Art.26(7))',
    weight: 0.07,
    articleRef: 'Art.26(7)',
    checks: [
      { type: 'document', target: 'worker-notification', description: 'Worker notification generated' },
      { type: 'passport_field', target: 'compliance.worker_notification_sent', description: 'Worker notification sent' },
    ],
  },

  // --- Human Oversight (15%) ---
  {
    id: 'OVER-01',
    category: 'human_oversight',
    title: 'Oversight Level',
    description: 'Human oversight measures defined and proportionate (Art.14)',
    weight: 0.08,
    articleRef: 'Art.14',
    checks: [
      { type: 'passport_field', target: 'autonomy_level', description: 'Autonomy level defined' },
      { type: 'passport_field', target: 'autonomy_evidence', description: 'Autonomy evidence documented' },
    ],
  },
  {
    id: 'OVER-02',
    category: 'human_oversight',
    title: 'Override Capability',
    description: 'Human ability to override or stop AI system (Art.14(4))',
    weight: 0.07,
    articleRef: 'Art.14(4)',
    checks: [
      { type: 'passport_field', target: 'constraints.human_approval_required', description: 'Human approval gates defined' },
      { type: 'scan_check', target: 'kill-switch', description: 'Kill switch / stop mechanism present' },
    ],
  },

  // --- Monitoring & Logging (10%) ---
  {
    id: 'MON-01',
    category: 'monitoring',
    title: 'Logging System',
    description: 'Automatic logging of AI system operations (Art.12)',
    weight: 0.05,
    articleRef: 'Art.12',
    checks: [
      { type: 'scan_check', target: 'logging', description: 'Logging infrastructure configured' },
      { type: 'evidence', target: 'chain_active', description: 'Evidence chain has entries' },
    ],
  },
  {
    id: 'MON-02',
    category: 'monitoring',
    title: 'Post-Market Monitoring',
    description: 'Post-market monitoring system in place (Art.72)',
    weight: 0.05,
    articleRef: 'Art.72',
    checks: [
      { type: 'evidence', target: 'scan_count', description: 'Multiple scans performed (monitoring active)' },
      { type: 'scan_check', target: 'drift', description: 'Drift detection configured' },
    ],
  },

  // --- Accuracy & Robustness (5%) ---
  {
    id: 'ACC-01',
    category: 'accuracy',
    title: 'Accuracy & Security',
    description: 'Accuracy metrics and cybersecurity measures (Art.15)',
    weight: 0.05,
    articleRef: 'Art.15',
    checks: [
      { type: 'scan_check', target: 'cybersecurity', description: 'Security measures present' },
      { type: 'scan_check', target: 'testing', description: 'Testing infrastructure present' },
    ],
  },
];
