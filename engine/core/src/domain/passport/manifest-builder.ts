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
  OversightBlock,
  SourceBlock,
} from '../../types/passport.types.js';
import type { ScanResult } from '../../types/common.types.js';
import { findRegistryCard } from '../../data/registry-cards.js';
import { OBLIGATION_FIELD_MAP, getFieldValue, isNonEmpty } from './obligation-field-map.js';
import { buildScanSummary, deriveDocStatusFromFindings } from './scan-to-compliance.js';

// --- Input interface ---

export interface ProjectProfile {
  readonly domain: string;
  readonly dataTypes: readonly string[];
  readonly systemType: string;
  readonly riskLevel: string;
  readonly dataStorage?: string;
}

export interface ExistingPassportDates {
  readonly created: string;
  readonly deployed_since: string;
}

export interface PassportBuildInput {
  readonly agent: DiscoveredAgent;
  readonly autonomy: {
    readonly level: AutonomyLevel;
    readonly evidence: AutonomyEvidence;
    readonly agentType: AgentType;
    readonly killSwitchPresent: boolean;
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
  readonly projectProfile?: ProjectProfile;
  readonly existingPassport?: ExistingPassportDates;
}

// --- Tracked passport fields for confidence calculation ---
// Add new fields here when extending the passport schema.

export const ALL_PASSPORT_FIELDS: readonly string[] = [
  // Auto-fillable (conditional on discovery results)
  'name', 'display_name', 'framework', 'source_files', 'model.provider', 'model.model_id',
  'autonomy_level', 'type', 'autonomy_evidence',
  'permissions.tools', 'permissions.data_access', 'permissions.denied',
  'permissions.data_boundaries',
  'constraints.human_approval_required', 'constraints.escalation_rules',
  'compliance.risk_class', 'compliance.complior_score', 'compliance.last_scan',
  'compliance.technical_documentation', 'compliance.declaration_of_conformity',
  'compliance.art5_screening', 'compliance.instructions_for_use',
  'compliance.scan_summary',
  'interop.mcp_servers',
  'upstream_registry',
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

/** Step 4: Resolve risk class — takes the HIGHER of autonomy-based and domain-based risk. */
const RISK_ORDER: readonly PassportRiskClass[] = ['minimal', 'limited', 'high', 'prohibited'];

export const resolveRiskClass = (
  autonomyLevel: AutonomyLevel,
  profileRisk?: string,
): PassportRiskClass => {
  const autonomyRisk = inferRiskClassFromAutonomy(autonomyLevel);
  if (!profileRisk) return autonomyRisk;

  const domainRisk = normalizeRiskClass(profileRisk);
  const autonomyIdx = RISK_ORDER.indexOf(autonomyRisk);
  const domainIdx = RISK_ORDER.indexOf(domainRisk);
  return domainIdx > autonomyIdx ? domainRisk : autonomyRisk;
};

const inferRiskClassFromAutonomy = (level: AutonomyLevel): PassportRiskClass => {
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

const normalizeRiskClass = (risk: string): PassportRiskClass => {
  const lower = risk.toLowerCase();
  if (lower === 'unacceptable' || lower === 'prohibited') return 'prohibited';
  if (lower === 'high') return 'high';
  if (lower === 'limited') return 'limited';
  return 'minimal';
};

/** Step 5: Dynamic applicable articles based on risk class. */
export const getApplicableArticles = (riskClass: PassportRiskClass): readonly string[] => {
  switch (riskClass) {
    case 'prohibited':
      return ['Art.5'];
    case 'high':
      return ['Art.6', 'Art.9', 'Art.11', 'Art.12', 'Art.13', 'Art.14', 'Art.26', 'Art.27', 'Art.49', 'Art.50'];
    case 'limited':
      return ['Art.50', 'Art.52'];
    case 'minimal':
      return ['Art.50'];
  }
};

/** Step 6: Infer data residency from profile or provider. */
export const inferDataResidency = (profileStorage?: string, provider?: string): string => {
  if (profileStorage) {
    const lower = profileStorage.toLowerCase();
    if (lower === 'eu') return 'eu';
    if (lower === 'us') return 'us';
    if (lower === 'mixed') return 'global';
  }
  if (provider) {
    const lower = provider.toLowerCase();
    if (lower === 'anthropic' || lower === 'openai' || lower === 'google') return 'us';
  }
  return 'unknown';
};

/** Step 3: Compute next review date. */
export const computeNextReview = (isoDate: string, days: number): string => {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Step 7: Generate contextual description. */
const generateDescription = (
  agent: DiscoveredAgent,
  autonomy: PassportBuildInput['autonomy'],
  provider: string,
  modelId: string,
): string => {
  const agentDesc = (agent as DiscoveredAgent & { description?: string }).description;
  if (agentDesc) return agentDesc;

  const parts: string[] = [];
  parts.push(`${capitalize(provider)}-based ${autonomy.agentType} agent`);

  // Domain context would come from overrides / profile, but we include framework info
  if (agent.framework) {
    parts[0] += ` for ${agent.framework.toLowerCase()}`;
  }

  const modelPart = modelId !== 'unknown' ? `, using ${modelId} (${provider})` : '';
  const toolCount = agent.sourceFiles.length;
  const toolPart = toolCount > 0 ? `, with ${toolCount} source file${toolCount > 1 ? 's' : ''}` : '';
  const levelPart = `, at autonomy level ${autonomy.level}`;

  return `${parts[0]}${modelPart}${toolPart}${levelPart}.`;
};

/** Step 8: Build oversight block for high-risk / L3+ systems. */
export const buildOversight = (
  riskClass: PassportRiskClass,
  autonomyLevel: AutonomyLevel,
  owner: { team: string; contact: string; responsible_person: string },
  killSwitchPresent: boolean,
): OversightBlock | undefined => {
  const needsOversight =
    riskClass === 'high' || riskClass === 'prohibited' ||
    autonomyLevel === 'L3' || autonomyLevel === 'L4' || autonomyLevel === 'L5';

  if (!needsOversight) return undefined;

  return {
    responsible_person: owner.responsible_person || owner.contact || '',
    role: 'AI System Deployer Oversight',
    contact: owner.contact || '',
    override_mechanism: killSwitchPresent
      ? 'Kill switch detected in codebase'
      : 'Manual override required — no kill switch detected',
    escalation_procedure: 'Escalate to responsible person via contact information',
  };
};

/** Step 9: Compute deployer obligations met/pending from OBLIGATION_FIELD_MAP. */
export const computeDeployerObligations = (
  manifest: Record<string, unknown>,
): { met: string[]; pending: string[] } => {
  const obligationGroups = new Map<string, { required: string[]; filled: string[] }>();

  for (const mapping of OBLIGATION_FIELD_MAP) {
    if (!mapping.required) continue;
    const group = obligationGroups.get(mapping.obligation) ?? { required: [], filled: [] };
    group.required.push(mapping.field);
    if (isNonEmpty(getFieldValue(manifest as never, mapping.field))) {
      group.filled.push(mapping.field);
    }
    obligationGroups.set(mapping.obligation, group);
  }

  const met: string[] = [];
  const pending: string[] = [];
  for (const [oblId, group] of obligationGroups) {
    if (group.filled.length === group.required.length) {
      met.push(oblId);
    } else {
      pending.push(oblId);
    }
  }

  return { met: met.sort(), pending: pending.sort() };
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
  const { agent, autonomy, permissions, scanResult, overrides, projectProfile, existingPassport } = input;

  const agentId = 'ag_' + randomUUID();
  const now = new Date().toISOString();

  // --- Identity ---
  const name = agent.name;
  const displayName = toDisplayName(name);
  const provider = detectProvider(agent.detectedSdks);
  const modelId = agent.detectedModels[0] || 'unknown';

  // Step 7: Contextual description
  const description = generateDescription(agent, autonomy, provider, modelId);

  // --- Owner (placeholders) ---
  const owner = {
    team: '',
    contact: '',
    responsible_person: '',
  };

  // --- Model ---
  // Step 6: Infer data residency
  const model = {
    provider,
    model_id: modelId,
    deployment: 'api' as const,
    data_residency: inferDataResidency(projectProfile?.dataStorage, provider),
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
  // Step 4: Risk classification from project profile
  const riskClass = resolveRiskClass(autonomy.level, projectProfile?.riskLevel);
  // Step 5: Dynamic applicable articles
  const applicableArticles = getApplicableArticles(riskClass);

  const docStatus = scanResult ? deriveDocStatusFromFindings(scanResult.findings, scanResult.scannedAt) : {};
  const scanSummary = scanResult ? buildScanSummary(scanResult.findings, scanResult.scannedAt) : undefined;

  const compliance = {
    eu_ai_act: {
      risk_class: riskClass,
      applicable_articles: [...applicableArticles],
      deployer_obligations_met: [] as string[],
      deployer_obligations_pending: [] as string[],
    },
    complior_score: scanResult?.score.totalScore ?? 0,
    project_score: scanResult?.score.totalScore ?? 0,
    last_scan: scanResult?.scannedAt ?? '',
    ...docStatus,
    ...(scanSummary ? { scan_summary: scanSummary } : {}),
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
  // Step 3: Compute next review date
  const lifecycle = {
    status: 'draft' as const,
    deployed_since: existingPassport?.deployed_since ?? '',
    next_review: computeNextReview(now, 90),
    review_frequency_days: 90,
  };

  // --- Interop ---
  const interop = {
    mcp_servers: permissions.mcpServers.map((s) => ({
      name: s.name,
      tools_allowed: [...s.tools_allowed],
    })),
  };

  // --- Upstream registry cards ---
  const upstreamRegistry = agent.detectedModels
    .map((id) => findRegistryCard(id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  // --- Step 8: Oversight block ---
  const oversight = buildOversight(riskClass, autonomy.level, owner, autonomy.killSwitchPresent);

  // --- Source tracking ---
  const autoFilledFields: string[] = [];
  const manualFields: string[] = [];

  // Identity fields
  if (name) autoFilledFields.push('name');
  if (displayName) autoFilledFields.push('display_name');
  if (agent.framework) autoFilledFields.push('framework');
  if (agent.sourceFiles.length > 0) autoFilledFields.push('source_files');
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
    autoFilledFields.push('compliance.complior_score', 'compliance.last_scan', 'compliance.scan_summary');
    if (Object.keys(docStatus).length > 0) {
      autoFilledFields.push(
        'compliance.technical_documentation', 'compliance.declaration_of_conformity',
        'compliance.art5_screening', 'compliance.instructions_for_use',
      );
    }
  }

  // Interop
  if (permissions.mcpServers.length > 0) autoFilledFields.push('interop.mcp_servers');

  // Upstream registry
  if (upstreamRegistry.length > 0) autoFilledFields.push('upstream_registry');

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
    created: existingPassport?.created ?? now,
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
    ...(oversight ? { oversight } : {}),
    disclosure,
    logging,
    lifecycle,
    interop,
    ...(upstreamRegistry.length > 0 ? { upstream_registry: upstreamRegistry } : {}),
    source_files: [...agent.sourceFiles],
    source,
  };

  // --- Step 9: Compute deployer obligations met/pending ---
  const obligations = computeDeployerObligations(manifest as unknown as Record<string, unknown>);
  const finalManifest = {
    ...manifest,
    compliance: {
      ...manifest.compliance,
      eu_ai_act: {
        ...manifest.compliance.eu_ai_act,
        deployer_obligations_met: obligations.met,
        deployer_obligations_pending: obligations.pending,
      },
    },
  };

  // --- Apply overrides ---
  if (overrides) {
    const result = { ...finalManifest };
    for (const [key, value] of Object.entries(overrides)) {
      if (key in result && value !== undefined) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
    return result as Omit<AgentPassport, 'signature'>;
  }

  return finalManifest;
};
