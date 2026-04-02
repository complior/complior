/**
 * Zod validation schemas for Agent Passport types.
 * Separated from interfaces (passport.types.ts) to keep both files under 300 lines.
 */
import { z } from 'zod';
import type { AgentPassport } from './passport.types.js';

// --- Sub-block schemas ---

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
  /** Per-agent: passed / (passed + failed) × 100. No category weights. */
  complior_score: z.number().min(0).max(100),
  /** Project-wide: 8-category weighted average, capped at 40 if critical obligation fails. */
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
    doc_quality: z.enum(['none', 'scaffold', 'draft', 'reviewed']).optional(),
  }).optional(),
  data_governance: z.object({
    documented: z.boolean().optional(),
    bias_tested: z.boolean().optional(),
    last_audit: z.string().optional(),
    doc_quality: z.enum(['none', 'scaffold', 'draft', 'reviewed']).optional(),
  }).optional(),
  technical_documentation: z.object({
    documented: z.boolean().optional(),
    last_update: z.string().optional(),
    doc_quality: z.enum(['none', 'scaffold', 'draft', 'reviewed']).optional(),
  }).optional(),
  declaration_of_conformity: z.object({
    documented: z.boolean().optional(),
    date: z.string().optional(),
    doc_quality: z.enum(['none', 'scaffold', 'draft', 'reviewed']).optional(),
  }).optional(),
  art5_screening: z.object({
    completed: z.boolean().optional(),
    date: z.string().optional(),
    doc_quality: z.enum(['none', 'scaffold', 'draft', 'reviewed']).optional(),
  }).optional(),
  instructions_for_use: z.object({
    documented: z.boolean().optional(),
    last_update: z.string().optional(),
    doc_quality: z.enum(['none', 'scaffold', 'draft', 'reviewed']).optional(),
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
  doc_quality_summary: z.object({
    none: z.number().int().min(0),
    scaffold: z.number().int().min(0),
    draft: z.number().int().min(0),
    reviewed: z.number().int().min(0),
  }).optional(),
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

// --- Main passport schema ---

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
  endpoints: z.array(z.string().url()).optional(),
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
