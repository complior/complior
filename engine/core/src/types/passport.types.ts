import type { RegistryToolCard } from '../data/registry-cards.js';

// --- Summaries ---

/** Lightweight passport summary used by chat service system prompt. */
export interface PassportSummary {
  readonly name: string;
  readonly type: string;
  readonly riskClass: string;
  readonly autonomyLevel: string;
  readonly completeness: number;
}

// --- Enums ---

export type AutonomyLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type AgentType = 'autonomous' | 'assistive' | 'hybrid';
export type PassportRiskClass = 'prohibited' | 'high' | 'limited' | 'minimal';
export type LifecycleStatus = 'draft' | 'review' | 'active' | 'suspended' | 'retired';
export type SourceMode = 'auto' | 'semi-auto' | 'manual';

export type DocQualityLevel = 'none' | 'scaffold' | 'draft' | 'reviewed';

// --- Sub-interfaces ---

export interface OwnerBlock {
  readonly team: string;
  readonly contact: string;
  readonly responsible_person: string;
}

export interface AutonomyEvidence {
  readonly human_approval_gates: number;
  readonly unsupervised_actions: number;
  readonly no_logging_actions: number;
  readonly auto_rated: boolean;
}

export interface ModelInfo {
  readonly provider: string;
  readonly model_id: string;
  readonly deployment: string;
  readonly data_residency: string;
}

export type PiiHandlingMode = 'block' | 'redact' | 'allow';

export interface DataBoundaries {
  readonly pii_handling: PiiHandlingMode;
  readonly geographic_restrictions?: readonly string[];
  readonly retention_days?: number;
  readonly prohibited_data_types?: readonly string[];
}

export interface PermissionsBlock {
  readonly tools: readonly string[];
  readonly data_access: {
    readonly read: readonly string[];
    readonly write: readonly string[];
    readonly delete: readonly string[];
  };
  readonly denied: readonly string[];
  readonly data_boundaries?: DataBoundaries;
}

export type EscalationAction = 'require_approval' | 'notify' | 'block' | 'log';

export interface EscalationRule {
  readonly condition: string;
  readonly action: EscalationAction;
  readonly description: string;
  readonly timeout_minutes?: number;
}

export interface ConstraintsBlock {
  readonly rate_limits: { readonly max_actions_per_minute: number };
  readonly budget: { readonly max_cost_per_session_usd: number };
  readonly human_approval_required: readonly string[];
  readonly prohibited_actions: readonly string[];
  readonly escalation_rules?: readonly EscalationRule[];
}

export interface FrameworkScore {
  readonly framework_id: string;
  readonly framework_name: string;
  readonly score: number;
  readonly grade?: string;
  readonly assessed_at?: string;
}

export interface ComplianceBlock {
  readonly eu_ai_act: {
    readonly risk_class: PassportRiskClass;
    readonly applicable_articles: readonly string[];
    readonly deployer_obligations_met: readonly string[];
    readonly deployer_obligations_pending: readonly string[];
  };
  /** Per-agent compliance score: passed / (passed + failed) × 100.
   *  Uses agent-specific + global findings. Simple ratio without category weights. */
  readonly complior_score: number;
  /** Project-wide weighted score: 8-category weighted average with critical cap at 40.
   *  Computed by score-calculator.ts using category weights and obligation severity. */
  readonly project_score?: number;
  readonly last_scan: string;
  readonly fria_completed?: boolean;
  readonly fria_date?: string;
  readonly worker_notification_sent?: boolean;
  readonly worker_notification_date?: string;
  readonly policy_generated?: boolean;
  readonly policy_date?: string;
  readonly ai_literacy?: {
    readonly training_completed?: boolean;
    readonly last_training_date?: string;
    readonly trained_count?: number;
    readonly next_training_due?: string;
  };
  readonly risk_management?: {
    readonly documented?: boolean;
    readonly last_review?: string;
    readonly risk_count?: number;
    readonly residual_risks_accepted?: number;
    readonly doc_quality?: DocQualityLevel;
  };
  readonly data_governance?: {
    readonly documented?: boolean;
    readonly bias_tested?: boolean;
    readonly last_audit?: string;
    readonly doc_quality?: DocQualityLevel;
  };
  readonly technical_documentation?: {
    readonly documented?: boolean;
    readonly last_update?: string;
    readonly doc_quality?: DocQualityLevel;
  };
  readonly declaration_of_conformity?: {
    readonly documented?: boolean;
    readonly date?: string;
    readonly doc_quality?: DocQualityLevel;
  };
  readonly art5_screening?: {
    readonly completed?: boolean;
    readonly date?: string;
    readonly doc_quality?: DocQualityLevel;
  };
  readonly instructions_for_use?: {
    readonly documented?: boolean;
    readonly last_update?: string;
    readonly doc_quality?: DocQualityLevel;
  };
  readonly scan_summary?: {
    readonly total_checks: number;
    readonly passed: number;
    readonly failed: number;
    readonly skipped: number;
    readonly by_category: Readonly<Record<string, { readonly passed: number; readonly failed: number }>>;
    readonly failed_checks: readonly string[];
    readonly scan_date: string;
  };
  readonly multi_framework?: readonly FrameworkScore[];
  readonly doc_quality_summary?: {
    readonly none: number;
    readonly scaffold: number;
    readonly draft: number;
    readonly reviewed: number;
  };
}

