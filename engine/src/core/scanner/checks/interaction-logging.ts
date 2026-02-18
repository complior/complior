import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../scanner.types.js';

const CHECK_ID = 'interaction-logging';
const ARTICLE_REF = 'Art. 12';
const OBLIGATION_ID = 'eu-ai-act-OBL-006';

const LOGGING_PATTERNS: readonly RegExp[] = [
  /\bwinston\b/,
  /\bpino\b/,
  /\bbunyan\b/,
  /\blog4js\b/,
  /\bstructured[- ]?log/i,
  /\bjsonl\b/i,
  /\baudit[- ]?log/i,
  /\binteraction[- ]?log/i,
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
  /\bopenai\b/i,
  /\banthropic\b/i,
  /\bchat\.completions\b/,
  /\bgenerateText\b/,
  /\bstreamText\b/,
  /\bllm\b/i,
  /\.generate\(/,
  /\.complete\(/,
  /\/api\/chat\b/,
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
