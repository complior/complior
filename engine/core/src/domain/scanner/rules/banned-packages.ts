export type { BannedPackage, ProhibitedPattern } from './banned-packages-data.js';
export { BANNED_PACKAGES, PROHIBITED_PATTERNS } from './banned-packages-data.js';
export { AI_SDK_PACKAGES, BIAS_TESTING_PACKAGES } from './banned-packages-sdk.js';

import { BANNED_PACKAGES, type ProhibitedPattern, PROHIBITED_PATTERNS } from './banned-packages-data.js';
import { AI_SDK_PACKAGES } from './banned-packages-sdk.js';
import type { BannedPackage } from './banned-packages-data.js';

export const isBannedPackage = (name: string): BannedPackage | undefined =>
  BANNED_PACKAGES.find(
    (bp) => bp.name.toLowerCase() === name.toLowerCase(),
  );

export const isAiSdkPackage = (name: string): string | undefined =>
  AI_SDK_PACKAGES.get(name);

export const matchProhibitedPattern = (text: string): ProhibitedPattern | undefined =>
  PROHIBITED_PATTERNS.find((p) => p.regex.test(text));
