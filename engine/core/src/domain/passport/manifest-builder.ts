import { randomUUID } from 'node:crypto';
import type {
  AgentPassport,
  DiscoveredAgent,
  AutonomyLevel,
  AgentType,
  AutonomyEvidence,
  PassportRiskClass,
  PermissionsBlock,
  ConstraintsBlock,
  SourceBlock,
} from '../../types/passport.types.js';
import type { ScanResult } from '../../types/common.types.js';

// --- Input interface ---

export interface PassportBuildInput {
  readonly agent: DiscoveredAgent;
  readonly autonomy: {
    readonly level: AutonomyLevel;
    readonly evidence: AutonomyEvidence;
    readonly agentType: AgentType;
  };
  readonly permissions: {
    readonly tools: readonly string[];
    readonly dataAccess: {
      readonly read: readonly string[];
      readonly write: readonly string[];
      readonly delete: readonly string[];
    };
    readonly denied: readonly string[];
    readonly mcpServers: readonly {
      readonly name: string;
      readonly tools_allowed: readonly string[];
    }[];
    readonly humanApprovalRequired: readonly string[];
  };
  readonly scanResult?: ScanResult;
  readonly overrides?: Record<string, unknown>;
}

// --- Tracked passport fields for confidence calculation ---
// Add new fields here when extending the passport schema.

export const ALL_PASSPORT_FIELDS: readonly string[] = [
  // Auto-fillable (conditional on discovery results)
  'name', 'display_name', 'framework', 'model.provider', 'model.model_id',
  'autonomy_level', 'type', 'autonomy_evidence',
  'permissions.tools', 'permissions.data_access', 'permissions.denied',
  'permissions.data_boundaries',
  'constraints.human_approval_required', 'constraints.escalation_rules',
  'compliance.risk_class', 'compliance.complior_score', 'compliance.last_scan',
  'interop.mcp_servers',
  // Manual (always need human input)
  'owner.team', 'owner.contact', 'owner.responsible_person',
  'disclosure.user_facing', 'disclosure.disclosure_text', 'disclosure.ai_marking',
  'constraints.rate_limits', 'constraints.budget',
  'lifecycle.deployed_since', 'lifecycle.next_review',
  'description',
  'permissions.data_boundaries.geographic_restrictions',
  'permissions.data_boundaries.prohibited_data_types',
  // Default-filled (always present, no user input needed)
  'model.deployment', 'model.data_residency',
  'logging.actions_logged', 'logging.retention_days', 'logging.includes_decision_rationale',
  'lifecycle.review_frequency_days', 'lifecycle.status',
];

// --- Helpers ---

const inferRiskClass = (level: AutonomyLevel): PassportRiskClass => {
  switch (level) {
    case 'L1':
    case 'L2':
      return 'minimal';
    case 'L3':
    case 'L4':
      return 'limited';
    case 'L5':
      return 'high';
  }
};

const detectProvider = (sdks: readonly string[]): string => {
  if (sdks.length === 0) return 'unknown';
  const first = sdks[0].toLowerCase();
  if (first.includes('anthropic')) return 'anthropic';
  if (first.includes('openai')) return 'openai';
  if (first.includes('google')) return 'google';
  if (first.includes('vercel')) return 'vercel';
  return sdks[0];
};

const capitalize = (s: string): string =>
  s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);

const toDisplayName = (name: string): string =>
  capitalize(name.replace(/-/g, ' '));

// --- Builder ---

