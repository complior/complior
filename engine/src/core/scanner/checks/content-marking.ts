import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../scanner.types.js';

const CHECK_ID = 'content-marking';
const ARTICLE_REF = 'Art. 50(2)';
const OBLIGATION_ID = 'eu-ai-act-OBL-016';

const MARKING_PATTERNS: readonly RegExp[] = [
  /\bc2pa\b/i,
  /\bcontent-credentials\b/i,
  /\bcontentcredentials\b/i,
  /\bwatermark/i,
  /\bai-generated\b/i,
  /X-AI-Generated/i,
  /\bsynthetic[- ]?media\b/i,
  /\bdigital[- ]?provenance\b/i,
];

const CONTENT_GENERATION_PATTERNS: readonly RegExp[] = [
  /\bgenerateImage\b/,
  /\bgenerateVideo\b/,
  /\bgenerateAudio\b/,
  /\btext-to-image\b/i,
  /\btext-to-speech\b/i,
  /\btext-to-video\b/i,
  /\bimage[- ]?generation\b/i,
  /\bcontent[- ]?generation\b/i,
  /\bDALL[-.]?E\b/i,
  /\bstable[- ]?diffusion\b/i,
  /\bmidjourney\b/i,
];

const hasMarkingPatterns = (content: string): boolean =>
  MARKING_PATTERNS.some((p) => p.test(content));

const hasContentGeneration = (content: string): boolean =>
  CONTENT_GENERATION_PATTERNS.some((p) => p.test(content));

export const checkContentMarking = (ctx: ScanContext): readonly CheckResult[] => {
  let markingFound = false;
  let generationFound = false;

  for (const file of ctx.files) {
    if (hasMarkingPatterns(file.content)) {
      markingFound = true;
    }
    if (hasContentGeneration(file.content)) {
      generationFound = true;
    }
  }

  if (markingFound) {
    return [{
      type: 'pass',
      checkId: CHECK_ID,
      message: `Content marking/provenance mechanisms found (${ARTICLE_REF})`,
    }];
  }

  if (generationFound) {
    return [{
      type: 'fail',
      checkId: CHECK_ID,
      message: `AI content generation detected without marking/watermarking (${ARTICLE_REF})`,
      severity: 'high',
      obligationId: OBLIGATION_ID,
      articleReference: ARTICLE_REF,
      fix: 'Implement C2PA content credentials or watermarking for AI-generated content',
    }];
  }

  return [{
    type: 'skip',
    checkId: CHECK_ID,
    reason: 'No AI content generation detected',
  }];
};
