import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';
import { DOCUMENT_VALIDATORS } from '../validators.js';

const CHECK_ID = 'ai-literacy';
const ARTICLE_REF = 'Art. 4';
const OBLIGATION_ID = 'eu-ai-act-OBL-001';

// Derive file patterns from validators.ts (single source of truth)
const VALIDATOR_FILE_PATTERNS: readonly string[] =
  DOCUMENT_VALIDATORS.find((v) => v.document === 'ai-literacy')?.file_patterns ?? [];

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
  return VALIDATOR_FILE_PATTERNS.some((p) => filename.toLowerCase() === p.toLowerCase());
};

const isTrainingRecordsDir = (relativePath: string): boolean =>
  /training[-_]?records/i.test(relativePath);

const hasLiteracyContent = (content: string): boolean =>
  LITERACY_CONTENT_PATTERNS.some((p) => p.test(content));

const GENERATED_DOC_PATHS: readonly RegExp[] = [
  /^\.complior\/documents\/.*ai[-_]?literacy/i,
  /^\.complior\/reports\/.*ai[-_]?literacy/i,
  /^docs\/compliance\/.*ai[-_]?literacy/i,
];

const isGeneratedDoc = (relativePath: string): boolean =>
  GENERATED_DOC_PATHS.some((p) => p.test(relativePath));

const TRAINING_STALE_MONTHS = 12;

const isTrainingStale = (lastTrainingDate: string): boolean => {
  const last = new Date(lastTrainingDate);
  if (isNaN(last.getTime())) return false; // Invalid date — don't flag
  const now = new Date();
  const monthsDiff = (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth());
  return monthsDiff > TRAINING_STALE_MONTHS;
};

export const checkAiLiteracy = (ctx: ScanContext): readonly CheckResult[] => {
  const results: CheckResult[] = [];
  let docFound = false;

  // Phase 1: Check for policy file by name
  for (const file of ctx.files) {
    if (isPolicyFile(file.relativePath)) {
      docFound = true;
      results.push({
        type: 'pass',
        checkId: CHECK_ID,
        message: `AI literacy policy file found: ${file.relativePath} (${ARTICLE_REF})`,
      });
      break;
    }
  }

  // Phase 2: Check for training-records directory
  if (!docFound) {
    for (const file of ctx.files) {
      if (isTrainingRecordsDir(file.relativePath)) {
        docFound = true;
        results.push({
          type: 'pass',
          checkId: CHECK_ID,
          message: `AI training records directory found (${ARTICLE_REF})`,
        });
        break;
      }
    }
  }

  // Phase 3: Check for generated docs in .complior/documents/
  if (!docFound) {
    for (const file of ctx.files) {
      if (isGeneratedDoc(file.relativePath)) {
        docFound = true;
        results.push({
          type: 'pass',
          checkId: CHECK_ID,
          message: `AI literacy document found: ${file.relativePath} (${ARTICLE_REF})`,
        });
        break;
      }
    }
  }

  // Phase 4: Content scan in docs/
  if (!docFound) {
    const docsFiles = ctx.files.filter((f) =>
      f.relativePath.startsWith('docs/') && f.extension === '.md',
    );
    for (const file of docsFiles) {
      if (hasLiteracyContent(file.content)) {
        docFound = true;
        results.push({
          type: 'pass',
          checkId: CHECK_ID,
          message: `AI literacy content found in docs: ${file.relativePath} (${ARTICLE_REF})`,
        });
        break;
      }
    }
  }

  // Phase 5: Check passport for training actuality
  if (ctx.passportManifests && ctx.passportManifests.length > 0) {
    for (const manifest of ctx.passportManifests) {
      try {
        const passport = JSON.parse(manifest.content);
        const literacy = passport?.compliance?.ai_literacy;
        if (literacy?.last_training_date && isTrainingStale(literacy.last_training_date)) {
          results.push({
            type: 'fail',
            checkId: 'ai-literacy-stale',
            message: `AI literacy training is overdue — last training: ${literacy.last_training_date} (>${TRAINING_STALE_MONTHS} months) (${ARTICLE_REF})`,
            severity: 'medium',
            obligationId: 'eu-ai-act-OBL-001a',
            articleReference: ARTICLE_REF,
            fix: 'Schedule AI literacy refresher training. Art. 4 requires training proportionate to role and risk level.',
          });
        }
        if (literacy?.training_completed === false) {
          results.push({
            type: 'fail',
            checkId: 'ai-literacy-incomplete',
            message: `AI literacy training not yet completed for this system (${ARTICLE_REF})`,
            severity: 'medium',
            obligationId: 'eu-ai-act-OBL-001a',
            articleReference: ARTICLE_REF,
            fix: 'Complete AI literacy training and update passport field compliance.ai_literacy.training_completed',
          });
        }
      } catch { /* skip unparseable passport */ }
    }
  }

  // No document found at all
  if (!docFound) {
    results.push({
      type: 'fail',
      checkId: CHECK_ID,
      message: `No AI literacy policy or training documentation found (${ARTICLE_REF})`,
      severity: 'medium',
      obligationId: OBLIGATION_ID,
      articleReference: ARTICLE_REF,
      fix: 'Create an AI-LITERACY.md policy document covering staff AI competency requirements',
    });
  }

  return results;
};
