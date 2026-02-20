import { z } from 'zod';

// --- Shared Version Schema ---

export const VersionSchema = z.object({
  framework_version: z.string(),
  processed_date: z.string(),
  source_regulation_version: z.string(),
  processing_prompt_version: z.string(),
  last_regulatory_update_checked: z.string(),
  next_review_due: z.string(),
  notes: z.string().optional(),
  coverage: z.string().optional(),
  domains_covered: z.array(z.string()).optional(),
});

// --- Obligations ---

const ObligationSchema = z.object({
  obligation_id: z.string(),
  article_reference: z.string(),
  title: z.string(),
  description: z.string(),
  applies_to_role: z.string(),
  applies_to_risk_level: z.array(z.string()),
  obligation_type: z.string(),
  what_to_do: z.array(z.string()),
  evidence_required: z.string().optional(),
  deadline: z.string().optional(),
  frequency: z.string().optional(),
  penalty_for_non_compliance: z.string().optional(),
  severity: z.string(),
  automatable: z.string().optional(),
  automation_approach: z.string().nullable().optional(),
  document_template_needed: z.boolean().optional(),
  document_template_type: z.string().nullable().optional(),
  sdk_feature_needed: z.boolean().optional(),
  cli_check_possible: z.boolean().optional(),
  cli_check_description: z.string().nullable().optional(),
  what_not_to_do: z.array(z.string()).optional(),
  parent_obligation: z.string().optional(),
}).passthrough();

export const ObligationsFileSchema = z.object({
  _version: z.string(),
  _note: z.string().optional(),
  obligations: z.array(ObligationSchema),
});

// --- Technical Requirements ---

const CliCheckSchema = z.object({
  what_to_scan: z.string(),
  positive_signals: z.array(z.string()),
  negative_signals: z.array(z.string()),
  warning_message: z.string(),
  fix_suggestion: z.string(),
  severity: z.string(),
});

const SdkImplementationSchema = z.object({
  description: z.string().nullable().optional(),
  middleware_behavior: z.string().nullable().optional(),
  data_to_log: z.array(z.string()).nullable().optional(),
  configuration_options: z.record(z.string()).nullable().optional(),
  code_example: z.string().nullable().optional(),
}).passthrough();

const TechnicalRequirementSchema = z.object({
  obligation_id: z.string(),
  feature_type: z.string(),
  sdk_implementation: SdkImplementationSchema.nullable().optional(),
  cli_check: CliCheckSchema.nullable().optional(),
}).passthrough();

export const TechnicalRequirementsFileSchema = z.object({
  _version: z.string(),
  _note: z.string().optional(),
  technical_requirements: z.array(TechnicalRequirementSchema),
});

// --- Scoring ---

const WeightedCategorySchema = z.object({
  category: z.string(),
  weight: z.number(),
  weight_reasoning: z.string(),
  obligations_in_category: z.array(z.string()),
});

const ThresholdSchema = z.object({
  range: z.string(),
  label: z.string(),
  description: z.string(),
  action: z.string(),
});

const DomainCategorySchema = z.object({
  category: z.string(),
  description: z.string(),
  obligations_in_category: z.array(z.string()),
  applies_when: z.string(),
  weight_when_applicable: z.number(),
});

const ScoringDataSchema = z.object({
  regulation_id: z.string(),
  total_obligations: z.number(),
  critical_obligations: z.number(),
  critical_obligation_ids: z.array(z.string()),
  critical_obligations_note: z.string(),
  weighted_categories: z.array(WeightedCategorySchema),
  score_formula: z.string(),
  score_interpretation: z.record(z.string()),
  thresholds: z.object({
    red: ThresholdSchema,
    yellow: ThresholdSchema,
    green: ThresholdSchema,
  }),
  minimum_for_certificate: z.number(),
  certificate_additional_requirements: z.array(z.string()),
  score_update_triggers: z.array(z.string()),
  domain_specific_categories: z.array(DomainCategorySchema),
});

export const ScoringFileSchema = z.object({
  scoring: ScoringDataSchema,
  version: VersionSchema,
});

// --- Inferred Types ---

export type ObligationsFile = z.infer<typeof ObligationsFileSchema>;
export type TechnicalRequirementsFile = z.infer<typeof TechnicalRequirementsFileSchema>;
export type ScoringFile = z.infer<typeof ScoringFileSchema>;
export type Obligation = z.infer<typeof ObligationSchema>;
export type TechnicalRequirement = z.infer<typeof TechnicalRequirementSchema>;
export type ScoringData = z.infer<typeof ScoringDataSchema>;
export type WeightedCategory = z.infer<typeof WeightedCategorySchema>;
export type DomainCategory = z.infer<typeof DomainCategorySchema>;
