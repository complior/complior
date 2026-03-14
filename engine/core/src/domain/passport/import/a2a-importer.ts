import { A2ACardSchema, PROVIDER_URLS, type A2ACard } from '../export/a2a-mapper.js';
import type { AgentPassport, AgentType, AutonomyLevel, PassportRiskClass } from '../../../types/passport.types.js';
import { ValidationError } from '../../../types/errors.js';

export interface A2AImportResult {
  readonly passport: AgentPassport;
  readonly fieldsImported: readonly string[];
  readonly fieldsMissing: readonly string[];
}

// Derive reverse map from shared PROVIDER_URLS (single source of truth)
const PROVIDER_URL_TO_NAME: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(Object.entries(PROVIDER_URLS).map(([k, v]) => [v, k]))
);

const resolveProviderName = (url: string): string =>
  PROVIDER_URL_TO_NAME[url] ?? '';

const parseTagValue = (tags: readonly string[], prefix: string): string =>
  tags.find(t => t.startsWith(`${prefix}:`))?.slice(prefix.length + 1) ?? '';

const VALID_AGENT_TYPES = new Set<AgentType>(['autonomous', 'assistive', 'hybrid']);
const VALID_AUTONOMY_LEVELS = new Set<AutonomyLevel>(['L1', 'L2', 'L3', 'L4', 'L5']);
const VALID_RISK_CLASSES = new Set<PassportRiskClass>(['prohibited', 'high', 'limited', 'minimal']);

const toAgentType = (val: string): AgentType =>
  VALID_AGENT_TYPES.has(val as AgentType) ? val as AgentType : 'assistive';

const toAutonomyLevel = (val: string): AutonomyLevel =>
  VALID_AUTONOMY_LEVELS.has(val as AutonomyLevel) ? val as AutonomyLevel : 'L2';

const toRiskClass = (val: string): PassportRiskClass =>
  VALID_RISK_CLASSES.has(val as PassportRiskClass) ? val as PassportRiskClass : 'minimal';

export const importFromA2A = (data: unknown): A2AImportResult => {
  const parsed = A2ACardSchema.safeParse(data);
  if (!parsed.success) {
    throw new ValidationError(`Invalid A2A Card: ${parsed.error.message}`);
  }
  const card: A2ACard = parsed.data;

  const fieldsImported: string[] = [];
  const allFields = [
    '$schema', 'manifest_version', 'agent_id', 'name', 'display_name',
    'description', 'version', 'created', 'updated', 'owner', 'type',
    'autonomy_level', 'autonomy_evidence', 'framework', 'model',
    'permissions', 'constraints', 'compliance', 'disclosure', 'logging',
    'lifecycle', 'interop', 'source', 'signature',
  ];

  // Map A2A fields -> passport fields
  const now = new Date().toISOString();

  if (card.humanReadableId) fieldsImported.push('name');
  if (card.name) fieldsImported.push('display_name');
  if (card.description) fieldsImported.push('description');
  if (card.agentVersion) fieldsImported.push('version');
  if (card.provider?.name) fieldsImported.push('model');
  if (card.skills.length > 0) fieldsImported.push('permissions');
  if (card.url) fieldsImported.push('model.deployment');

  // Parse tags for risk_class, autonomy_level, type
  const riskClass = parseTagValue(card.tags, 'risk');
  const autonomyLevel = parseTagValue(card.tags, 'autonomy');
  const agentType = parseTagValue(card.tags, 'type');
  const dataResidency = parseTagValue(card.tags, 'region');

  if (riskClass) fieldsImported.push('compliance.risk_class');
  if (autonomyLevel) fieldsImported.push('autonomy_level');
  if (agentType) fieldsImported.push('type');

  const fieldsMissing = allFields.filter(f => !fieldsImported.some(fi => fi === f || fi.startsWith(f)));

  const passport: AgentPassport = {
    $schema: 'https://complior.dev/schemas/agent-passport-v1.json',
    manifest_version: '1.0.0',
    agent_id: `imported-${card.humanReadableId}-${Date.now()}`,
    name: card.humanReadableId,
    display_name: card.name,
    description: card.description,
    version: card.agentVersion,
    created: now,
    updated: now,
    owner: { team: '', contact: '', responsible_person: '' },
    type: agentType ? toAgentType(agentType) : 'assistive',
    autonomy_level: autonomyLevel ? toAutonomyLevel(autonomyLevel) : 'L2',
    autonomy_evidence: {
      human_approval_gates: 0,
      unsupervised_actions: 0,
      no_logging_actions: 0,
      auto_rated: false,
    },
    framework: '',
    model: {
      provider: card.provider?.name ? resolveProviderName(card.provider.url) || card.provider.name : '',
      model_id: '',
      deployment: card.url || '',
      data_residency: dataResidency,
    },
    permissions: {
      tools: card.skills.map(s => s.name),
      data_access: { read: [], write: [], delete: [] },
      denied: [],
    },
    constraints: {
      rate_limits: { max_actions_per_minute: 60 },
      budget: { max_cost_per_session_usd: 10 },
      human_approval_required: [],
      prohibited_actions: [],
    },
    compliance: {
      eu_ai_act: {
        risk_class: riskClass ? toRiskClass(riskClass) : 'minimal',
        applicable_articles: [],
        deployer_obligations_met: [],
        deployer_obligations_pending: [],
      },
      complior_score: 0,
      last_scan: '',
    },
    disclosure: {
      user_facing: false,
      disclosure_text: '',
      ai_marking: { responses_marked: false, method: '' },
    },
    logging: {
      actions_logged: false,
      retention_days: 180,
      includes_decision_rationale: false,
    },
    lifecycle: {
      status: 'draft',
      deployed_since: '',
      next_review: '',
      review_frequency_days: 90,
    },
    interop: { mcp_servers: [] },
    source: {
      mode: 'semi-auto',
      generated_by: 'complior-a2a-import',
      code_analyzed: false,
      fields_auto_filled: fieldsImported.slice(),
      fields_manual: [],
      confidence: 0.5,
    },
    signature: {
      algorithm: '',
      public_key: '',
      signed_at: '',
      hash: '',
      value: '',
    },
  };

  return { passport, fieldsImported, fieldsMissing };
};
