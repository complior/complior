import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';
import type { CheckFunction } from '../../../ports/scanner.port.js';
import { DOCUMENT_VALIDATORS } from '../validators.js';

// --- Types ---

export interface PresenceCheckConfig {
  readonly checkId: string;
  readonly articleRef: string;
  readonly obligationId: string;
  readonly severity: 'high' | 'medium';
  readonly docLabel: string;
  readonly contentPatterns: readonly RegExp[];
  readonly fixMessage: string;
}

// --- Helpers ---

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Map checkId → validator document name where they differ.
 * Validators.ts uses short names; checkIds use full kebab names.
 */
const VALIDATOR_DOC_NAME: Record<string, string> = {
  'technical-documentation': 'tech-documentation',
  'declaration-of-conformity': 'declaration-conformity',
};

// --- Factory ---

/**
 * Creates an L1 presence check from config + validator data.
 * File patterns come from DOCUMENT_VALIDATORS (single source of truth).
 * Content patterns and generated-doc patterns are check-specific.
 */
export const createPresenceCheck = (config: PresenceCheckConfig): CheckFunction => {
  const {
    checkId, articleRef, obligationId, severity, docLabel, contentPatterns, fixMessage,
  } = config;

  // Derive file patterns from validators.ts (single source of truth)
  const validatorName = VALIDATOR_DOC_NAME[checkId] ?? checkId;
  const validator = DOCUMENT_VALIDATORS.find((v) => v.document === validatorName);
  const filePatterns: readonly RegExp[] = validator
    ? validator.file_patterns.map((p) => new RegExp(`^${escapeRegex(p)}$`, 'i'))
    : [];

  // Generated docs live in standard locations
  const generatedPatterns: readonly RegExp[] = [
    new RegExp(`^\\.complior/documents/.*${escapeRegex(checkId)}`, 'i'),
    new RegExp(`^\\.complior/reports/.*${escapeRegex(checkId)}`, 'i'),
    new RegExp(`^docs/compliance/${escapeRegex(checkId)}`, 'i'),
  ];

  return (ctx: ScanContext): readonly CheckResult[] => {
    // Phase 1: exact filename match
    for (const file of ctx.files) {
      const filename = file.relativePath.split('/').pop() ?? '';
      if (filePatterns.some((p) => p.test(filename))) {
        return [{
          type: 'pass',
          checkId,
          message: `${docLabel} found: ${file.relativePath} (${articleRef})`,
        }];
      }
    }

    // Phase 2: generated documents in .complior/ or docs/compliance/
    for (const file of ctx.files) {
      if (generatedPatterns.some((p) => p.test(file.relativePath))) {
        return [{
          type: 'pass',
          checkId,
          message: `Generated ${docLabel.toLowerCase()} found: ${file.relativePath} (${articleRef})`,
        }];
      }
    }

    // Phase 3: content keyword search in docs/
    const docsFiles = ctx.files.filter((f) =>
      f.relativePath.startsWith('docs/') && f.extension === '.md',
    );

    for (const file of docsFiles) {
      if (contentPatterns.some((p) => p.test(file.content))) {
        return [{
          type: 'pass',
          checkId,
          message: `${docLabel} content found in docs: ${file.relativePath} (${articleRef})`,
        }];
      }
    }

    // No match — fail
    return [{
      type: 'fail',
      checkId,
      message: `No ${docLabel.toLowerCase()} found (${articleRef})`,
      severity,
      obligationId,
      articleReference: articleRef,
      fix: fixMessage,
    }];
  };
};

// --- Configs for all 7 EU AI Act document presence checks ---

