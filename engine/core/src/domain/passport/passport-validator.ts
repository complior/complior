import { AgentPassportSchema } from '../../types/passport.types.js';
import type { AgentPassport } from '../../types/passport.types.js';
import { verifyPassport as verifyPassportCrypto } from './crypto-signer.js';
import {
  getRequiredFields,
  getFieldValue,
  getMissingFields,
  isNonEmpty,
} from './obligation-field-map.js';
import type { MissingField } from './obligation-field-map.js';

// --- Types ---

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

export interface CompletenessResult {
  readonly score: number;
  readonly filledCount: number;
  readonly totalRequired: number;
  readonly filledFields: readonly string[];
  readonly missingFields: readonly MissingField[];
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly schemaValid: boolean;
  readonly signatureValid: boolean;
  readonly completeness: CompletenessResult;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly string[];
}

// --- Completeness scoring ---

export const computeCompleteness = (manifest: AgentPassport): CompletenessResult => {
  const required = getRequiredFields();
  const totalRequired = required.length;

  const filledFields: string[] = [];
  for (const mapping of required) {
    const value = getFieldValue(manifest, mapping.field);
    if (isNonEmpty(value)) {
      filledFields.push(mapping.field);
    }
  }

  const filledCount = filledFields.length;
  const score = totalRequired > 0 ? Math.round((filledCount / totalRequired) * 100) : 100;
  const missingFields = getMissingFields(manifest);

  return { score, filledCount, totalRequired, filledFields, missingFields };
};

// --- Full validation ---

export const validatePassport = (manifest: AgentPassport): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // 1. Schema validation
  const parseResult = AgentPassportSchema.safeParse(manifest);
  const schemaValid = parseResult.success;
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push({
        field: issue.path.join('.'),
        message: issue.message,
        severity: 'error',
      });
    }
  }

  // 2. Signature verification
  let signatureValid = false;
  try {
    signatureValid = verifyPassportCrypto(manifest);
  } catch {
    errors.push({
      field: 'signature',
      message: 'Signature verification failed',
      severity: 'error',
    });
  }
  if (!signatureValid && errors.every((e) => e.field !== 'signature')) {
    errors.push({
      field: 'signature',
      message: 'Invalid signature — manifest may have been tampered with',
      severity: 'error',
    });
  }

  // 3. Completeness
  const completeness = computeCompleteness(manifest);

  // 4. Semantic warnings
  if (manifest.lifecycle?.status === 'draft') {
    warnings.push('Passport is still in draft status');
  }
  if (manifest.lifecycle?.status === 'suspended') {
    warnings.push('Passport lifecycle is suspended');
  }
  if (manifest.compliance?.last_scan) {
    const lastScan = new Date(manifest.compliance.last_scan);
    const daysSince = Math.floor((Date.now() - lastScan.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 30) {
      warnings.push(`Last compliance scan was ${daysSince} days ago (>30 days)`);
    }
  }
  if (manifest.autonomy_level === 'L4' || manifest.autonomy_level === 'L5') {
    if (!manifest.logging?.actions_logged) {
      warnings.push('High autonomy (L4/L5) without action logging — Art.12 risk');
    }
  }
  if (completeness.score < 80) {
    warnings.push(`Completeness score ${completeness.score}% is below 80% threshold`);
  }

  const valid = schemaValid && signatureValid && errors.length === 0;

  return { valid, schemaValid, signatureValid, completeness, errors, warnings };
};

