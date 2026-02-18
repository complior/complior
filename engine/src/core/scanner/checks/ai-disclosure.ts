import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../scanner.types.js';

const CHECK_ID = 'ai-disclosure';
const ARTICLE_REF = 'Art. 50(1)';
const OBLIGATION_ID = 'eu-ai-act-OBL-015';

const DISCLOSURE_PATTERNS: readonly RegExp[] = [
  /\bAI[- ]?powered\b/i,
  /\bartificial intelligence\b/i,
  /\bautomated system\b/i,
  /\bAI[- ]?generated\b/i,
  /\bpowered by AI\b/i,
  /\bAI disclosure\b/i,
  /\btransparency notice\b/i,
];

const CHAT_INDICATORS: readonly RegExp[] = [
  /\bchatbot\b/i,
  /\bchat[- ]?widget\b/i,
  /\bconversational[- ]?ai\b/i,
  /\bvirtual[- ]?assistant\b/i,
  /\bai[- ]?assistant\b/i,
  /\bchat[- ]?endpoint\b/i,
  /\/api\/chat\b/i,
  /\bmessage.*bot\b/i,
];

const UI_EXTENSIONS: ReadonlySet<string> = new Set(['.tsx', '.jsx', '.html', '.ts', '.js']);

const hasDisclosurePatterns = (content: string): boolean =>
  DISCLOSURE_PATTERNS.some((p) => p.test(content));

const hasChatIndicators = (content: string): boolean =>
  CHAT_INDICATORS.some((p) => p.test(content));

export const checkAiDisclosure = (ctx: ScanContext): readonly CheckResult[] => {
  const uiFiles = ctx.files.filter((f) => UI_EXTENSIONS.has(f.extension));

  let disclosureFound = false;
  let chatCodeFound = false;

  for (const file of uiFiles) {
    if (hasDisclosurePatterns(file.content)) {
      disclosureFound = true;
    }
    if (hasChatIndicators(file.content)) {
      chatCodeFound = true;
    }
  }

  if (disclosureFound) {
    return [{
      type: 'pass',
      checkId: CHECK_ID,
      message: `AI disclosure patterns found in UI code (${ARTICLE_REF})`,
    }];
  }

  if (chatCodeFound) {
    return [{
      type: 'fail',
      checkId: CHECK_ID,
      message: `Chat/bot code detected without AI disclosure notice (${ARTICLE_REF})`,
      severity: 'high',
      obligationId: OBLIGATION_ID,
      articleReference: ARTICLE_REF,
      fix: 'Add a visible disclosure that users are interacting with an AI system',
    }];
  }

  return [{
    type: 'skip',
    checkId: CHECK_ID,
    reason: 'No chat/bot or AI interaction code detected',
  }];
};
