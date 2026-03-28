import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';

const CHECK_ID = 'gpai-systemic-risk';
const ARTICLE_REF = 'Art. 55';
const OBLIGATION_ID = 'eu-ai-act-OBL-023';

const DOC_PATTERNS: readonly RegExp[] = [
  /^GPAI[-_]?SYSTEMIC[-_]?RISK/i,
  /^SYSTEMIC[-_]?RISK[-_]?ASSESSMENT/i,
  /^GPAI[-_]?RISK[-_]?ASSESSMENT/i,
  /^MODEL[-_]?RISK[-_]?ASSESSMENT/i,
];

const CONTENT_PATTERNS: readonly RegExp[] = [
  /\bsystemic risk\b/i,
  /\badversarial testing\b/i,
  /\bred teaming\b/i,
  /\bincident monitoring\b.*\bgpai\b/i,
  /\bgpai\b.*\bincident monitoring\b/i,
  /\bmodel evaluation\b.*\bsafety\b/i,
];

/** Indicators that the project deals with GPAI models that may have systemic risk. */
const SYSTEMIC_INDICATORS: readonly RegExp[] = [
  /\b10\^25\b|\b1e25\b/i,                 // FLOP threshold (Art. 51)
  /\bsystemic risk\b/i,
  /\bfoundation model\b.*\blarge\b/i,
  /\blarge language model\b/i,
  /\bfrontier model\b/i,
  /\bgeneral[-_ ]?purpose ai\b.*\bsystemic\b/i,
];

const isDocFile = (relativePath: string): boolean => {
  const filename = relativePath.split('/').pop() ?? '';
  return DOC_PATTERNS.some((p) => p.test(filename));
};

const hasContent = (content: string): boolean =>
  CONTENT_PATTERNS.some((p) => p.test(content));

const hasSystemicIndicators = (content: string): boolean =>
  SYSTEMIC_INDICATORS.some((p) => p.test(content));

export const checkGpaiSystemicRisk = (ctx: ScanContext): readonly CheckResult[] => {
  // 1. Check for dedicated systemic risk doc file
  for (const file of ctx.files) {
    if (isDocFile(file.relativePath)) {
      return [{
        type: 'pass',
        checkId: CHECK_ID,
        message: `GPAI systemic risk assessment found: ${file.relativePath} (${ARTICLE_REF})`,
      }];
    }
  }

  // 2. Check markdown files for systemic risk content
  const docsFiles = ctx.files.filter((f) => f.extension === '.md');
  for (const file of docsFiles) {
    if (hasContent(file.content)) {
      return [{
        type: 'pass',
        checkId: CHECK_ID,
        message: `GPAI systemic risk content found in: ${file.relativePath} (${ARTICLE_REF})`,
      }];
    }
  }

  // 3. Only flag if project has systemic risk indicators in code/config files.
  // Compliance docs that merely describe a provider's model (e.g., "large language model")
  // should not trigger systemic risk assessment requirements for deployers.
  const codeFiles = ctx.files.filter((f) => f.extension !== '.md');
  let indicatorsFound = false;
  for (const file of codeFiles) {
    if (hasSystemicIndicators(file.content)) {
      indicatorsFound = true;
      break;
    }
  }

  if (indicatorsFound) {
    return [{
      type: 'fail',
      checkId: CHECK_ID,
      message: `GPAI systemic risk indicators detected without risk assessment (${ARTICLE_REF})`,
      severity: 'high',
      obligationId: OBLIGATION_ID,
      articleReference: ARTICLE_REF,
      fix: 'Create a GPAI-SYSTEMIC-RISK-ASSESSMENT.md with adversarial testing, incident monitoring, and cybersecurity measures',
    }];
  }

  return [{
    type: 'skip',
    checkId: CHECK_ID,
    reason: 'No GPAI systemic risk indicators detected',
  }];
};
