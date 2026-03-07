import { z } from 'zod';

// --- Enums ---

export type AutonomyLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type AgentType = 'autonomous' | 'assistive' | 'hybrid';
export type PassportRiskClass = 'prohibited' | 'high' | 'limited' | 'minimal';
export type LifecycleStatus = 'draft' | 'review' | 'active' | 'suspended' | 'retired';
export type SourceMode = 'auto' | 'semi-auto' | 'manual';

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

export interface PermissionsBlock {
  readonly tools: readonly string[];
  readonly data_access: {
    readonly read: readonly string[];
    readonly write: readonly string[];
    readonly delete: readonly string[];
  };
  readonly denied: readonly string[];
}

export interface ConstraintsBlock {
  readonly rate_limits: { readonly max_actions_per_minute: number };
  readonly budget: { readonly max_cost_per_session_usd: number };
  readonly human_approval_required: readonly string[];
  readonly prohibited_actions: readonly string[];
}

export interface ComplianceBlock {
  readonly eu_ai_act: {
    readonly risk_class: PassportRiskClass;
    readonly applicable_articles: readonly string[];
    readonly deployer_obligations_met: readonly string[];
    readonly deployer_obligations_pending: readonly string[];
  };
  readonly complior_score: number;
  readonly last_scan: string;
  readonly fria_completed?: boolean;
  readonly fria_date?: string;
  readonly worker_notification_sent?: boolean;
  readonly worker_notification_date?: string;
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

// --- Main manifest interface ---

export interface AgentManifest {
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

  // Disclosure & Logging
  readonly disclosure: DisclosureBlock;
  readonly logging: LoggingBlock;

  // Lifecycle
  readonly lifecycle: LifecycleBlock;

  // Interop
  readonly interop: InteropBlock;

  // Source tracking
  readonly source: SourceBlock;

  // Signature
  readonly signature: SignatureBlock;
}

// --- Zod schema for validation ---

const OwnerBlockSchema = z.object({
  team: z.string(),
  contact: z.string(),
  responsible_person: z.string(),
});

const AutonomyEvidenceSchema = z.object({
  human_approval_gates: z.number().int().min(0),
  unsupervised_actions: z.number().int().min(0),
  no_logging_actions: z.number().int().min(0),
  auto_rated: z.boolean(),
});

const ModelInfoSchema = z.object({
  provider: z.string(),
  model_id: z.string(),
  deployment: z.string(),
  data_residency: z.string(),
});

const PermissionsBlockSchema = z.object({
  tools: z.array(z.string()),
  data_access: z.object({
    read: z.array(z.string()),
    write: z.array(z.string()),
    delete: z.array(z.string()),
  }),
  denied: z.array(z.string()),
});

const ConstraintsBlockSchema = z.object({
  rate_limits: z.object({ max_actions_per_minute: z.number().int().min(0) }),
  budget: z.object({ max_cost_per_session_usd: z.number().min(0) }),
  human_approval_required: z.array(z.string()),
  prohibited_actions: z.array(z.string()),
});

const ComplianceBlockSchema = z.object({
  eu_ai_act: z.object({
    risk_class: z.enum(['prohibited', 'high', 'limited', 'minimal']),
    applicable_articles: z.array(z.string()),
    deployer_obligations_met: z.array(z.string()),
    deployer_obligations_pending: z.array(z.string()),
  }),
  complior_score: z.number().min(0).max(100),
  last_scan: z.string(),
  fria_completed: z.boolean().optional(),
  fria_date: z.string().optional(),
  worker_notification_sent: z.boolean().optional(),
  worker_notification_date: z.string().optional(),
});

const DisclosureBlockSchema = z.object({
  user_facing: z.boolean(),
  disclosure_text: z.string(),
  ai_marking: z.object({
    responses_marked: z.boolean(),
    method: z.string(),
  }),
});

const LoggingBlockSchema = z.object({
  actions_logged: z.boolean(),
  retention_days: z.number().int().min(0),
  includes_decision_rationale: z.boolean(),
});

const LifecycleBlockSchema = z.object({
  status: z.enum(['draft', 'review', 'active', 'suspended', 'retired']),
  deployed_since: z.string(),
  next_review: z.string(),
  review_frequency_days: z.number().int().min(1),
});

const InteropBlockSchema = z.object({
  mcp_servers: z.array(z.object({
    name: z.string(),
    tools_allowed: z.array(z.string()),
  })),
});

const SignatureBlockSchema = z.object({
  algorithm: z.string(),
  public_key: z.string(),
  signed_at: z.string(),
  hash: z.string(),
  value: z.string(),
});

const SourceBlockSchema = z.object({
  mode: z.enum(['auto', 'semi-auto', 'manual']),
  generated_by: z.string(),
  code_analyzed: z.boolean(),
  fields_auto_filled: z.array(z.string()),
  fields_manual: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const AgentManifestSchema = z.object({
  $schema: z.string(),
  manifest_version: z.string(),
  agent_id: z.string(),
  name: z.string(),
  display_name: z.string(),
  description: z.string(),
  version: z.string(),
  created: z.string(),
  updated: z.string(),
  owner: OwnerBlockSchema,
  type: z.enum(['autonomous', 'assistive', 'hybrid']),
  autonomy_level: z.enum(['L1', 'L2', 'L3', 'L4', 'L5']),
  autonomy_evidence: AutonomyEvidenceSchema,
  framework: z.string(),
  model: ModelInfoSchema,
  permissions: PermissionsBlockSchema,
  constraints: ConstraintsBlockSchema,
  compliance: ComplianceBlockSchema,
  disclosure: DisclosureBlockSchema,
  logging: LoggingBlockSchema,
  lifecycle: LifecycleBlockSchema,
  interop: InteropBlockSchema,
  source: SourceBlockSchema,
  signature: SignatureBlockSchema,
});

// --- Discovery result ---

export interface DiscoveredAgent {
  readonly name: string;
  readonly entryFile: string;
  readonly framework: string;
  readonly language: string;
  readonly detectedSdks: readonly string[];
  readonly detectedModels: readonly string[];
  readonly confidence: number;
}
