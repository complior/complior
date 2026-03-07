import { validateIBAN } from './pii-validators/iban.js';
import { validateBSN } from './pii-validators/bsn.js';
import { validateNIR } from './pii-validators/nir.js';
import { validatePESEL } from './pii-validators/pesel.js';
import { validateCodiceFiscale } from './pii-validators/codice-fiscale.js';

export type PIICategory =
  | 'identity_national'
  | 'identity_passport'
  | 'financial'
  | 'contact'
  | 'medical'
  | 'gdpr_art9';

export interface PIIPattern {
  readonly id: string;
  readonly pattern: RegExp;
  readonly category: PIICategory;
  readonly label: string;
  readonly description: string;
  readonly validator?: (match: string) => boolean;
  readonly article?: string;
  readonly contextKeywords?: readonly string[];
}

// ── National IDs (8) ────────────────────────────────────────────

const NATIONAL_ID_PATTERNS: readonly PIIPattern[] = [
  {
    id: 'SSN',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    category: 'identity_national',
    label: 'SSN',
    description: 'US Social Security Number',
    article: 'GDPR Art.87',
  },
  {
    id: 'BSN',
    pattern: /\b\d{9}\b/g,
    category: 'identity_national',
    label: 'BSN',
    description: 'Dutch Burgerservicenummer',
    validator: validateBSN,
    article: 'GDPR Art.87',
  },
  {
    id: 'NIR',
    pattern: /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g,
    category: 'identity_national',
    label: 'NIR',
    description: 'French NIR (Sécurité sociale)',
    validator: validateNIR,
    article: 'GDPR Art.87',
  },
  {
    id: 'PESEL',
    pattern: /\b\d{11}\b/g,
    category: 'identity_national',
    label: 'PESEL',
    description: 'Polish PESEL number',
    validator: validatePESEL,
    article: 'GDPR Art.87',
  },
  {
    id: 'CODICE_FISCALE',
    pattern: /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi,
    category: 'identity_national',
    label: 'CODICE_FISCALE',
    description: 'Italian Codice Fiscale',
    validator: validateCodiceFiscale,
    article: 'GDPR Art.87',
  },
  {
    id: 'PERSONALAUSWEIS',
    pattern: /\b[CFGHJKLMNPRTVWXYZ0-9]{9}\d\b/g,
    category: 'identity_national',
    label: 'PERSONALAUSWEIS',
    description: 'German Personalausweis ID number',
    article: 'GDPR Art.87',
  },
  {
    id: 'DNI',
    pattern: /\b\d{8}[A-Z]\b/g,
    category: 'identity_national',
    label: 'DNI',
    description: 'Spanish DNI (Documento Nacional de Identidad)',
    article: 'GDPR Art.87',
  },
  {
    id: 'NIF',
    pattern: /\b\d{9}[A-Z]{2}\b/g,
    category: 'identity_national',
    label: 'NIF',
    description: 'Portuguese NIF (Número de Identificação Fiscal)',
    article: 'GDPR Art.87',
  },
];

// ── Passports (14) ──────────────────────────────────────────────

