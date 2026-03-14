import type { AgentPassport } from '../../types/passport.types.js';
import { deriveOversightDescription } from './passport-helpers.js';

// --- Types ---

export const ALL_DOC_TYPES = [
  'ai-literacy',
  'art5-screening',
  'technical-documentation',
  'incident-report',
  'declaration-of-conformity',
  'monitoring-policy',
  'fria',
  'worker-notification',
  'risk-management',
  'data-governance',
  'qms',
  'instructions-for-use',
  'gpai-transparency',
  'gpai-systemic-risk',
] as const;

export type DocType = (typeof ALL_DOC_TYPES)[number];

export interface DocGeneratorInput {
  readonly manifest: AgentPassport;
  readonly template: string;
  readonly docType: DocType;
  readonly organization?: string;
}

export interface DocResult {
  readonly markdown: string;
  readonly docType: DocType;
  readonly prefilledFields: readonly string[];
  readonly manualFields: readonly string[];
}

// --- Helpers ---

const generateDocId = (prefix: string): string => {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `${prefix}-${year}-${seq}`;
};

const DOC_ID_PREFIX: Record<DocType, string> = {
  'ai-literacy': 'ALP',
  'art5-screening': 'ART5',
  'technical-documentation': 'TDD',
  'incident-report': 'INC',
  'declaration-of-conformity': 'DOC',
  'monitoring-policy': 'MON',
  'fria': 'FRIA',
  'worker-notification': 'WRK',
  'risk-management': 'RMS',
  'data-governance': 'DGP',
  'qms': 'QMS',
  'instructions-for-use': 'IFU',
  'gpai-transparency': 'GPAI',
  'gpai-systemic-risk': 'GSR',
};

const DOC_ID_PATTERN: Record<DocType, string> = {
  'ai-literacy': 'ALP-[YYYY]-[NNN]',
  'art5-screening': 'ART5-[YYYY]-[NNN]',
  'technical-documentation': 'TDD-[YYYY]-[NNN]',
  'incident-report': 'INC-[YYYY]-[NNN]',
  'declaration-of-conformity': 'DOC-[YYYY]-[NNN]',
  'monitoring-policy': 'MON-[YYYY]-[NNN]',
  'fria': 'FRIA-[YYYY]-[NNN]',
  'worker-notification': 'WRK-[YYYY]-[NNN]',
  'risk-management': 'RMS-[YYYY]-[NNN]',
  'data-governance': 'DGP-[YYYY]-[NNN]',
  'qms': 'QMS-[YYYY]-[NNN]',
  'instructions-for-use': 'IFU-[YYYY]-[NNN]',
  'gpai-transparency': 'GPAI-[YYYY]-[NNN]',
  'gpai-systemic-risk': 'GSR-[YYYY]-[NNN]',
};

export const TEMPLATE_FILE_MAP: Record<DocType, string> = {
  'ai-literacy': 'ai-literacy.md',
  'art5-screening': 'art5-screening.md',
  'technical-documentation': 'technical-documentation.md',
  'incident-report': 'incident-report.md',
  'declaration-of-conformity': 'declaration-of-conformity.md',
  'monitoring-policy': 'monitoring-policy.md',
  'fria': 'fria.md',
  'worker-notification': 'worker-notification.md',
  'risk-management': 'risk-management-system.md',
  'data-governance': 'data-governance.md',
  'qms': 'qms.md',
  'instructions-for-use': 'instructions-for-use.md',
  'gpai-transparency': 'gpai-transparency.md',
  'gpai-systemic-risk': 'gpai-systemic-risk.md',
};

// --- Generator ---

