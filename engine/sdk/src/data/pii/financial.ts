import type { PIIPattern } from './types.js';
import { validateIBAN } from '../pii-validators/iban.js';

/** Financial PII patterns (4): IBAN, credit cards, SWIFT/BIC */
export const FINANCIAL_PATTERNS: readonly PIIPattern[] = [
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
