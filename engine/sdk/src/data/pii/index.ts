export type { PIICategory, PIIPattern } from './types.js';
export { NATIONAL_ID_PATTERNS } from './national-ids.js';
export { PASSPORT_PATTERNS } from './passports.js';
export { FINANCIAL_PATTERNS } from './financial.js';
export { CONTACT_PATTERNS } from './contact.js';
export { MEDICAL_PATTERNS } from './medical.js';
export { GDPR_ART9_PATTERNS } from './gdpr-art9.js';
export { ADDITIONAL_PATTERNS } from './additional.js';

import { NATIONAL_ID_PATTERNS } from './national-ids.js';
import { FINANCIAL_PATTERNS } from './financial.js';
import { MEDICAL_PATTERNS } from './medical.js';
import { GDPR_ART9_PATTERNS } from './gdpr-art9.js';
import { ADDITIONAL_PATTERNS } from './additional.js';
import { CONTACT_PATTERNS } from './contact.js';
import { PASSPORT_PATTERNS } from './passports.js';

/** All PII patterns, ordered for matching priority (specific first, generic last) */
export const PII_PATTERNS: readonly import('./types.js').PIIPattern[] = Object.freeze([
  // Most specific patterns first (with validators)
  ...NATIONAL_ID_PATTERNS,
  ...FINANCIAL_PATTERNS,
  ...MEDICAL_PATTERNS,
  // Context-dependent patterns
  ...GDPR_ART9_PATTERNS,
  ...ADDITIONAL_PATTERNS,
  // Generic patterns last
  ...CONTACT_PATTERNS,
  ...PASSPORT_PATTERNS,
]);
