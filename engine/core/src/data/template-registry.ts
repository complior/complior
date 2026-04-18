/**
 * Single source of truth for EU AI Act document templates.
 * All template mappings (fixer, document-generator, passport-service)
 * MUST derive from this registry to prevent duplication.
 */

export interface TemplateRegistryEntry {
  readonly docType: string;
  readonly obligationId: string;
  readonly article: string;
  readonly templateFile: string;
  readonly outputFile: string;
  readonly description: string;
  readonly docIdPrefix: string;
}

export const TEMPLATE_REGISTRY: readonly TemplateRegistryEntry[] = [
  { docType: 'ai-literacy', obligationId: 'eu-ai-act-OBL-001', article: 'Art. 4', templateFile: 'ai-literacy.md', outputFile: 'docs/compliance/ai-literacy-policy.md', description: 'AI Literacy Policy', docIdPrefix: 'ALP' },
  { docType: 'art5-screening', obligationId: 'eu-ai-act-OBL-002', article: 'Art. 5', templateFile: 'art5-screening.md', outputFile: 'docs/compliance/art5-screening-report.md', description: 'Article 5 Screening Report', docIdPrefix: 'ART5' },
  { docType: 'technical-documentation', obligationId: 'eu-ai-act-OBL-005', article: 'Art. 11', templateFile: 'technical-documentation.md', outputFile: 'docs/compliance/technical-documentation.md', description: 'Technical Documentation', docIdPrefix: 'TDD' },
  { docType: 'incident-report', obligationId: 'eu-ai-act-OBL-021', article: 'Art. 73', templateFile: 'incident-report.md', outputFile: 'docs/compliance/incident-report.md', description: 'Serious Incident Report', docIdPrefix: 'INC' },
  { docType: 'declaration-of-conformity', obligationId: 'eu-ai-act-OBL-019', article: 'Art. 47', templateFile: 'declaration-of-conformity.md', outputFile: 'docs/compliance/declaration-of-conformity.md', description: 'Declaration of Conformity', docIdPrefix: 'DOC' },
  { docType: 'monitoring-policy', obligationId: 'eu-ai-act-OBL-011', article: 'Art. 26', templateFile: 'monitoring-policy.md', outputFile: 'docs/compliance/monitoring-policy.md', description: 'Post-Market Monitoring Policy', docIdPrefix: 'MON' },
  { docType: 'fria', obligationId: 'eu-ai-act-OBL-013', article: 'Art. 27', templateFile: 'fria.md', outputFile: 'docs/compliance/fria.md', description: 'Fundamental Rights Impact Assessment', docIdPrefix: 'FRIA' },
  { docType: 'worker-notification', obligationId: 'eu-ai-act-OBL-012', article: 'Art. 26(7)', templateFile: 'worker-notification.md', outputFile: 'docs/compliance/worker-notification.md', description: 'Worker Notification', docIdPrefix: 'WRK' },
  { docType: 'risk-management', obligationId: 'eu-ai-act-OBL-003', article: 'Art. 9', templateFile: 'risk-management-system.md', outputFile: 'docs/compliance/risk-management-system.md', description: 'Risk Management System', docIdPrefix: 'RMS' },
  { docType: 'data-governance', obligationId: 'eu-ai-act-OBL-004', article: 'Art. 10', templateFile: 'data-governance.md', outputFile: 'docs/compliance/data-governance.md', description: 'Data Governance Policy', docIdPrefix: 'DGP' },
  { docType: 'qms', obligationId: 'eu-ai-act-OBL-010', article: 'Art. 17', templateFile: 'qms.md', outputFile: 'docs/compliance/qms.md', description: 'Quality Management System', docIdPrefix: 'QMS' },
  { docType: 'instructions-for-use', obligationId: 'eu-ai-act-OBL-007', article: 'Art. 13', templateFile: 'instructions-for-use.md', outputFile: 'docs/compliance/instructions-for-use.md', description: 'Instructions for Use', docIdPrefix: 'IFU' },
  { docType: 'gpai-transparency', obligationId: 'eu-ai-act-OBL-022', article: 'Art. 53', templateFile: 'gpai-transparency.md', outputFile: 'docs/compliance/gpai-transparency.md', description: 'GPAI Transparency Documentation', docIdPrefix: 'GPAI' },
  { docType: 'gpai-systemic-risk', obligationId: 'eu-ai-act-OBL-023', article: 'Art. 55', templateFile: 'gpai-systemic-risk.md', outputFile: 'docs/compliance/gpai-systemic-risk.md', description: 'GPAI Systemic Risk Assessment', docIdPrefix: 'GSR' },
  // ISO 42001 documents
  { docType: 'iso42001-ai-policy', obligationId: 'iso-42001-A.2.2', article: 'ISO 42001 Clause 5.2', templateFile: 'iso-42001-ai-policy.md', outputFile: 'docs/compliance/iso42001-ai-policy.md', description: 'AI Management System Policy (ISO 42001)', docIdPrefix: 'ISOPOL' },
  { docType: 'iso42001-soa', obligationId: 'iso-42001-A.6.1.3', article: 'ISO 42001 Clause 6.1.3', templateFile: 'iso-42001-soa.md', outputFile: 'docs/compliance/iso42001-soa.md', description: 'Statement of Applicability (ISO 42001)', docIdPrefix: 'ISOSOA' },
  { docType: 'iso42001-risk-register', obligationId: 'iso-42001-A.5.2', article: 'ISO 42001 Clause 6.1.2', templateFile: 'iso-42001-risk-register.md', outputFile: 'docs/compliance/iso42001-risk-register.md', description: 'Risk Register (ISO 42001)', docIdPrefix: 'ISOREG' },
] as const;

/** Derive DocType union from registry. */
export type DocType = (typeof TEMPLATE_REGISTRY)[number]['docType'];

/** All doc types as array (for iteration). */
export const ALL_DOC_TYPES: readonly DocType[] = TEMPLATE_REGISTRY.map((e) => e.docType);

/** docType → templateFile mapping (for document-generator). */
export const TEMPLATE_FILE_MAP: Record<string, string> = Object.fromEntries(
  TEMPLATE_REGISTRY.map((e) => [e.docType, e.templateFile]),
);

/** docType → docIdPrefix mapping (for document-generator). */
export const DOC_ID_PREFIX_MAP: Record<string, string> = Object.fromEntries(
  TEMPLATE_REGISTRY.map((e) => [e.docType, e.docIdPrefix]),
);

/** docType → docId pattern mapping (for document-generator). */
export const DOC_ID_PATTERN_MAP: Record<string, string> = Object.fromEntries(
  TEMPLATE_REGISTRY.map((e) => [e.docType, `${e.docIdPrefix}-[YYYY]-[NNN]`]),
);
