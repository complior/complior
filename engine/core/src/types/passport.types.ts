import { z } from 'zod';
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
  readonly complior_score: number;
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
  };
  readonly data_governance?: {
    readonly documented?: boolean;
    readonly bias_tested?: boolean;
    readonly last_audit?: string;
  };
  readonly technical_documentation?: {
    readonly documented?: boolean;
    readonly last_update?: string;
  };
  readonly declaration_of_conformity?: {
    readonly documented?: boolean;
    readonly date?: string;
  };
  readonly art5_screening?: {
    readonly completed?: boolean;
    readonly date?: string;
  };
  readonly instructions_for_use?: {
    readonly documented?: boolean;
    readonly last_update?: string;
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

const DataBoundariesSchema = z.object({
  pii_handling: z.enum(['block', 'redact', 'allow']),
  geographic_restrictions: z.array(z.string()).optional(),
  retention_days: z.number().int().min(0).optional(),
  prohibited_data_types: z.array(z.string()).optional(),
});

const PermissionsBlockSchema = z.object({
  tools: z.array(z.string()),
  data_access: z.object({
    read: z.array(z.string()),
    write: z.array(z.string()),
    delete: z.array(z.string()),
  }),
  denied: z.array(z.string()),
  data_boundaries: DataBoundariesSchema.optional(),
});

const EscalationRuleSchema = z.object({
  condition: z.string(),
  action: z.enum(['require_approval', 'notify', 'block', 'log']),
  description: z.string(),
  timeout_minutes: z.number().int().min(0).optional(),
});

const ConstraintsBlockSchema = z.object({
  rate_limits: z.object({ max_actions_per_minute: z.number().int().min(0) }),
  budget: z.object({ max_cost_per_session_usd: z.number().min(0) }),
  human_approval_required: z.array(z.string()),
  prohibited_actions: z.array(z.string()),
  escalation_rules: z.array(EscalationRuleSchema).optional(),
});

const ComplianceBlockSchema = z.object({
  eu_ai_act: z.object({
    risk_class: z.enum(['prohibited', 'high', 'limited', 'minimal']),
    applicable_articles: z.array(z.string()),
    deployer_obligations_met: z.array(z.string()),
    deployer_obligations_pending: z.array(z.string()),
  }),
  complior_score: z.number().min(0).max(100),
  project_score: z.number().min(0).max(100).optional(),
  last_scan: z.string(),
  fria_completed: z.boolean().optional(),
  fria_date: z.string().optional(),
  worker_notification_sent: z.boolean().optional(),
  worker_notification_date: z.string().optional(),
  policy_generated: z.boolean().optional(),
  policy_date: z.string().optional(),
  ai_literacy: z.object({
    training_completed: z.boolean().optional(),
    last_training_date: z.string().optional(),
    trained_count: z.number().int().min(0).optional(),
    next_training_due: z.string().optional(),
  }).optional(),
  risk_management: z.object({
    documented: z.boolean().optional(),
    last_review: z.string().optional(),
    risk_count: z.number().int().min(0).optional(),
    residual_risks_accepted: z.number().int().min(0).optional(),
  }).optional(),
  data_governance: z.object({
    documented: z.boolean().optional(),
    bias_tested: z.boolean().optional(),
    last_audit: z.string().optional(),
  }).optional(),
  technical_documentation: z.object({
    documented: z.boolean().optional(),
    last_update: z.string().optional(),
  }).optional(),
  declaration_of_conformity: z.object({
    documented: z.boolean().optional(),
    date: z.string().optional(),
  }).optional(),
  art5_screening: z.object({
    completed: z.boolean().optional(),
    date: z.string().optional(),
  }).optional(),
  instructions_for_use: z.object({
    documented: z.boolean().optional(),
    last_update: z.string().optional(),
  }).optional(),
  scan_summary: z.object({
    total_checks: z.number().int().min(0),
    passed: z.number().int().min(0),
    failed: z.number().int().min(0),
    skipped: z.number().int().min(0),
    by_category: z.record(z.object({
      passed: z.number().int().min(0),
      failed: z.number().int().min(0),
    })),
    failed_checks: z.array(z.string()),
    scan_date: z.string(),
  }).optional(),
  multi_framework: z.array(z.object({
    framework_id: z.string(),
    framework_name: z.string(),
    score: z.number().min(0).max(100),
    grade: z.string().optional(),
    assessed_at: z.string().optional(),
  })).optional(),
});

const OversightBlockSchema = z.object({
  responsible_person: z.string(),
  role: z.string(),
  contact: z.string(),
  override_mechanism: z.string(),
  escalation_procedure: z.string(),
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

export const AgentPassportSchema = z.object({
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
  oversight: OversightBlockSchema.optional(),
  disclosure: DisclosureBlockSchema,
  logging: LoggingBlockSchema,
  lifecycle: LifecycleBlockSchema,
  interop: InteropBlockSchema,
  upstream_registry: z.array(z.record(z.unknown())).optional(),
  source_files: z.array(z.string()).optional(),
  source: SourceBlockSchema,
  signature: SignatureBlockSchema,
});

export const parsePassport = (json: string): AgentPassport | null => {
  try {
    const result = AgentPassportSchema.safeParse(JSON.parse(json));
    return result.success ? (result.data as AgentPassport) : null;
  } catch {
    return null;
  }
};

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