export const buildPassport = (
  input: PassportBuildInput,
): Omit<AgentPassport, 'signature'> => {
  const { agent, autonomy, permissions, scanResult, overrides } = input;

  const agentId = 'ag_' + randomUUID();
  const now = new Date().toISOString();

  // --- Identity ---
  const name = agent.name;
  const displayName = toDisplayName(name);
  const description =
    (agent as DiscoveredAgent & { description?: string }).description ??
    `AI agent using ${agent.framework}`;

  // --- Owner (placeholders) ---
  const owner = {
    team: '',
    contact: '',
    responsible_person: '',
  };

  // --- Model ---
  const model = {
    provider: detectProvider(agent.detectedSdks),
    model_id: agent.detectedModels[0] || 'unknown',
    deployment: 'api' as const,
    data_residency: 'unknown',
  };

  // --- Permissions ---
  const permissionsBlock: PermissionsBlock = {
    tools: [...permissions.tools],
    data_access: {
      read: [...permissions.dataAccess.read],
      write: [...permissions.dataAccess.write],
      delete: [...permissions.dataAccess.delete],
    },
    denied: [...permissions.denied],
    data_boundaries: {
      pii_handling: 'redact',
    },
  };

  // --- Constraints ---
  const constraints: ConstraintsBlock = {
    rate_limits: { max_actions_per_minute: 100 },
    budget: { max_cost_per_session_usd: 5.0 },
    human_approval_required: [...permissions.humanApprovalRequired],
    prohibited_actions: [],
    escalation_rules: permissions.humanApprovalRequired.length > 0
      ? permissions.humanApprovalRequired.map((action) => ({
          condition: `action == "${action}"`,
          action: 'require_approval' as const,
          description: `Human approval required for: ${action}`,
          timeout_minutes: 5,
        }))
      : undefined,
  };

  // --- Compliance ---
  const compliance = {
    eu_ai_act: {
      risk_class: inferRiskClass(autonomy.level),
      applicable_articles: ['Art.50.1', 'Art.50.2', 'Art.12'],
      deployer_obligations_met: [] as string[],
      deployer_obligations_pending: [] as string[],
    },
    complior_score: scanResult?.score.totalScore ?? 0,
    last_scan: scanResult?.scannedAt ?? '',
  };

  // --- Disclosure ---
  const disclosure = {
    user_facing: false,
    disclosure_text: '',
    ai_marking: {
      responses_marked: false,
      method: '',
    },
  };

  // --- Logging ---
  const logging = {
    actions_logged: autonomy.evidence.no_logging_actions === 0,
    retention_days: 365,
    includes_decision_rationale: false,
  };

  // --- Lifecycle ---
  const lifecycle = {
    status: 'draft' as const,
    deployed_since: '',
    next_review: '',
    review_frequency_days: 90,
  };

  // --- Interop ---
  const interop = {
    mcp_servers: permissions.mcpServers.map((s) => ({
      name: s.name,
      tools_allowed: [...s.tools_allowed],
    })),
  };

  // --- Source tracking ---
  const autoFilledFields: string[] = [];
  const manualFields: string[] = [];

  // Identity fields
  if (name) autoFilledFields.push('name');
  if (displayName) autoFilledFields.push('display_name');
  if (agent.framework) autoFilledFields.push('framework');
  if (model.provider !== 'unknown') autoFilledFields.push('model.provider');
  if (model.model_id !== 'unknown') autoFilledFields.push('model.model_id');

  // Autonomy fields
  autoFilledFields.push('autonomy_level', 'type', 'autonomy_evidence');

  // Permissions
  if (permissions.tools.length > 0) autoFilledFields.push('permissions.tools');
  if (
    permissions.dataAccess.read.length > 0 ||
    permissions.dataAccess.write.length > 0 ||
    permissions.dataAccess.delete.length > 0
  )
    autoFilledFields.push('permissions.data_access');
  if (permissions.denied.length > 0) autoFilledFields.push('permissions.denied');
  autoFilledFields.push('permissions.data_boundaries');
  if (permissions.humanApprovalRequired.length > 0) {
    autoFilledFields.push('constraints.human_approval_required');
    autoFilledFields.push('constraints.escalation_rules');
  }

  // Compliance
  autoFilledFields.push('compliance.risk_class');
  if (scanResult) {
    autoFilledFields.push('compliance.complior_score', 'compliance.last_scan');
  }

  // Interop
  if (permissions.mcpServers.length > 0) autoFilledFields.push('interop.mcp_servers');

  // Manual fields (always need human input)
  manualFields.push(
    'owner.team',
    'owner.contact',
    'owner.responsible_person',
    'disclosure.user_facing',
    'disclosure.disclosure_text',
    'disclosure.ai_marking',
    'constraints.rate_limits',
    'constraints.budget',
    'lifecycle.deployed_since',
    'lifecycle.next_review',
    'description',
    'permissions.data_boundaries.geographic_restrictions',
    'permissions.data_boundaries.prohibited_data_types',
  );

  const confidence = autoFilledFields.length / ALL_PASSPORT_FIELDS.length;

  const source: SourceBlock = {
    mode: 'auto',
    generated_by: 'complior',
    code_analyzed: true,
    fields_auto_filled: autoFilledFields,
    fields_manual: manualFields,
    confidence,
  };

  // --- Assemble manifest ---
  const manifest: Omit<AgentPassport, 'signature'> = {
    $schema: 'https://complior.ai/schemas/agent-manifest/v1.json',
    manifest_version: '1.0.0',
    agent_id: agentId,
    name,
    display_name: displayName,
    description,
    version: '1.0.0',
    created: now,
    updated: now,
    owner,
    type: autonomy.agentType,
    autonomy_level: autonomy.level,
    autonomy_evidence: autonomy.evidence,
    framework: agent.framework,
    model,
    permissions: permissionsBlock,
    constraints,
    compliance,
    disclosure,
    logging,
    lifecycle,
    interop,
    source,
  };

  // --- Apply overrides ---
  if (overrides) {
    const result = { ...manifest };
    for (const [key, value] of Object.entries(overrides)) {
      if (key in result && value !== undefined) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
    return result as Omit<AgentPassport, 'signature'>;
  }

  return manifest;
};