export const generateDocument = (input: DocGeneratorInput): DocResult => {
  const { manifest, template, docType, organization } = input;
  const prefilledFields: string[] = [];
  const manualFields: string[] = [];

  let markdown = template;
  const today = new Date().toISOString().split('T')[0]!;

  // --- Common placeholders (shared across all templates) ---

  // Company Name / Organization
  const orgName = organization ?? manifest.owner?.team;
  if (orgName) {
    markdown = markdown.replaceAll('[Company Name]', orgName);
    markdown = markdown.replaceAll('[Organization]', orgName);
    prefilledFields.push('Company Name');
  } else {
    manualFields.push('Company Name');
  }

  // Date
  markdown = markdown.replaceAll('[Date]', today);
  prefilledFields.push('Date');

  // AI System Name
  markdown = markdown.replaceAll('[AI System Name]', manifest.display_name);
  prefilledFields.push('AI System Name');

  // Provider
  const provider = manifest.model?.provider ?? '';
  if (provider) {
    markdown = markdown.replaceAll('[Provider name]', provider);
    markdown = markdown.replaceAll('[Provider]', provider);
    prefilledFields.push('Provider');
  } else {
    manualFields.push('Provider');
  }

  // Version
  markdown = markdown.replaceAll('[X.Y]', manifest.version);
  prefilledFields.push('Version');

  // Description
  markdown = markdown.replaceAll('[Description]', manifest.description);
  prefilledFields.push('Description');

  // Risk class
  const riskClass = manifest.compliance?.eu_ai_act?.risk_class ?? '';
  if (riskClass) {
    markdown = markdown.replaceAll('[Risk Class]', riskClass);
    prefilledFields.push('Risk Class');
  } else {
    manualFields.push('Risk Class');
  }

  // Human Oversight Description
  const oversightDesc = deriveOversightDescription(manifest);
  markdown = markdown.replaceAll(
    '[Human Oversight Description]',
    oversightDesc,
  );

  // Autonomy Level
  markdown = markdown.replaceAll('[Autonomy Level]', manifest.autonomy_level);

  // Model ID
  const modelId = manifest.model?.model_id ?? '';
  if (modelId) {
    markdown = markdown.replaceAll('[Model ID]', modelId);
  }

  // Document ID (type-specific prefix)
  const idPattern = DOC_ID_PATTERN[docType];
  if (idPattern && markdown.includes(idPattern)) {
    const docId = generateDocId(DOC_ID_PREFIX[docType]!);
    markdown = markdown.replace(idPattern, docId);
    prefilledFields.push('Document ID');
  }

  // [Name, Title] — always manual
  if (markdown.includes('[Name, Title]')) {
    manualFields.push('Approved By (Name, Title)');
  }

  // --- Type-specific handling ---

  switch (docType) {
    case 'ai-literacy':
      manualFields.push('Training levels configuration');
      manualFields.push('AI systems in scope table');
      manualFields.push('Training schedule');
      manualFields.push('Sign-off signatures');
      break;

    case 'art5-screening':
      manualFields.push('Prohibited practice details');
      manualFields.push('Risk assessment');
      manualFields.push('Decision and justification');
      break;

    case 'technical-documentation':
      manualFields.push('System architecture details');
      manualFields.push('Training data characteristics');
      manualFields.push('Performance metrics');
      manualFields.push('Monitoring measures');
      break;

    case 'incident-report':
      manualFields.push('Incident description');
      manualFields.push('Root cause analysis');
      manualFields.push('Corrective actions');
      manualFields.push('Market surveillance authority');
      break;

    case 'declaration-of-conformity':
      manualFields.push('Harmonised standards used');
      manualFields.push('Notified body details');
      manualFields.push('Conformity assessment procedure');
      manualFields.push('Signatory');
      break;

    case 'monitoring-policy':
      manualFields.push('AI systems in scope table');
      manualFields.push('Human oversight assignments');
      manualFields.push('Log retention schedule');
      manualFields.push('Review frequency');
      break;

    case 'fria':
      manualFields.push('Affected groups identification');
      manualFields.push('Rights impact severity assessment');
      manualFields.push('Mitigation measures');
      manualFields.push('Stakeholder consultation records');
      break;

    case 'worker-notification':
      manualFields.push('Affected worker groups');
      manualFields.push('AI system capabilities description');
      manualFields.push('Worker rights and escalation');
      manualFields.push('Notification timeline');
      break;

    case 'risk-management':
      manualFields.push('Known risks identification');
      manualFields.push('Misuse scenarios');
      manualFields.push('Residual risk assessment');
      manualFields.push('Test results and methodology');
      manualFields.push('Mitigation measures');
      break;

    case 'data-governance':
      manualFields.push('Data sources and origins');
      manualFields.push('Collection and preparation methods');
      manualFields.push('Quality metrics and targets');
      manualFields.push('Bias analysis');
      manualFields.push('Representativeness assessment');
      break;

    case 'qms':
      manualFields.push('Compliance strategy');
      manualFields.push('Design control procedures');
      manualFields.push('Testing procedures');
      manualFields.push('Roles and responsibilities');
      manualFields.push('Change management');
      break;

    case 'instructions-for-use':
      manualFields.push('Intended purpose details');
      manualFields.push('Performance metrics and benchmarks');
      manualFields.push('Known limitations');
      manualFields.push('Human oversight procedures');
      manualFields.push('Input data specifications');
      break;

    case 'gpai-transparency':
      manualFields.push('Training data sources');
      manualFields.push('Benchmark results');
      manualFields.push('Safety evaluations');
      manualFields.push('Copyright compliance policy');
      manualFields.push('Energy consumption data');
      break;

    case 'gpai-systemic-risk':
      manualFields.push('Adversarial testing results');
      manualFields.push('Systemic risk assessment');
      manualFields.push('Incident tracking procedures');
      manualFields.push('Cybersecurity measures');
      break;
  }

  return Object.freeze({
    markdown,
    docType,
    prefilledFields: Object.freeze([...prefilledFields]),
    manualFields: Object.freeze([...manualFields]),
  });
};
