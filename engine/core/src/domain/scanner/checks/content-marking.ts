import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';

const CHECK_ID = 'content-marking';
const ARTICLE_REF = 'Art. 50(2)';
const OBLIGATION_ID = 'eu-ai-act-OBL-016';

const MARKING_PATTERNS: readonly RegExp[] = [
  // C2PA / Content Authenticity Initiative
  /\bc2pa\b/i,
  /\bcontent-credentials\b/i,
  /\bcontentcredentials\b/i,
  /\bcontent[- ]?authenticity\b/i,
  // Google SynthID
  /\bsynthid\b/i,
  /\bsynth[_-]?id\b/i,
  // IPTC metadata
  /\biptc\b/i,
  /\bexif.*ai/i,
  /\bdigitalSourceType\b/i,
  // Invisible watermarking
  /\binvisible[- ]?watermark\b/i,
  /\bsteganograph/i,
  /\brobust[- ]?watermark\b/i,
  // Generic marking (require AI/content context)
  /\bwatermark.*(?:ai|generat|synthe|content|media)/i,
  /(?:ai|generat|synthe|content|media).*\bwatermark/i,
  /\bai-generated\b/i,
  /X-AI-Generated/i,
  /\bsynthetic[- ]?media\b/i,
  /\bdigital[- ]?provenance\b/i,
  // SDK markers
  /\bcontent[- ]?provenance\b/i,
  /\bai[_-]?content[_-]?label\b/i,
];

const CONTENT_GENERATION_PATTERNS: readonly RegExp[] = [
  // API calls
  /\bgenerateImage\b/,
  /\bgenerateVideo\b/,
  /\bgenerateAudio\b/,
  /\bimages\.generate\b/,
  /\baudio\.speech\b/,
  // Text-to-X modalities
  /\btext-to-image\b/i,
  /\btext-to-speech\b/i,
  /\btext-to-video\b/i,
  /\btext-to-audio\b/i,
  /\bimage-to-image\b/i,
  // Generic
  /\bimage[- ]?generation\b/i,
  /\bcontent[- ]?generation\b/i,
  /\bvideo[- ]?generation\b/i,
  /\baudio[- ]?generation\b/i,
  /\bspeech[- ]?synthesis\b/i,
  // Known models/services
  /\bDALL[-.]?E\b/i,
  /\bstable[- ]?diffusion\b/i,
  /\bmidjourney\b/i,
  /\bflux[._-]?(?:pro|dev|schnell|1)\b/i,
  /\bsuno\b/i,
  /\bsora\b/i,
  /\belevenlabs\b/i,
  /\bwhisper\b/i,
  /\bdeepfake\b/i,
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
