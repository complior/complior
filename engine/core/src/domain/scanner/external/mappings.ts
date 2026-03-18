import type { Severity } from '../../../types/common.types.js';

/** Mapping from external tool rule → EU AI Act obligation/article. */
export interface ExternalFindingMapping {
  readonly obligationId?: string;
  readonly articleReference?: string;
  readonly category: string;
  readonly defaultSeverity: Severity;
}

/** Static mappings: external rule ID prefix → EU AI Act article + obligation. */
export const EXTERNAL_RULE_MAPPINGS: Record<string, ExternalFindingMapping> = {
  // Semgrep security rules
  'complior.bare-call': {
    obligationId: 'OBL-015',
    articleReference: 'Art. 14',
    category: 'technical_safeguards',
    defaultSeverity: 'high',
  },
  'complior.unsafe-deser': {
    obligationId: 'OBL-006',
    articleReference: 'Art. 15',
    category: 'technical_safeguards',
    defaultSeverity: 'critical',
  },
  'complior.injection': {
    obligationId: 'OBL-006',
    articleReference: 'Art. 15',
    category: 'technical_safeguards',
    defaultSeverity: 'critical',
  },
  'complior.missing-error-handling': {
    obligationId: 'OBL-015',
    articleReference: 'Art. 14',
    category: 'technical_safeguards',
    defaultSeverity: 'medium',
  },
  // hardcoded-secrets handled by detect-secrets (entropy + 30+ plugins)

  // Bandit severity-based defaults
  'bandit-high': {
    obligationId: 'OBL-006',
    articleReference: 'Art. 15',
    category: 'technical_safeguards',
    defaultSeverity: 'high',
  },
  'bandit-medium': {
    obligationId: 'OBL-015',
    articleReference: 'Art. 14',
    category: 'technical_safeguards',
    defaultSeverity: 'medium',
  },
  'bandit-low': {
    category: 'technical_safeguards',
    defaultSeverity: 'low',
  },

  // ModelScan
  'modelscan-unsafe': {
    obligationId: 'OBL-006',
    articleReference: 'Art. 15',
    category: 'technical_safeguards',
    defaultSeverity: 'critical',
  },
  'modelscan-warning': {
    obligationId: 'OBL-006',
    articleReference: 'Art. 15',
    category: 'technical_safeguards',
    defaultSeverity: 'high',
  },

  // detect-secrets
  'detect-secrets': {
    obligationId: 'OBL-017',
    articleReference: 'Art. 15(4)',
    category: 'technical_safeguards',
    defaultSeverity: 'high',
  },
};

/** Semgrep severity string → Complior severity. */
export const SEMGREP_SEVERITY_MAP: Record<string, Severity> = {
  ERROR: 'high',
  WARNING: 'medium',
  INFO: 'low',
};

/** Bandit severity string → Complior severity. */
export const BANDIT_SEVERITY_MAP: Record<string, Severity> = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};
