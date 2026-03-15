import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';

const CHECK_ID = 'interaction-logging';
const ARTICLE_REF = 'Art. 12';
const OBLIGATION_ID = 'eu-ai-act-OBL-006';

const LOGGING_PATTERNS: readonly RegExp[] = [
  // JavaScript/TypeScript
  /\bwinston\b/,
  /\bpino\b/,
  /\bbunyan\b/,
  /\blog4js\b/,
  // Python
  /\blogging\.getLogger\b/,
  /\bstructlog\b/,
  /\bloguru\b/,
  /\blog_record\b/i,
  // Go
  /\bzap\.New/,
  /\blogrus\.\b/,
  /\bzerolog\b/,
  /\bslog\.New/,
  // Java/Kotlin
  /\bLoggerFactory\.getLogger\b/,
  /\blog4j\b/,
  /\bLogback\b/i,
  /\bslf4j\b/i,
  // Rust
  /\btracing::/,
  /\blog::info\b/,
  /\benv_logger\b/,
  /\bslog\b/,
  // Cross-language
  /\bstructured[- ]?log/i,
  /\bjsonl\b/i,
  /\baudit[- ]?log/i,
  /\binteraction[- ]?log/i,
  /\bopentelemetry\b/i,
  /\botlp\b/i,
];

const LOG_FIELD_PATTERNS: readonly RegExp[] = [
  /\btimestamp\b/,
  /\bsession[_-]?id\b/i,
  /\binput\b.*\boutput\b/i,
  /\brequest[_-]?id\b/i,
  /\bmodel[_-]?response\b/i,
  /\blog[_-]?retention\b/i,
];

const AI_API_PATTERNS: readonly RegExp[] = [
  // SDKs (multi-language)
  /\bopenai\b/i,
  /\banthropic\b/i,
  /\bgoogle[._]generativeai\b/i,
  /\bvertexai\b/i,
  /\bmistralai\b/i,
  /\bcohere\b/i,
  // JS/TS API calls
  /\bchat\.completions\b/,
  /\bgenerateText\b/,
  /\bstreamText\b/,
  /\.generate\(/,
  /\.complete\(/,
  /\/api\/chat\b/,
  // Python API calls
  /\bclient\.chat\b/,
  /\bmessages\.create\b/,
  /\bChatCompletion\b/,
  /\blangchain\b/i,
  /\bllama_index\b/i,
  // Generic (require API/call/client context)
  /\bllm[_-]?(?:client|api|call|request|response|provider|service|adapter)\b/i,
  /\bai_model\b/i,
  /\bmodel_inference\b/i,
];

const hasLogging = (content: string): boolean =>
  LOGGING_PATTERNS.some((p) => p.test(content));

const hasLogFields = (content: string): boolean =>
  LOG_FIELD_PATTERNS.some((p) => p.test(content));

const hasAiApiCalls = (content: string): boolean =>
  AI_API_PATTERNS.some((p) => p.test(content));

export const checkInteractionLogging = (ctx: ScanContext): readonly CheckResult[] => {
  let loggingFound = false;
  let logFieldsFound = false;
  let aiApiFound = false;

  for (const file of ctx.files) {
    if (hasLogging(file.content)) {
      loggingFound = true;
    }
    if (hasLogFields(file.content)) {
      logFieldsFound = true;
    }
    if (hasAiApiCalls(file.content)) {
      aiApiFound = true;
    }
  }

  if (loggingFound && logFieldsFound) {
    return [{
      type: 'pass',
      checkId: CHECK_ID,
      message: `Structured logging with relevant fields found (${ARTICLE_REF})`,
    }];
  }

  if (aiApiFound && !loggingFound) {
    return [{
      type: 'fail',
      checkId: CHECK_ID,
      message: `AI API calls detected without structured interaction logging (${ARTICLE_REF})`,
      severity: 'critical',
      obligationId: OBLIGATION_ID,
      articleReference: ARTICLE_REF,
      fix: 'Add structured logging (winston/pino) around AI interactions with timestamp, session_id, input, and output fields',
    }];
  }

  if (aiApiFound && loggingFound && !logFieldsFound) {
    return [{
      type: 'fail',
      checkId: CHECK_ID,
      message: `Logging found but missing structured fields for AI interactions (${ARTICLE_REF})`,
      severity: 'high',
      obligationId: OBLIGATION_ID,
      articleReference: ARTICLE_REF,
      fix: 'Ensure logs include timestamp, session_id, input, and output fields for AI interactions',
    }];
  }

  return [{
    type: 'skip',
    checkId: CHECK_ID,
    reason: 'No AI API calls detected',
  }];
};