const PASSPORT_PATTERNS: readonly PIIPattern[] = [
  {
    id: 'PASSPORT_DE',
    pattern: /\b[CFGHJK][0-9A-Z]{8}\b/g,
    category: 'identity_passport',
    label: 'PASSPORT_DE',
    description: 'German passport number',
    article: 'GDPR Art.87',
  },
  {
    id: 'PASSPORT_FR',
    pattern: /\b\d{2}[A-Z]{2}\d{5}\b/g,
    category: 'identity_passport',
    label: 'PASSPORT_FR',
    description: 'French passport number',
    article: 'GDPR Art.87',
  },
  {
    id: 'PASSPORT_NL',
    pattern: /\b[A-Z]{2}[A-Z0-9]{6}\d\b/g,
    category: 'identity_passport',
    label: 'PASSPORT_NL',
    description: 'Dutch passport number',
    article: 'GDPR Art.87',
  },
  {
    id: 'PASSPORT_PL',
    pattern: /\b[A-Z]{2}\d{7}\b/g,
    category: 'identity_passport',
    label: 'PASSPORT_PL',
    description: 'Polish passport number',
    article: 'GDPR Art.87',
  },
  {
    id: 'PASSPORT_IT',
    pattern: /\b[A-Z]{2}\d{7}\b/g,
    category: 'identity_passport',
    label: 'PASSPORT_IT',
    description: 'Italian passport number',
    article: 'GDPR Art.87',
  },
  {
    id: 'PASSPORT_ES',
    pattern: /\b[A-Z]{3}\d{6}\b/g,
    category: 'identity_passport',
    label: 'PASSPORT_ES',
    description: 'Spanish passport number',
    article: 'GDPR Art.87',
  },
  {
    id: 'PASSPORT_PT',
    pattern: /\b[A-Z]{1,2}\d{6}\b/g,
    category: 'identity_passport',
    label: 'PASSPORT_PT',
    description: 'Portuguese passport number',
    article: 'GDPR Art.87',
  },
  {
    id: 'PASSPORT_BE',
    pattern: /\b[A-Z]{2}\d{6}\b/g,
    category: 'identity_passport',
    label: 'PASSPORT_BE',
    description: 'Belgian passport number',
    article: 'GDPR Art.87',
  },
  {
    id: 'PASSPORT_AT',
    pattern: /\b[A-Z]\d{7}\b/g,
    category: 'identity_passport',
    label: 'PASSPORT_AT',
    description: 'Austrian passport number',
    article: 'GDPR Art.87',
  },
  {
    id: 'PASSPORT_SE',
    pattern: /\b\d{8}\b/g,
    category: 'identity_passport',
    label: 'PASSPORT_SE',
    description: 'Swedish passport number',
    article: 'GDPR Art.87',
  },
  {
    id: 'PASSPORT_DK',
    pattern: /\b\d{9}\b/g,
    category: 'identity_passport',
    label: 'PASSPORT_DK',
    description: 'Danish passport number',
    article: 'GDPR Art.87',
  },
  {
    id: 'PASSPORT_FI',
    pattern: /\b[A-Z]{2}\d{7}\b/g,
    category: 'identity_passport',
    label: 'PASSPORT_FI',
    description: 'Finnish passport number',
    article: 'GDPR Art.87',
  },
  {
    id: 'PASSPORT_IE',
    pattern: /\b[A-Z]{2}\d{7}\b/g,
    category: 'identity_passport',
    label: 'PASSPORT_IE',
    description: 'Irish passport number',
    article: 'GDPR Art.87',
  },
  {
    id: 'PASSPORT_GENERIC',
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    category: 'identity_passport',
    label: 'PASSPORT',
    description: 'Generic EU passport number format',
    article: 'GDPR Art.87',
  },
];

// ── Financial (4) ───────────────────────────────────────────────

const FINANCIAL_PATTERNS: readonly PIIPattern[] = [
  {
    id: 'IBAN',
    pattern: /\b[A-Z]{2}\d{2}[\s]?[A-Z0-9]{4}[\s]?(?:[A-Z0-9]{4}[\s]?){1,7}[A-Z0-9]{1,4}\b/gi,
    category: 'financial',
    label: 'IBAN',
    description: 'International Bank Account Number (ISO 13616)',
    validator: validateIBAN,
    article: 'GDPR Art.6',
  },
  {
    id: 'CC_SPACED',
    pattern: /\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/g,
    category: 'financial',
    label: 'CREDIT_CARD',
    description: 'Credit card number (spaced/dashed)',
    article: 'GDPR Art.6',
  },
  {
    id: 'CC_CONTIGUOUS',
    pattern: /\b\d{16}\b/g,
    category: 'financial',
    label: 'CREDIT_CARD',
    description: 'Credit card number (contiguous)',
    article: 'GDPR Art.6',
  },
  {
    id: 'SWIFT_BIC',
    pattern: /\b[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g,
    category: 'financial',
    label: 'SWIFT_BIC',
    description: 'SWIFT/BIC bank code',
    article: 'GDPR Art.6',
  },
];

// ── Contact (5) ─────────────────────────────────────────────────

const CONTACT_PATTERNS: readonly PIIPattern[] = [
  {
    id: 'EMAIL',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    category: 'contact',
    label: 'EMAIL',
    description: 'Email address',
    article: 'GDPR Art.6',
  },
  {
    id: 'PHONE_INTL',
    pattern: /(?<!\w)\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4}\b/g,
    category: 'contact',
    label: 'PHONE',
    description: 'International phone number',
    article: 'GDPR Art.6',
  },
  {
    id: 'PHONE_EU',
    pattern: /\b0\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g,
    category: 'contact',
    label: 'PHONE',
    description: 'EU domestic phone number',
    article: 'GDPR Art.6',
  },
  {
    id: 'IPV4',
    pattern: /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    category: 'contact',
    label: 'IP_ADDRESS',
    description: 'IPv4 address',
    article: 'GDPR Recital 30',
  },
  {
    id: 'IPV6',
    pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    category: 'contact',
    label: 'IP_ADDRESS',
    description: 'IPv6 address',
    article: 'GDPR Recital 30',
  },
];