const PRESENCE_CONFIGS: readonly PresenceCheckConfig[] = [
  {
    checkId: 'fria',
    articleRef: 'Art. 27',
    obligationId: 'eu-ai-act-OBL-013',
    severity: 'high',
    docLabel: 'FRIA document',
    contentPatterns: [
      /\bfundamental rights impact assessment\b/i,
      /\bfria\b/i,
      /\bfundamental rights\b.*\bimpact\b/i,
    ],
    fixMessage: 'Create a FRIA.md document with fundamental rights impact assessment (Art. 27)',
  },
  {
    checkId: 'art5-screening',
    articleRef: 'Art. 5',
    obligationId: 'eu-ai-act-OBL-002',
    severity: 'high',
    docLabel: 'Art. 5 screening document',
    contentPatterns: [
      /\bart\.?\s*5\b.*\bscreening\b/i,
      /\bprohibited practices\b/i,
      /\bprohibited ai\b/i,
    ],
    fixMessage: 'Create an ART5-SCREENING.md document screening for prohibited AI practices (Art. 5)',
  },
  {
    checkId: 'technical-documentation',
    articleRef: 'Art. 11',
    obligationId: 'eu-ai-act-OBL-005',
    severity: 'high',
    docLabel: 'Technical documentation',
    contentPatterns: [
      /\btechnical documentation\b/i,
      /\bsystem description\b.*\barchitecture\b/i,
      /\bart\.?\s*11\b.*\bdocumentation\b/i,
    ],
    fixMessage: 'Create a TECHNICAL-DOCUMENTATION.md describing AI system architecture and data sources (Art. 11)',
  },
  {
    checkId: 'incident-report',
    articleRef: 'Art. 73',
    obligationId: 'eu-ai-act-OBL-021',
    severity: 'medium',
    docLabel: 'Incident report template',
    contentPatterns: [
      /\bincident report\b/i,
      /\bserious incident\b/i,
      /\bincident.*\breporting\b/i,
    ],
    fixMessage: 'Create an INCIDENT-REPORT.md template for serious AI incident reporting (Art. 73)',
  },
  {
    checkId: 'declaration-of-conformity',
    articleRef: 'Art. 47',
    obligationId: 'eu-ai-act-OBL-019',
    severity: 'high',
    docLabel: 'Declaration of conformity',
    contentPatterns: [
      /\bdeclaration of conformity\b/i,
      /\bconformity assessment\b/i,
      /\bart\.?\s*47\b/i,
    ],
    fixMessage: 'Create a DECLARATION-OF-CONFORMITY.md documenting EU conformity assessment (Art. 47)',
  },
  {
    checkId: 'monitoring-policy',
    articleRef: 'Art. 26',
    obligationId: 'eu-ai-act-OBL-011',
    severity: 'medium',
    docLabel: 'Monitoring policy',
    contentPatterns: [
      /\bmonitoring policy\b/i,
      /\bpost[-\s]?market monitoring\b/i,
      /\bmonitoring scope\b/i,
    ],
    fixMessage: 'Create a MONITORING-POLICY.md for post-market AI system monitoring (Art. 26)',
  },
  {
    checkId: 'worker-notification',
    articleRef: 'Art. 26(7)',
    obligationId: 'eu-ai-act-OBL-012',
    severity: 'medium',
    docLabel: 'Worker notification document',
    contentPatterns: [
      /\bworker notification\b/i,
      /\bemployee.*\bai notification\b/i,
      /\bworkers?\b.*\bnotif/i,
    ],
    fixMessage: 'Create a WORKER-NOTIFICATION.md documenting AI system notification to affected workers (Art. 26(7))',
  },
];

// --- Exported check functions (one per document type) ---

export const checkFriaPresence = createPresenceCheck(PRESENCE_CONFIGS[0]!);
export const checkArt5ScreeningPresence = createPresenceCheck(PRESENCE_CONFIGS[1]!);
export const checkTechnicalDocumentationPresence = createPresenceCheck(PRESENCE_CONFIGS[2]!);
export const checkIncidentReportPresence = createPresenceCheck(PRESENCE_CONFIGS[3]!);
export const checkDeclarationOfConformityPresence = createPresenceCheck(PRESENCE_CONFIGS[4]!);
export const checkMonitoringPolicyPresence = createPresenceCheck(PRESENCE_CONFIGS[5]!);
export const checkWorkerNotificationPresence = createPresenceCheck(PRESENCE_CONFIGS[6]!);

/** All presence check configs (useful for data-driven tests). */
export const ALL_PRESENCE_CONFIGS = PRESENCE_CONFIGS;
