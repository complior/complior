import type { PIIPattern } from './types.js';
import { validateNIR } from '../pii-validators/nir.js';

/** Medical PII patterns (4): EHIC, DE/FR/UK health IDs */
export const MEDICAL_PATTERNS: readonly PIIPattern[] = [
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
