import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';

const CHECK_ID = 'compliance-metadata';
const OBLIGATION_ID = 'eu-ai-act-OBL-005';

const WELL_KNOWN_PATH = '.well-known/ai-compliance.json';
const COMPLIOR_DIR = '.complior/';

const COMPLIANCE_META_PATTERNS: readonly RegExp[] = [
  /\bai[-_]?compliance\b/i,
  /\bcomplior\b/i,
  /\beu[-_]?ai[-_]?act\b/i,
  /\bcompliance[-_]?metadata\b/i,
];

const hasComplianceMetaTags = (content: string): boolean =>
  COMPLIANCE_META_PATTERNS.some((p) => p.test(content));

export const checkComplianceMetadata = (ctx: ScanContext): readonly CheckResult[] => {
  for (const file of ctx.files) {
    if (file.relativePath === WELL_KNOWN_PATH) {
      return [{
        type: 'pass',
        checkId: CHECK_ID,
        message: `Compliance metadata found at ${WELL_KNOWN_PATH}`,
      }];
    }
  }

  const compliorFiles = ctx.files.filter((f) =>
    f.relativePath.startsWith(COMPLIOR_DIR),
  );

  if (compliorFiles.length > 0) {
    return [{
      type: 'pass',
      checkId: CHECK_ID,
      message: `.complior/ configuration directory found`,
    }];
  }

  const htmlFiles = ctx.files.filter((f) => f.extension === '.html');
  for (const file of htmlFiles) {
    if (hasComplianceMetaTags(file.content)) {
      return [{
        type: 'pass',
        checkId: CHECK_ID,
        message: `Compliance metadata found in HTML: ${file.relativePath}`,
      }];
    }
  }

  return [{
    type: 'fail',
    checkId: CHECK_ID,
    message: 'No compliance metadata found',
    severity: 'low',
    obligationId: OBLIGATION_ID,
    fix: 'Add a .well-known/ai-compliance.json or .complior/ directory with compliance configuration',
  }];
};