// ── Medical (4) ─────────────────────────────────────────────────

const MEDICAL_PATTERNS: readonly PIIPattern[] = [
  {
    id: 'EHIC',
    pattern: /\b\d{2}\s?\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\b/g,
    category: 'medical',
    label: 'EHIC',
    description: 'European Health Insurance Card number',
    article: 'GDPR Art.9(2)(h)',
  },
  {
    id: 'DE_KVNR',
    pattern: /\b[A-Z]\d{9}\b/g,
    category: 'medical',
    label: 'HEALTH_ID_DE',
    description: 'German Krankenversichertennummer',
    article: 'GDPR Art.9(2)(h)',
  },
  {
    id: 'FR_CARTE_VITALE',
    pattern: /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g,
    category: 'medical',
    label: 'HEALTH_ID_FR',
    description: 'French Carte Vitale (NIR-based)',
    validator: validateNIR,
    article: 'GDPR Art.9(2)(h)',
  },
  {
    id: 'UK_NHS',
    pattern: /\b\d{3}\s?\d{3}\s?\d{4}\b/g,
    category: 'medical',
    label: 'HEALTH_ID_UK',
    description: 'UK NHS number',
    article: 'GDPR Art.9(2)(h)',
  },
];

// ── GDPR Art.9 Special Categories (8) ───────────────────────────

const GDPR_ART9_PATTERNS: readonly PIIPattern[] = [
  {
    id: 'ART9_RACIAL',
    pattern: /\b(?:racial|ethnic)\s+(?:origin|background|group|identity|heritage|minority)\b/gi,
    category: 'gdpr_art9',
    label: 'ART9_RACIAL',
    description: 'Racial or ethnic origin data (GDPR Art.9)',
    article: 'GDPR Art.9(1)',
    contextKeywords: ['race', 'ethnicity', 'ethnic', 'racial', 'origin', 'heritage', 'nationality'],
  },
  {
    id: 'ART9_POLITICAL',
    pattern: /\b(?:political)\s+(?:opinion|affiliation|party|belief|view|membership|leaning)\b/gi,
    category: 'gdpr_art9',
    label: 'ART9_POLITICAL',
    description: 'Political opinions data (GDPR Art.9)',
    article: 'GDPR Art.9(1)',
    contextKeywords: ['political', 'party', 'vote', 'election', 'ideology', 'democrat', 'republican', 'liberal', 'conservative'],
  },
  {
    id: 'ART9_RELIGIOUS',
    pattern: /\b(?:religious|philosophical)\s+(?:belief|affiliation|practice|faith|denomination|conviction)\b/gi,
    category: 'gdpr_art9',
    label: 'ART9_RELIGIOUS',
    description: 'Religious or philosophical beliefs data (GDPR Art.9)',
    article: 'GDPR Art.9(1)',
    contextKeywords: ['religion', 'religious', 'faith', 'church', 'mosque', 'synagogue', 'temple', 'belief', 'spiritual'],
  },
  {
    id: 'ART9_TRADE_UNION',
    pattern: /\b(?:trade\s+union|union\s+member|labor\s+union|labour\s+union)\s*(?:membership|status|affiliation|card)?\b/gi,
    category: 'gdpr_art9',
    label: 'ART9_TRADE_UNION',
    description: 'Trade union membership data (GDPR Art.9)',
    article: 'GDPR Art.9(1)',
    contextKeywords: ['union', 'trade union', 'labor', 'labour', 'membership', 'collective bargaining'],
  },
  {
    id: 'ART9_GENETIC',
    pattern: /\b(?:genetic\s+(?:data|test|result|marker|profile|sequence|analysis|screening|information))\b/gi,
    category: 'gdpr_art9',
    label: 'ART9_GENETIC',
    description: 'Genetic data (GDPR Art.9)',
    article: 'GDPR Art.9(1)',
    contextKeywords: ['genetic', 'DNA', 'genome', 'gene', 'hereditary', 'chromosom'],
  },
  {
    id: 'ART9_BIOMETRIC',
    pattern: /\b(?:biometric\s+(?:data|template|identifier|scan|sample|profile|information))\b/gi,
    category: 'gdpr_art9',
    label: 'ART9_BIOMETRIC',
    description: 'Biometric data for identification (GDPR Art.9)',
    article: 'GDPR Art.9(1)',
    contextKeywords: ['biometric', 'fingerprint', 'facial recognition', 'iris', 'retina', 'voiceprint'],
  },
  {
    id: 'ART9_HEALTH',
    pattern: /\b(?:health\s+(?:condition|status|record|data|diagnosis|history|information)|medical\s+(?:record|history|condition|diagnosis|data|information))\b/gi,
    category: 'gdpr_art9',
    label: 'ART9_HEALTH',
    description: 'Health data (GDPR Art.9)',
    article: 'GDPR Art.9(1)',
    contextKeywords: ['health', 'medical', 'diagnosis', 'patient', 'treatment', 'disease', 'symptom', 'hospital'],
  },
  {
    id: 'ART9_SEXUAL',
    pattern: /\b(?:sexual)\s+(?:orientation|preference|identity|life|behavior|behaviour)\b/gi,
    category: 'gdpr_art9',
    label: 'ART9_SEXUAL',
    description: 'Sexual orientation data (GDPR Art.9)',
    article: 'GDPR Art.9(1)',
    contextKeywords: ['sexual', 'orientation', 'gender identity', 'LGBTQ'],
  },
];

