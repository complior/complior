import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';
import { AI_SDK_PACKAGES } from '../rules/banned-packages-sdk.js';
import { filterPassportManifests } from '../../passport/builder/manifest-files.js';

const CHECK_ID = 'passport-presence';
const ARTICLE_REF = 'Art. 26(4)';
const OBLIGATION_ID = 'eu-ai-act-OBL-011';

const hasAiSdk = (ctx: ScanContext): boolean => {
  const pkgFile = ctx.files.find((f) => f.relativePath.endsWith('package.json'));
  if (!pkgFile) return false;

  try {
    const pkg = JSON.parse(pkgFile.content) as Record<string, unknown>;
    const deps = {
      ...(pkg.dependencies as Record<string, string> | undefined),
      ...(pkg.devDependencies as Record<string, string> | undefined),
    };

    return Object.keys(deps).some((name) => AI_SDK_PACKAGES.has(name));
  } catch {
    return false;
  }
};

export const checkPassportPresence = (ctx: ScanContext): readonly CheckResult[] => {
  const passportFiles = filterPassportManifests(ctx.files);

  if (passportFiles.length > 0) {
    return [{
      type: 'pass',
      checkId: CHECK_ID,
      message: `Agent Passport found (${passportFiles.length} manifest(s)) — ${ARTICLE_REF}`,
    }];
  }

  // Only fail if AI SDK is detected (no passport needed without AI)
  if (hasAiSdk(ctx)) {
    return [{
      type: 'fail',
      checkId: CHECK_ID,
      message: `No Agent Passport found — AI SDK detected but no .complior/agents/*-manifest.json (${ARTICLE_REF})`,
      severity: 'high',
      obligationId: OBLIGATION_ID,
      articleReference: ARTICLE_REF,
      fix: 'Run `complior agent init` to generate an Agent Passport for your AI system',
    }];
  }

  // No AI SDK → skip
  return [{
    type: 'skip',
    checkId: CHECK_ID,
    reason: 'No AI SDK detected — passport not required',
  }];
};
