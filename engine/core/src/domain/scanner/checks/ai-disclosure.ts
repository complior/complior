import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';

const CHECK_ID = 'ai-disclosure';
const ARTICLE_REF = 'Art. 50(1)';
const OBLIGATION_ID = 'eu-ai-act-OBL-015';

const DISCLOSURE_PATTERNS: readonly RegExp[] = [
  // Direct AI disclosure text
  /\bAI[- ]?powered\b/i,
  /\bartificial intelligence\b/i,
  /\bautomated system\b/i,
  /\bAI[- ]?generated\b/i,
  /\bpowered by AI\b/i,
  /\bAI disclosure\b/i,
  /\btransparency notice\b/i,
  // EU AI Act specific
  /\bAI system\b/i,
  /\bautomated decision[- ]?making\b/i,
  /\bmachine learning\b/i,
  // Interaction-specific disclosures
  /\byou are (?:interacting|chatting|speaking) with (?:an? )?AI\b/i,
  /\bthis (?:is|uses) (?:an? )?(?:AI|artificial intelligence)\b/i,
  /\bgenerated (?:by|using|with) (?:an? )?AI\b/i,
  /\bAI[- ]?assisted\b/i,
  /\bnot a human\b/i,
  // SDK/framework disclosure mechanisms
  /\bdisclosure[_-]?text\b/i,
  /\btransparency[_-]?label\b/i,
  /\bai[_-]?notice\b/i,
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
  // Voice / multimodal
  /\bvoice[- ]?assistant\b/i,
  /\bspeech[- ]?to[- ]?text\b/i,
  /\btext[- ]?to[- ]?speech\b/i,
  // Decision support
  /\brecommendation[- ]?engine\b/i,
  /\bdecision[- ]?support\b/i,
  /\bautomated[- ]?scoring\b/i,
  /\bai[- ]?agent\b/i,
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