// ── Additional (7) ──────────────────────────────────────────────

const ADDITIONAL_PATTERNS: readonly PIIPattern[] = [
  {
    id: 'VAT_EU',
    pattern: /\b(?:ATU|BE0?|BG|CY|CZ|DE|DK|EE|EL|ES[A-Z]?|FI|FR[A-Z0-9]{2}|HR|HU|IE\d[A-Z+*]|IT|LT|LU|LV|MT|NL\d{9}B|PL|PT|RO|SE|SI|SK)\d{7,12}\b/g,
    category: 'financial',
    label: 'VAT_NUMBER',
    description: 'EU VAT identification number',
    article: 'GDPR Art.6',
  },
  {
    id: 'DRIVING_LICENSE_DE',
    pattern: /\b\d{4}[A-Z]{2}\d{4}[A-Z]\d{2}\b/g,
    category: 'identity_national',
    label: 'DRIVING_LICENSE',
    description: 'German driving license number',
    article: 'GDPR Art.87',
  },
  {
    id: 'DOB',
    pattern: /\b(?:0[1-9]|[12]\d|3[01])[./-](?:0[1-9]|1[0-2])[./-](?:19|20)\d{2}\b/g,
    category: 'identity_national',
    label: 'DATE_OF_BIRTH',
    description: 'Date of birth (DD/MM/YYYY format)',
    article: 'GDPR Art.6',
  },
  {
    id: 'POSTAL_DE',
    pattern: /\b\d{5}\b/g,
    category: 'contact',
    label: 'POSTAL_CODE',
    description: 'German postal code',
    article: 'GDPR Art.6',
    contextKeywords: ['address', 'postal', 'zip', 'postcode', 'PLZ', 'Postleitzahl', 'wohnt', 'lives at'],
  },
  {
    id: 'POSTAL_UK',
    pattern: /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi,
    category: 'contact',
    label: 'POSTAL_CODE',
    description: 'UK postal code',
    article: 'GDPR Art.6',
    contextKeywords: ['address', 'postal', 'postcode', 'lives at', 'located at'],
  },
  {
    id: 'POSTAL_NL',
    pattern: /\b\d{4}\s?[A-Z]{2}\b/g,
    category: 'contact',
    label: 'POSTAL_CODE',
    description: 'Dutch postal code',
    article: 'GDPR Art.6',
    contextKeywords: ['address', 'postal', 'postcode', 'adres', 'woont'],
  },
  {
    id: 'MAC_ADDRESS',
    pattern: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
    category: 'contact',
    label: 'MAC_ADDRESS',
    description: 'MAC address (device identifier)',
    article: 'GDPR Recital 30',
  },
];

/** All PII patterns, ordered for matching priority (specific first, generic last) */
export const PII_PATTERNS: readonly PIIPattern[] = [
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
];
