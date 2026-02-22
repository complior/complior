import { z } from 'zod';

// --- Identity ---

export const ToolProviderSchema = z.object({
  name: z.string(),
  website: z.string(),
});

// --- Evidence (jurisdiction-agnostic facts) ---

export const DisclosureEvidenceSchema = z.object({
  visible: z.boolean(),
  text: z.string().nullable(),
  location: z.enum(['hero', 'description', 'meta', 'footer', 'banner', 'none']),
});

export const PrivacyPolicyEvidenceSchema = z.object({
  mentions_ai: z.boolean(),
  mentions_eu: z.boolean(),
  gdpr_compliant: z.boolean(),
  uses_data_for_training: z.boolean(),
  training_opt_out: z.boolean(),
  opt_out_mechanism: z.enum(['settings', 'email', 'form', 'none']),
  retention_specified: z.boolean(),
  retention_period: z.string().nullable(),
  deletion_right: z.boolean(),
  last_updated: z.string().nullable(),
});

export const TosEvidenceSchema = z.object({
  ai_disclaimer: z.boolean(),
  prohibited_uses: z.boolean(),
  prohibited_list: z.array(z.string()),
  liability_disclaimer: z.boolean(),
});

export const TrustEvidenceSchema = z.object({
  certifications: z.array(z.string()),
  mentions_ai_act: z.boolean(),
  has_responsible_ai_page: z.boolean(),
  responsible_ai_topics: z.array(z.string()),
  has_eu_ai_act_page: z.boolean(),
});

export const ModelCardEvidenceSchema = z.object({
  has_model_card: z.boolean(),
  model_card_url: z.string().nullable(),
  has_limitations: z.boolean(),
  has_bias_info: z.boolean(),
  has_training_data: z.boolean(),
  has_evaluation: z.boolean(),
});

export const ContentMarkingEvidenceSchema = z.object({
  c2pa: z.boolean(),
  watermark: z.boolean(),
  exif_ai_tag: z.boolean(),
});

export const InfraEvidenceSchema = z.object({
  blocks_ai_crawlers: z.boolean(),
  blocked_bots: z.array(z.string()),
  has_cookie_consent: z.boolean(),
  consent_platform: z.string().nullable(),
  has_public_api: z.boolean(),
  has_pricing_page: z.boolean(),
  offers_free_tier: z.boolean(),
  has_ai_plugin: z.boolean().default(false),
});

export const SocialEvidenceSchema = z.object({
  estimated_mau: z.number().nullable(),
  estimated_company_size: z.enum(['startup', 'midsize', 'enterprise']).nullable(),
  github_stars: z.number().nullable(),
  github_last_commit: z.string().nullable(),
});

export const WebSearchEvidenceSchema = z.object({
  eu_ai_act_media_mentions: z.number(),
  has_public_bias_audit: z.boolean(),
  bias_audit_url: z.string().nullable(),
  gdpr_enforcement_history: z.array(z.string()),
  security_incidents: z.array(z.string()),
  has_transparency_report: z.boolean(),
});

export const LlmTestResultSchema = z.object({
  prompt_id: z.string(),
  group: z.enum(['identity', 'safety', 'bias', 'factual']),
  prompt: z.string(),
  response_snippet: z.string(),
  passed: z.boolean(),
  notes: z.string(),
});

export const MediaTestResultSchema = z.object({
  test_type: z.enum(['image', 'audio', 'video']),
  provider: z.string(),
  prompt: z.string(),
  c2pa_present: z.boolean(),
  watermark_present: z.boolean(),
  exif_ai_tag: z.boolean(),
  file_path: z.string().nullable(),
});

export const HumanTestResultSchema = z.object({
  slug: z.string(),
  disclosure_visible: z.boolean(),
  disclosure_text: z.string().nullable(),
  disclosure_location: z.string().nullable(),
  visible_watermark: z.boolean().nullable(),
  screenshot_path: z.string().nullable(),
  tested_at: z.string(),
});

export const PassiveScanDataSchema = z.object({
  disclosure: DisclosureEvidenceSchema,
  privacy_policy: PrivacyPolicyEvidenceSchema,
  tos: TosEvidenceSchema,
  trust: TrustEvidenceSchema,
  model_card: ModelCardEvidenceSchema,
  content_marking: ContentMarkingEvidenceSchema,
  infra: InfraEvidenceSchema,
  social: SocialEvidenceSchema,
  web_search: WebSearchEvidenceSchema,
  scanned_at: z.string(),
  pages_fetched: z.number(),
});

export const ToolEvidenceSchema = z.object({
  passive_scan: PassiveScanDataSchema.nullable(),
  llm_tests: z.array(LlmTestResultSchema).nullable(),
  media_tests: z.array(MediaTestResultSchema).nullable(),
  human_tests: HumanTestResultSchema.nullable(),
});

// --- Assessments (per-jurisdiction) ---

export const ObligationAssessmentSchema = z.object({
  obligation_id: z.string(),
  title: z.string(),
  article: z.string(),
  applies_to_role: z.string(),
  deadline: z.string().nullable(),
  severity: z.string(),
  status: z.enum(['met', 'partially_met', 'not_met', 'unknown']),
  evidence_summary: z.string().nullable(),
});

export const JurisdictionAssessmentSchema = z.object({
  jurisdiction_id: z.string(),
  risk_level: z.enum(['unacceptable', 'high', 'limited', 'minimal', 'gpai', 'gpai_systemic']),
  risk_reasoning: z.string(),
  applicable_obligation_ids: z.array(z.string()),
  deployer_obligations: z.array(ObligationAssessmentSchema),
  provider_obligations: z.array(ObligationAssessmentSchema),
  score: z.number().nullable(),
  confidence: z.enum(['approximate', 'high', 'verified']),
  assessed_at: z.string(),
});

export const SeoFieldsSchema = z.object({
  title: z.string(),
  description: z.string(),
  h1: z.string(),
});

// --- Registry Tool (top-level) ---

export const RegistryToolSchema = z.object({
  slug: z.string(),
  name: z.string(),
  provider: ToolProviderSchema,
  website: z.string(),
  categories: z.array(z.string()),
  description: z.string(),
  source: z.string(),
  rank_on_source: z.number().nullable(),
  level: z.enum(['classified', 'scanned', 'verified']),
  priority_score: z.number(),
  evidence: ToolEvidenceSchema,
  assessments: z.record(z.string(), JurisdictionAssessmentSchema),
  seo: SeoFieldsSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export const RegistryFileSchema = z.array(RegistryToolSchema);

// --- Directory (frontend-facing summary) ---

export const DirectoryEntrySchema = z.object({
  slug: z.string(),
  name: z.string(),
  provider: z.string(),
  categories: z.array(z.string()),
  level: z.enum(['classified', 'scanned', 'verified']),
  risk_level: z.enum(['unacceptable', 'high', 'limited', 'minimal', 'gpai', 'gpai_systemic']),
  score: z.number().nullable(),
  confidence: z.enum(['approximate', 'high', 'verified']).nullable(),
  obligation_count: z.number(),
  seo: SeoFieldsSchema,
});

export const DirectoryFileSchema = z.array(DirectoryEntrySchema);

// --- Inferred types ---

export type RegistryToolData = z.infer<typeof RegistryToolSchema>;
export type DirectoryEntryData = z.infer<typeof DirectoryEntrySchema>;
