import type { PIIPattern } from './types.js';
import { validateBSN } from '../pii-validators/bsn.js';
import { validateNIR } from '../pii-validators/nir.js';
import { validatePESEL } from '../pii-validators/pesel.js';
import { validateCodiceFiscale } from '../pii-validators/codice-fiscale.js';

/** National ID patterns (8): SSN, BSN, NIR, PESEL, Codice Fiscale, Personalausweis, DNI, NIF */
export const NATIONAL_ID_PATTERNS: readonly PIIPattern[] = [
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
