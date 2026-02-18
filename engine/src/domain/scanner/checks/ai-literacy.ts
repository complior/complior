import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';

const CHECK_ID = 'ai-literacy';
const ARTICLE_REF = 'Art. 4';
const OBLIGATION_ID = 'eu-ai-act-OBL-001';

const POLICY_FILE_PATTERNS: readonly RegExp[] = [
  /^AI[-_]?LITERACY\.md$/i,
  /^AI[-_]?LITERACY[-_]?POLICY\.md$/i,
  /^ai[-_]?training[-_]?policy\./i,
  /^AI[-_]?COMPETENCY/i,
];

const LITERACY_CONTENT_PATTERNS: readonly RegExp[] = [
  /\bai literacy\b/i,
  /\bai training\b.*\bpolicy\b/i,
  /\bai competency\b/i,
  /\bai awareness\b/i,
  /\bstaff training\b.*\bai\b/i,
  /\bai education\b/i,
];

const isPolicyFile = (relativePath: string): boolean => {
  const filename = relativePath.split('/').pop() ?? '';
  return POLICY_FILE_PATTERNS.some((p) => p.test(filename));
};

const isTrainingRecordsDir = (relativePath: string): boolean =>
  /training[-_]?records/i.test(relativePath);

const hasLiteracyContent = (content: string): boolean =>
  LITERACY_CONTENT_PATTERNS.some((p) => p.test(content));

export const checkAiLiteracy = (ctx: ScanContext): readonly CheckResult[] => {
  for (const file of ctx.files) {
    if (isPolicyFile(file.relativePath)) {
      return [{
        type: 'pass',
        checkId: CHECK_ID,
        message: `AI literacy policy file found: ${file.relativePath} (${ARTICLE_REF})`,
      }];
    }
  }

  for (const file of ctx.files) {
    if (isTrainingRecordsDir(file.relativePath)) {
      return [{
        type: 'pass',
        checkId: CHECK_ID,
        message: `AI training records directory found (${ARTICLE_REF})`,
      }];
    }
  }

  const docsFiles = ctx.files.filter((f) =>
    f.relativePath.startsWith('docs/') && f.extension === '.md',
  );

  for (const file of docsFiles) {
    if (hasLiteracyContent(file.content)) {
      return [{
        type: 'pass',
        checkId: CHECK_ID,
        message: `AI literacy content found in docs: ${file.relativePath} (${ARTICLE_REF})`,
      }];
    }
  }

  return [{
    type: 'fail',
    checkId: CHECK_ID,
    message: `No AI literacy policy or training documentation found (${ARTICLE_REF})`,
    severity: 'medium',
    obligationId: OBLIGATION_ID,
    articleReference: ARTICLE_REF,
    fix: 'Create an AI-LITERACY.md policy document covering staff AI competency requirements',
  }];
};
