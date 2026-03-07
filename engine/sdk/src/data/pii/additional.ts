import type { PIIPattern } from './types.js';

/** Additional PII patterns (7): VAT, driving license, DOB, postal codes, MAC address */
export const ADDITIONAL_PATTERNS: readonly PIIPattern[] = [
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
