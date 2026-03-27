import type { FileInfo } from '../../../ports/scanner.port.js';
import { CORE_DISCLOSURE_PATTERNS } from '../../shared/disclosure-patterns.js';
import { createPatternCheck } from './pattern-check-factory.js';

/** Source-code-specific disclosure patterns (beyond core). */
const SOURCE_CODE_PATTERNS: readonly RegExp[] = [
  /\bautomated system\b/i,
  /\bAI disclosure\b/i,
  /\btransparency notice\b/i,
  /\bautomated decision[- ]?making\b/i,
  /\byou are (?:interacting|chatting|speaking) with (?:an? )?AI\b/i,
  /\bthis (?:is|uses) (?:an? )?(?:AI|artificial intelligence)\b/i,
  /\bgenerated (?:by|using|with) (?:an? )?AI\b/i,
  /\bAI[- ]?assisted\b/i,
  /\bnot a human\b/i,
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
  /\bvoice[- ]?assistant\b/i,
  /\bspeech[- ]?to[- ]?text\b/i,
  /\btext[- ]?to[- ]?speech\b/i,
  /\brecommendation[- ]?engine\b/i,
  /\bdecision[- ]?support\b/i,
  /\bautomated[- ]?scoring\b/i,
  /\bai[- ]?agent\b/i,
];

const UI_EXTENSIONS: ReadonlySet<string> = new Set(['.tsx', '.jsx', '.html', '.ts', '.js']);
const isUiFile = (file: FileInfo): boolean => UI_EXTENSIONS.has(file.extension);

export const checkAiDisclosure = createPatternCheck({
  checkId: 'ai-disclosure',
  articleRef: 'Art. 50(1)',
  obligationId: 'eu-ai-act-OBL-015',
  severity: 'high',
  positivePatterns: [...CORE_DISCLOSURE_PATTERNS, ...SOURCE_CODE_PATTERNS],
  contextPatterns: CHAT_INDICATORS,
  passMessage: 'AI disclosure patterns found in UI code',
  failMessage: 'Chat/bot code detected without AI disclosure notice',
  skipReason: 'No chat/bot or AI interaction code detected',
  fix: 'Add a visible disclosure that users are interacting with an AI system',
  fileFilter: isUiFile,
});
