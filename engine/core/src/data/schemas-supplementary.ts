import { z } from 'zod';
import { VersionSchema } from './schemas-core.js';

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

export type RegulationMetaFile = z.infer<typeof RegulationMetaFileSchema>;
export type ApplicabilityTreeFile = z.infer<typeof ApplicabilityTreeFileSchema>;
export type CrossMappingFile = z.infer<typeof CrossMappingFileSchema>;
export type LocalizationFile = z.infer<typeof LocalizationFileSchema>;
export type TimelineFile = z.infer<typeof TimelineFileSchema>;
