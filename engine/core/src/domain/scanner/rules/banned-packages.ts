export type { BannedPackage, ProhibitedPattern } from './banned-packages-data.js';
export { BANNED_PACKAGES, PROHIBITED_PATTERNS } from './banned-packages-data.js';
export { AI_SDK_PACKAGES, BIAS_TESTING_PACKAGES } from './banned-packages-sdk.js';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BANNED_PACKAGES, type ProhibitedPattern, PROHIBITED_PATTERNS } from './banned-packages-data.js';
import { AI_SDK_PACKAGES } from './banned-packages-sdk.js';
import type { BannedPackage } from './banned-packages-data.js';

// --- Custom banned packages from project-level .complior/banned-packages.json ---

let customPackages: readonly BannedPackage[] = [];

export const loadCustomBannedPackages = async (projectPath: string): Promise<readonly BannedPackage[]> => {
  try {
    const filePath = join(projectPath, '.complior', 'banned-packages.json');
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    customPackages = parsed
      .filter((p: unknown) =>
        typeof p === 'object' && p !== null && 'name' in p && typeof (p as Record<string, unknown>).name === 'string',
      )
      .map((p: Record<string, unknown>): BannedPackage => ({
        name: String(p.name),
        ecosystem: (['npm', 'pip', 'cargo', 'go'].includes(String(p.ecosystem ?? ''))
          ? String(p.ecosystem) as BannedPackage['ecosystem'] : 'any'),
        reason: String(p.reason ?? 'Custom banned package'),
        obligationId: String(p.obligationId ?? 'eu-ai-act-OBL-002'),
        article: String(p.article ?? 'Art. 5'),
        penalty: String(p.penalty ?? '€35M or 7% turnover'),
        prohibitedWhen: String(p.prohibitedWhen ?? 'Project-level policy prohibits this package'),
        verifyMessage: String(p.verifyMessage ?? 'Verify this package is needed and does not violate policy'),
      }));
    return customPackages;
  } catch {
    customPackages = [];
    return [];
  }
};

// --- Lookups (built-in + custom) ---

export const isBannedPackage = (name: string): BannedPackage | undefined => {
  const lower = name.toLowerCase();
  return BANNED_PACKAGES.find((bp) => bp.name.toLowerCase() === lower)
    ?? customPackages.find((bp) => bp.name.toLowerCase() === lower);
};

export const isAiSdkPackage = (name: string): string | undefined =>
  AI_SDK_PACKAGES.get(name);

export const matchProhibitedPattern = (text: string): ProhibitedPattern | undefined =>
  PROHIBITED_PATTERNS.find((p) => p.regex.test(text));
