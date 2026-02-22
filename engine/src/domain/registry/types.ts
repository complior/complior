import type { RiskLevel } from '../../types/common.types.js';

// --- Identity ---

export interface ToolProvider {
  readonly name: string;
  readonly website: string;
}

export interface ToolIdentity {
  readonly slug: string;
  readonly name: string;
  readonly provider: ToolProvider;
  readonly website: string;
  readonly categories: readonly string[];
  readonly description: string;
  readonly source: string;
  readonly rank_on_source: number | null;
}

// --- Evidence (jurisdiction-agnostic facts) ---

export interface DisclosureEvidence {
  readonly visible: boolean;
  readonly text: string | null;
  readonly location: 'hero' | 'description' | 'meta' | 'footer' | 'banner' | 'none';
}

export interface PrivacyPolicyEvidence {
  readonly mentions_ai: boolean;
  readonly mentions_eu: boolean;
  readonly gdpr_compliant: boolean;
  readonly uses_data_for_training: boolean;
  readonly training_opt_out: boolean;
  readonly opt_out_mechanism: 'settings' | 'email' | 'form' | 'none';
  readonly retention_specified: boolean;
  readonly retention_period: string | null;
  readonly deletion_right: boolean;
  readonly last_updated: string | null;
}

export interface TosEvidence {
  readonly ai_disclaimer: boolean;
  readonly prohibited_uses: boolean;
  readonly prohibited_list: readonly string[];
  readonly liability_disclaimer: boolean;
}

export interface TrustEvidence {
  readonly certifications: readonly string[];
  readonly mentions_ai_act: boolean;
  readonly has_responsible_ai_page: boolean;
  readonly responsible_ai_topics: readonly string[];
  readonly has_eu_ai_act_page: boolean;
}

export interface ModelCardEvidence {
  readonly has_model_card: boolean;
  readonly model_card_url: string | null;
  readonly has_limitations: boolean;
  readonly has_bias_info: boolean;
  readonly has_training_data: boolean;
  readonly has_evaluation: boolean;
}

export interface ContentMarkingEvidence {
  readonly c2pa: boolean;
  readonly watermark: boolean;
  readonly exif_ai_tag: boolean;
}

export interface InfraEvidence {
  readonly blocks_ai_crawlers: boolean;
  readonly blocked_bots: readonly string[];
  readonly has_cookie_consent: boolean;
  readonly consent_platform: string | null;
  readonly has_public_api: boolean;
  readonly has_pricing_page: boolean;
  readonly offers_free_tier: boolean;
  readonly has_ai_plugin: boolean;
}

export interface SocialEvidence {
  readonly estimated_mau: number | null;
  readonly estimated_company_size: 'startup' | 'midsize' | 'enterprise' | null;
  readonly github_stars: number | null;
  readonly github_last_commit: string | null;
}

export interface WebSearchEvidence {
  readonly eu_ai_act_media_mentions: number;
  readonly has_public_bias_audit: boolean;
  readonly bias_audit_url: string | null;
  readonly gdpr_enforcement_history: readonly string[];
  readonly security_incidents: readonly string[];
  readonly has_transparency_report: boolean;
}

export interface LlmTestResult {
  readonly prompt_id: string;
  readonly group: 'identity' | 'safety' | 'bias' | 'factual';
  readonly prompt: string;
  readonly response_snippet: string;
  readonly passed: boolean;
  readonly notes: string;
}

export interface MediaTestResult {
  readonly test_type: 'image' | 'audio' | 'video';
  readonly provider: string;
  readonly prompt: string;
  readonly c2pa_present: boolean;
  readonly watermark_present: boolean;
  readonly exif_ai_tag: boolean;
  readonly file_path: string | null;
}

export interface HumanTestResult {
  readonly slug: string;
  readonly disclosure_visible: boolean;
  readonly disclosure_text: string | null;
  readonly disclosure_location: string | null;
  readonly visible_watermark: boolean | null;
  readonly screenshot_path: string | null;
  readonly tested_at: string;
}

export interface PassiveScanData {
  readonly disclosure: DisclosureEvidence;
  readonly privacy_policy: PrivacyPolicyEvidence;
  readonly tos: TosEvidence;
  readonly trust: TrustEvidence;
  readonly model_card: ModelCardEvidence;
  readonly content_marking: ContentMarkingEvidence;
  readonly infra: InfraEvidence;
  readonly social: SocialEvidence;
  readonly web_search: WebSearchEvidence;
  readonly scanned_at: string;
  readonly pages_fetched: number;
}

export interface ToolEvidence {
  readonly passive_scan: PassiveScanData | null;
  readonly llm_tests: readonly LlmTestResult[] | null;
  readonly media_tests: readonly MediaTestResult[] | null;
  readonly human_tests: HumanTestResult | null;
}

// --- Assessments (per-jurisdiction interpretation of facts) ---

export type RegistryConfidence = 'approximate' | 'high' | 'verified';

export interface ObligationAssessment {
  readonly obligation_id: string;
  readonly title: string;
  readonly article: string;
  readonly applies_to_role: string;
  readonly deadline: string | null;
  readonly severity: string;
  readonly status: 'met' | 'partially_met' | 'not_met' | 'unknown';
  readonly evidence_summary: string | null;
}

export interface JurisdictionAssessment {
  readonly jurisdiction_id: string;
  readonly risk_level: RiskLevel;
  readonly risk_reasoning: string;
  readonly applicable_obligation_ids: readonly string[];
  readonly deployer_obligations: readonly ObligationAssessment[];
  readonly provider_obligations: readonly ObligationAssessment[];
  readonly score: number | null;
  readonly confidence: RegistryConfidence;
  readonly assessed_at: string;
}

// --- SEO ---

export interface SeoFields {
  readonly title: string;
  readonly description: string;
  readonly h1: string;
}

// --- Registry Tool (top-level) ---

export type RegistryLevel = 'classified' | 'scanned' | 'verified';

export interface RegistryTool {
  readonly slug: string;
  readonly name: string;
  readonly provider: ToolProvider;
  readonly website: string;
  readonly categories: readonly string[];
  readonly description: string;
  readonly source: string;
  readonly rank_on_source: number | null;
  readonly level: RegistryLevel;
  readonly priority_score: number;
  readonly evidence: ToolEvidence;
  readonly assessments: Record<string, JurisdictionAssessment>;
  readonly seo: SeoFields;
  readonly created_at: string;
  readonly updated_at: string;
}

// --- Directory output for frontend ---

export interface DirectoryEntry {
  readonly slug: string;
  readonly name: string;
  readonly provider: string;
  readonly categories: readonly string[];
  readonly level: RegistryLevel;
  readonly risk_level: RiskLevel;
  readonly score: number | null;
  readonly confidence: RegistryConfidence | null;
  readonly obligation_count: number;
  readonly seo: SeoFields;
}
