import { z } from 'zod';

// --- Shared Version Schema ---

const VersionSchema = z.object({
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

// --- Regulation Meta ---

const EnforcementDateSchema = z.object({
  phase: z.string(),
  date: z.string(),
  what_applies: z.string(),
  status: z.string().optional(),
});

const PenaltyDetailsSchema = z.record(z.string());

const KeyDefinitionsSchema = z.record(z.string());

const Stage1Schema = z.object({
  regulation_id: z.string(),
  official_name: z.string(),
  official_name_en: z.string(),
  jurisdiction: z.string(),
  jurisdiction_code: z.string(),
  type: z.string(),
  status: z.string(),
  enacted_date: z.string(),
  published_date: z.string(),
  entry_into_force_date: z.string(),
  enforcement_dates: z.array(EnforcementDateSchema),
  full_enforcement_date: z.string(),
  regulatory_body: z.string(),
  max_penalty: z.string(),
  penalty_details: PenaltyDetailsSchema,
  official_text_url: z.string(),
  language: z.string(),
  extraterritorial: z.boolean(),
  extraterritorial_conditions: z.string(),
  risk_based: z.boolean(),
  risk_levels: z.array(z.string()),
  key_definitions: KeyDefinitionsSchema,
});

const RoleSchema = z.object({
  role_id: z.string(),
  name_in_law: z.string(),
  name_en: z.string(),
  definition: z.string(),
  maps_to_complior: z.string(),
  obligations_summary: z.string(),
  relevant_articles: z.array(z.string()),
});

const Stage2Schema = z.object({
  roles: z.array(RoleSchema),
});

const AnswerSchema = z.object({
  text: z.string(),
  points_to_level: z.string().optional(),
  explanation: z.string().optional(),
  next: z.string().nullable().optional(),
  result_if_final: z.string().optional(),
  explanation_if_final: z.string().optional(),
});

const ClassificationLevelSchema = z.object({
  level_id: z.string(),
  name_in_law: z.string(),
  name_en: z.string(),
  definition: z.string(),
  criteria: z.array(z.string()),
  obligations_level: z.string(),
  examples_from_law: z.array(z.string()),
  our_mapping_logic: z.string(),
});

const ClassificationQuestionSchema = z.object({
  question_id: z.string(),
  question: z.string(),
  answers: z.array(AnswerSchema),
});

const Stage3Schema = z.object({
  system: z.string(),
  levels: z.array(ClassificationLevelSchema),
  classification_questions: z.array(ClassificationQuestionSchema),
});

export const RegulationMetaFileSchema = z.object({
  stage_1_metadata: Stage1Schema,
  stage_2_role_mapping: Stage2Schema,
  stage_3_risk_classification: Stage3Schema,
  version: VersionSchema,
});

// --- Applicability Tree ---

const TreeAnswerSchema = z.object({
  text: z.string(),
  next: z.string().nullable(),
  result_if_final: z.string().optional(),
  explanation_if_final: z.string().optional(),
});

const TreeQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  help_text: z.string(),
  answers: z.array(TreeAnswerSchema),
});

const ApplicabilityTreeSchema = z.object({
  regulation_id: z.string(),
  root_question: z.string(),
  questions: z.array(TreeQuestionSchema),
});

export const ApplicabilityTreeFileSchema = z.object({
  applicability_tree: ApplicabilityTreeSchema,
  version: VersionSchema,
});

// --- Cross Mapping ---

const ParallelSchema = z.object({
  overlap: z.string(),
  note: z.string(),
  strictness: z.string().optional(),
});

const ConflictSchema = z.object({
  regulation: z.string(),
  conflict_type: z.string(),
  description: z.string(),
  resolution: z.string(),
});

const CrossMappingEntrySchema = z.object({
  this_obligation: z.string(),
  this_requirement_summary: z.string(),
  known_parallels: z.record(ParallelSchema),
  conflicts_with: z.array(ConflictSchema),
});

export const CrossMappingFileSchema = z.object({
  cross_mapping_note: z.string().optional(),
  cross_mapping: z.array(CrossMappingEntrySchema),
  strictest_rule_wins_matrix: z.record(z.unknown()).optional(),
  version: VersionSchema.optional(),
});

// --- Localization ---

const TerminologyEntrySchema = z.object({
  english_term: z.string(),
  local_terms: z.record(z.string()),
  definition: z.string(),
  usage_context: z.string(),
});

const LocalizationDataSchema = z.object({
  regulation_id: z.string(),
  primary_language: z.string(),
  ui_language_needed: z.array(z.string()),
  priority_ui_languages: z.array(z.string()),
  document_languages: z.array(z.string()),
  terminology: z.array(TerminologyEntrySchema),
});

export const LocalizationFileSchema = z.object({
  localization: LocalizationDataSchema,
  version: VersionSchema.optional(),
});

// --- Timeline ---

const KeyDateSchema = z.object({
  date: z.string(),
  event: z.string(),
  impact_on_product: z.string(),
  status: z.string(),
});

const CodeOfPracticeSchema = z.object({
  title: z.string(),
  status: z.string(),
  description: z.string(),
  url: z.string().optional(),
  expected_date: z.string().optional(),
});

const TimelineDataSchema = z.object({
  regulation_id: z.string(),
  key_dates: z.array(KeyDateSchema),
  expected_amendments: z.array(z.string()),
  codes_of_practice: z.array(CodeOfPracticeSchema),
  monitoring_sources: z.array(z.string()),
  review_frequency: z.string(),
});

export const TimelineFileSchema = z.object({
  timeline: TimelineDataSchema,
  version: VersionSchema,
});

// --- Inferred Types ---

export type ObligationsFile = z.infer<typeof ObligationsFileSchema>;
export type TechnicalRequirementsFile = z.infer<typeof TechnicalRequirementsFileSchema>;
export type ScoringFile = z.infer<typeof ScoringFileSchema>;
export type RegulationMetaFile = z.infer<typeof RegulationMetaFileSchema>;
export type ApplicabilityTreeFile = z.infer<typeof ApplicabilityTreeFileSchema>;
export type CrossMappingFile = z.infer<typeof CrossMappingFileSchema>;
export type LocalizationFile = z.infer<typeof LocalizationFileSchema>;
export type TimelineFile = z.infer<typeof TimelineFileSchema>;

export type Obligation = z.infer<typeof ObligationSchema>;
export type TechnicalRequirement = z.infer<typeof TechnicalRequirementSchema>;
export type ScoringData = z.infer<typeof ScoringDataSchema>;
export type WeightedCategory = z.infer<typeof WeightedCategorySchema>;
export type DomainCategory = z.infer<typeof DomainCategorySchema>;
