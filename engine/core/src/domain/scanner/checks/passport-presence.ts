import { readdirSync } from 'node:fs';
import { join } from 'node:path';
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

/**
 * Count passport manifests — first check ctx.files (covers tests and configs that
 * include .complior), then fall back to disk read (production: .complior is excluded
 * from EXCLUDED_DIRS in file-collector).
 */
const countPassportManifests = (ctx: ScanContext): number => {
  // 1. Check scanned files (works in tests and when .complior is explicitly included)
  const fromCtx = filterPassportManifests(ctx.files).length;
  if (fromCtx > 0) return fromCtx;

  // 2. Fall back to disk read (production — .complior excluded from scanning)
  try {
    const agentsDir = join(ctx.projectPath, '.complior', 'agents');
    return readdirSync(agentsDir).filter(f => f.endsWith('-manifest.json')).length;
  } catch {
    return 0;
  }
};

export const checkPassportPresence = (ctx: ScanContext): readonly CheckResult[] => {
  const manifestCount = countPassportManifests(ctx);

  if (manifestCount > 0) {
    return [{
      type: 'pass',
      checkId: CHECK_ID,
      message: `Agent Passport found (${manifestCount} manifest(s)) — ${ARTICLE_REF}`,
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