export interface OversightBlock {
  readonly responsible_person: string;
  readonly role: string;
  readonly contact: string;
  readonly override_mechanism: string;
  readonly escalation_procedure: string;
}

export interface DisclosureBlock {
  readonly user_facing: boolean;
  readonly disclosure_text: string;
  readonly ai_marking: {
    readonly responses_marked: boolean;
    readonly method: string;
  };
}

export interface LoggingBlock {
  readonly actions_logged: boolean;
  readonly retention_days: number;
  readonly includes_decision_rationale: boolean;
}

export interface LifecycleBlock {
  readonly status: LifecycleStatus;
  readonly deployed_since: string;
  readonly next_review: string;
  readonly review_frequency_days: number;
}

export interface InteropBlock {
  readonly mcp_servers: readonly { readonly name: string; readonly tools_allowed: readonly string[] }[];
}

export interface SignatureBlock {
  readonly algorithm: string;
  readonly public_key: string;
  readonly signed_at: string;
  readonly hash: string;
  readonly value: string;
}

export interface SourceBlock {
  readonly mode: SourceMode;
  readonly generated_by: string;
  readonly code_analyzed: boolean;
  readonly fields_auto_filled: readonly string[];
  readonly fields_manual: readonly string[];
  readonly confidence: number;
}

// --- Main passport interface ---

export interface AgentPassport {
  readonly $schema: string;
  readonly manifest_version: string;
  readonly agent_id: string;

  // Identity
  readonly name: string;
  readonly display_name: string;
  readonly description: string;
  readonly version: string;
  readonly created: string;
  readonly updated: string;

  // Ownership
  readonly owner: OwnerBlock;

  // Autonomy
  readonly type: AgentType;
  readonly autonomy_level: AutonomyLevel;
  readonly autonomy_evidence: AutonomyEvidence;

  // Tech stack
  readonly framework: string;
  readonly model: ModelInfo;

  // Permissions & Constraints
  readonly permissions: PermissionsBlock;
  readonly constraints: ConstraintsBlock;

  // Compliance
  readonly compliance: ComplianceBlock;

  // Human Oversight (Art. 14)
  readonly oversight?: OversightBlock;

  // Disclosure & Logging
  readonly disclosure: DisclosureBlock;
  readonly logging: LoggingBlock;

  // Lifecycle
  readonly lifecycle: LifecycleBlock;

  // Interop
  readonly interop: InteropBlock;

  // Upstream registry cards (auto-filled from detected models)
  readonly upstream_registry?: readonly RegistryToolCard[];

  // Source files (file paths belonging to this agent)
  readonly source_files?: readonly string[];

  // Source tracking
  readonly source: SourceBlock;

  // Signature
  readonly signature: SignatureBlock;
}

// Zod schemas and parsePassport() are in ./passport-schemas.ts

// --- Discovery result ---

export interface DiscoveredAgent {
  readonly name: string;
  readonly entryFile: string;
  readonly framework: string;
  readonly language: string;
  readonly detectedSdks: readonly string[];
  readonly detectedModels: readonly string[];
  readonly confidence: number;
  readonly sourceFiles: readonly string[];
}
