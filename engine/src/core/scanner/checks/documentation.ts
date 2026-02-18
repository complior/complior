import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../scanner.types.js';

const CHECK_ID = 'documentation';
const OBLIGATION_ID = 'eu-ai-act-OBL-019';

const COMPLIANCE_DOC_PATTERNS: readonly RegExp[] = [
  /^COMPLIANCE\.md$/i,
  /^COMPLIANCE[-_]?DOCUMENTATION/i,
  /^AI[-_]?COMPLIANCE/i,
  /^EU[-_]?AI[-_]?ACT/i,
];

const COMPLIANCE_CONTENT_PATTERNS: readonly RegExp[] = [
  /\bcompliance\b.*\bdocumentation\b/i,
  /\beu ai act\b/i,
  /\brisk assessment\b/i,
  /\bcompliance report\b/i,
  /\bregulatory compliance\b/i,
  /\bai act\b.*\bcompliance\b/i,
];

const COMPLIOR_DIR = '.complior/';

const isComplianceDocFile = (relativePath: string): boolean => {
  const filename = relativePath.split('/').pop() ?? '';
  return COMPLIANCE_DOC_PATTERNS.some((p) => p.test(filename));
};

const hasComplianceContent = (content: string): boolean =>
  COMPLIANCE_CONTENT_PATTERNS.some((p) => p.test(content));

export const checkDocumentation = (ctx: ScanContext): readonly CheckResult[] => {
  for (const file of ctx.files) {
    if (isComplianceDocFile(file.relativePath)) {
      return [{
        type: 'pass',
        checkId: CHECK_ID,
        message: `Compliance documentation found: ${file.relativePath}`,
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
      message: `.complior/ directory found with compliance configuration`,
    }];
  }

  const docsFiles = ctx.files.filter((f) =>
    f.relativePath.startsWith('docs/') && f.extension === '.md',
  );

  for (const file of docsFiles) {
    if (hasComplianceContent(file.content)) {
      return [{
        type: 'pass',
        checkId: CHECK_ID,
        message: `Compliance content found in docs: ${file.relativePath}`,
      }];
    }
  }

  return [{
    type: 'fail',
    checkId: CHECK_ID,
    message: 'No compliance documentation found',
    severity: 'medium',
    obligationId: OBLIGATION_ID,
    fix: 'Create a COMPLIANCE.md or .complior/ directory documenting your AI Act compliance measures',
  }];
};
