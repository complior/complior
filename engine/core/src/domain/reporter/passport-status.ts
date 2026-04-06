import type { PassportStatusSection, PassportDetail, CompletenessZone } from './types.js';
import reporterConfig from '../../../data/reporter-config.json' with { type: 'json' };

/** Passport data as returned by PassportService.listPassports(). */
export interface PassportData {
  readonly name: string;
  readonly completeness?: number;
  readonly fria_completed?: boolean;
  readonly signature?: { readonly value?: string } | null;
  readonly updated_at?: string;
  readonly [key: string]: unknown;
}

const PASSPORT_TOTAL_FIELDS = reporterConfig.passports.totalFields;
const COMPLETENESS_THRESHOLDS = reporterConfig.passports.completenessThresholds;

const toZone = (pct: number): CompletenessZone => {
  if (pct >= COMPLETENESS_THRESHOLDS.green) return 'green';
  if (pct >= COMPLETENESS_THRESHOLDS.yellow) return 'yellow';
  if (pct >= COMPLETENESS_THRESHOLDS.amber) return 'amber';
  return 'red';
};

const KNOWN_FIELDS = [
  'name', 'version', 'description', 'provider', 'organization',
  'risk_class', 'model_id', 'model_version', 'model_provider',
  'deployment_date', 'intended_users', 'intended_purpose',
  'prohibited_uses', 'training_data_summary', 'evaluation_results',
  'performance_metrics', 'limitations', 'ethical_considerations',
  'contact_information', 'regulatory_status', 'fria_completed',
  'human_oversight_measures', 'transparency_measures',
  'data_governance_measures', 'accuracy_metrics', 'robustness_measures',
  'cybersecurity_measures', 'logging_capabilities', 'monitoring_plan',
  'incident_response_plan', 'conformity_assessment', 'declaration_of_conformity',
  'source_files', 'permissions', 'constraints', 'signature', 'created_at',
];

const findMissingFields = (passport: PassportData): string[] =>
  KNOWN_FIELDS.filter((field) => {
    const val = passport[field];
    return val === undefined || val === null || val === '';
  });

export const buildPassportStatus = (passports: readonly PassportData[]): PassportStatusSection => {
  const details: PassportDetail[] = passports.map((p) => {
    const missing = findMissingFields(p);
    const filled = PASSPORT_TOTAL_FIELDS - missing.length;
    const completeness = Math.round((filled / PASSPORT_TOTAL_FIELDS) * 100);

    return {
      name: p.name ?? 'unknown',
      completeness,
      completenessZone: toZone(completeness),
      filledFields: filled,
      totalFields: PASSPORT_TOTAL_FIELDS,
      missingFields: missing,
      friaCompleted: p.fria_completed === true,
      signed: !!(p.signature && typeof p.signature === 'object' && p.signature.value),
      lastUpdated: typeof p.updated_at === 'string' ? p.updated_at : null,
    };
  });

  const avg = details.length > 0
    ? Math.round(details.reduce((sum, d) => sum + d.completeness, 0) / details.length)
    : 0;

  return {
    totalAgents: details.length,
    passports: details,
    averageCompleteness: avg,
  };
};
