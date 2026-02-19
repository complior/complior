import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';

const CHECK_ID = 'gpai-transparency';
const ARTICLE_REF = 'Art. 51-53';
const OBLIGATION_ID = 'eu-ai-act-OBL-022';

const GPAI_DOC_PATTERNS: readonly RegExp[] = [
  /^MODEL[-_]?CARD\.md$/i,
  /^model[-_]?card\./i,
  /^GPAI[-_]?DOCUMENTATION/i,
  /^TRAINING[-_]?DATA[-_]?DOCUMENTATION/i,
  /^MODEL[-_]?DOCUMENTATION/i,
];

const GPAI_CONTENT_PATTERNS: readonly RegExp[] = [
  /\bmodel card\b/i,
  /\btraining data\b.*\bdocumentation\b/i,
  /\bgpai\b/i,
  /\bgeneral[-_ ]?purpose ai\b/i,
  /\bfoundation model\b/i,
  /\bmodel transparency\b/i,
];

const GPAI_USAGE_PATTERNS: readonly RegExp[] = [
  /\bfine[-_]?tun/i,
  /\bmodel training\b/i,
  /\btraining pipeline\b/i,
  /\bmodel weights\b/i,
  /\bpre[-_]?train/i,
  /\btransformers\b/,
  /\btorch\b/,
  /\btensorflow\b/i,
];

const isGpaiDocFile = (relativePath: string): boolean => {
  const filename = relativePath.split('/').pop() ?? '';
  return GPAI_DOC_PATTERNS.some((p) => p.test(filename));
};

const hasGpaiContent = (content: string): boolean =>
  GPAI_CONTENT_PATTERNS.some((p) => p.test(content));

const hasGpaiUsage = (content: string): boolean =>
  GPAI_USAGE_PATTERNS.some((p) => p.test(content));

export const checkGpaiTransparency = (ctx: ScanContext): readonly CheckResult[] => {
  for (const file of ctx.files) {
    if (isGpaiDocFile(file.relativePath)) {
      return [{
        type: 'pass',
        checkId: CHECK_ID,
        message: `GPAI documentation found: ${file.relativePath} (${ARTICLE_REF})`,
      }];
    }
  }

  const docsFiles = ctx.files.filter((f) => f.extension === '.md');
  for (const file of docsFiles) {
    if (hasGpaiContent(file.content)) {
      return [{
        type: 'pass',
        checkId: CHECK_ID,
        message: `GPAI transparency content found in: ${file.relativePath} (${ARTICLE_REF})`,
      }];
    }
  }

  let gpaiUsageFound = false;
  for (const file of ctx.files) {
    if (hasGpaiUsage(file.content)) {
      gpaiUsageFound = true;
      break;
    }
  }

  if (gpaiUsageFound) {
    return [{
      type: 'fail',
      checkId: CHECK_ID,
      message: `GPAI/model training code detected without transparency documentation (${ARTICLE_REF})`,
      severity: 'high',
      obligationId: OBLIGATION_ID,
      articleReference: ARTICLE_REF,
      fix: 'Create a MODEL_CARD.md with model capabilities, limitations, training data, and intended use',
    }];
  }

  return [{
    type: 'skip',
    checkId: CHECK_ID,
    reason: 'No GPAI/model training usage detected',
  }];
};
