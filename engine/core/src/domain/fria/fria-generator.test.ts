import { describe, it, expect } from 'vitest';
import { generateFria, generateFriaStructured } from './fria-generator.js';
import type { AgentManifest } from '../../types/passport.types.js';

const TEMPLATE = `# Template 3: Fundamental Rights Impact Assessment (FRIA)

### 1. Assessment Header

| Field | Value |
|-------|-------|
| Document Title | Fundamental Rights Impact Assessment — [AI System Name] |
| Assessment ID | FRIA-[YYYY]-[NNN] |
| Date | [Date] |
| Assessor | [Name, Title] |
| DPO Consulted | [Name, Date] |

### 2. AI System Description

- System name: [Name]
- Provider: [Name]
- Version: [Number]
- Intended purpose: [Description]
- Deployment context: [Where and how the system is used]

### 3. Deployer Information

- Organisation: [Name]

### 4. Fundamental Rights Risk Assessment

| Fundamental Right | Risk Level | Description |
|---|---|---|
| Non-discrimination | [H/M/L/N] | [Description] |
| Privacy | [H/M/L/N] | [Description] |

### 5. Human Oversight Measures
- Override mechanism: [Description of how human can intervene/stop the system]
`;

const createManifest = (overrides?: Partial<AgentManifest>): AgentManifest => ({
  $schema: 'https://complior.dev/schemas/agent-manifest-v1.json',
  manifest_version: '1.0.0',
  agent_id: 'agent-test-001',
  name: 'test-agent',
  display_name: 'Test Agent',
  description: 'An AI agent for testing compliance',
  version: '1.0.0',
  created: '2026-01-01T00:00:00Z',
  updated: '2026-01-01T00:00:00Z',
  owner: { team: 'Acme Corp', contact: 'admin@acme.com', responsible_person: 'Jane Doe' },
  type: 'assistive',
  autonomy_level: 'L2',
  autonomy_evidence: { human_approval_gates: 3, unsupervised_actions: 1, no_logging_actions: 0, auto_rated: true },
  framework: 'openai-sdk',
  model: { provider: 'OpenAI', model_id: 'gpt-4', deployment: 'cloud', data_residency: 'EU' },
  permissions: { tools: ['search', 'read'], data_access: { read: ['docs'], write: [], delete: [] }, denied: [] },
  constraints: {
    rate_limits: { max_actions_per_minute: 60 },
    budget: { max_cost_per_session_usd: 10 },
    human_approval_required: ['deploy', 'delete'],
    prohibited_actions: [],
  },
  compliance: {
    eu_ai_act: {
      risk_class: 'high',
      applicable_articles: ['Art. 9', 'Art. 27'],
      deployer_obligations_met: ['OBL-013'],
      deployer_obligations_pending: ['OBL-014'],
    },
    complior_score: 72,
    last_scan: '2026-01-01T00:00:00Z',
  },
  disclosure: { user_facing: true, disclosure_text: 'AI-powered', ai_marking: { responses_marked: true, method: 'header' } },
  logging: { actions_logged: true, retention_days: 90, includes_decision_rationale: true },
  lifecycle: { status: 'active', deployed_since: '2026-01-01', next_review: '2026-06-01', review_frequency_days: 90 },
  interop: { mcp_servers: [] },
  source: { mode: 'auto', generated_by: 'complior', code_analyzed: true, fields_auto_filled: ['name'], fields_manual: [], confidence: 0.85 },
  signature: { algorithm: 'ed25519', public_key: 'test', signed_at: '2026-01-01T00:00:00Z', hash: 'sha256:test', value: 'test' },
  ...overrides,
} as AgentManifest);

describe('generateFria', () => {
  it('replaces AI System Name from manifest', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    expect(result.markdown).toContain('Fundamental Rights Impact Assessment — Test Agent');
    expect(result.prefilledFields).toContain('AI System Name');
  });

  it('replaces Provider from manifest.model.provider', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    expect(result.markdown).toContain('Provider: OpenAI');
    expect(result.prefilledFields).toContain('Provider');
  });

  it('replaces Version from manifest.version', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    expect(result.markdown).toContain('Version: 1.0.0');
    expect(result.prefilledFields).toContain('Version');
  });

  it('replaces Intended purpose from manifest.description', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    expect(result.markdown).toContain('Intended purpose: An AI agent for testing compliance');
    expect(result.prefilledFields).toContain('Intended purpose');
  });

  it('generates FRIA ID with current year', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    const year = new Date().getFullYear();
    expect(result.markdown).toMatch(new RegExp(`FRIA-${year}-\\d{3}`));
    expect(result.prefilledFields).toContain('Assessment ID');
  });

  it('fills date with current date', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    const today = new Date().toISOString().split('T')[0]!;
    expect(result.markdown).toContain(today);
  });

  it('uses organization param over manifest.owner.team', () => {
    const result = generateFria({
      manifest: createManifest(),
      template: TEMPLATE,
      organization: 'Custom Org',
    });
    expect(result.markdown).toContain('Organisation: Custom Org');
  });

  it('falls back to owner.team when no organization param', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    expect(result.markdown).toContain('Organisation: Acme Corp');
  });

  it('fills assessor when provided', () => {
    const result = generateFria({
      manifest: createManifest(),
      template: TEMPLATE,
      assessor: 'Jane Doe, CTO',
    });
    expect(result.markdown).toContain('Jane Doe, CTO');
    expect(result.prefilledFields).toContain('Assessor');
  });

  it('lists assessor as manual field when not provided', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    expect(result.manualFields).toContain('Assessor (Name, Title)');
  });

  it('pre-fills risk level from high-risk passport', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    // First row should get H (high risk)
    expect(result.markdown).toContain('| H |');
  });

  it('generates human oversight description from autonomy level', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    expect(result.markdown).toContain('direct human supervision');
    expect(result.prefilledFields).toContain('Human oversight mechanism');
  });

  it('includes human_approval_required in oversight', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    expect(result.markdown).toContain('deploy, delete');
  });

  it('lists manual fields that cannot be auto-filled', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    expect(result.manualFields).toContain('DPO Consulted (Name, Date)');
    expect(result.manualFields).toContain('Deployment context');
    expect(result.manualFields).toContain('Overall risk assessment decision');
    expect(result.manualFields).toContain('Assessor sign-off');
    expect(result.manualFields.length).toBeGreaterThan(10);
  });

  it('returns frozen result', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.prefilledFields)).toBe(true);
    expect(Object.isFrozen(result.manualFields)).toBe(true);
  });

  it('pre-fills impact when provided', () => {
    const result = generateFria({
      manifest: createManifest(),
      template: TEMPLATE + '\n[e.g., AI may produce biased outcomes against certain ethnic groups in credit decisions]',
      impact: 'Credit scoring bias against minorities',
    });
    expect(result.markdown).toContain('Credit scoring bias against minorities');
    expect(result.prefilledFields).toContain('Impact description');
    expect(result.manualFields).not.toContain('Fundamental Rights risk descriptions');
  });

  it('pre-fills mitigation when provided', () => {
    const result = generateFria({
      manifest: createManifest(),
      template: TEMPLATE + '\n[e.g., Regular bias audits, human review of rejections, fairness metrics monitoring]',
      mitigation: 'Quarterly bias audits and model retraining',
    });
    expect(result.markdown).toContain('Quarterly bias audits and model retraining');
    expect(result.prefilledFields).toContain('Mitigation measures');
    expect(result.manualFields).not.toContain('Mitigation measures');
  });

  it('pre-fills approval when provided', () => {
    const result = generateFria({
      manifest: createManifest(),
      template: TEMPLATE + '\nDecision-maker: _________________ Date: _________',
      approval: 'Jane Doe, CTO',
    });
    expect(result.markdown).toContain('Decision-maker: Jane Doe, CTO');
    expect(result.prefilledFields).toContain('Decision-maker sign-off');
    expect(result.manualFields).not.toContain('Decision-maker sign-off');
  });

  it('leaves manual fields when flags not provided', () => {
    const result = generateFria({
      manifest: createManifest(),
      template: TEMPLATE + '\n[e.g., AI may produce biased outcomes against certain ethnic groups in credit decisions]\n[e.g., Regular bias audits, human review of rejections, fairness metrics monitoring]\nDecision-maker: _________________ Date: _________',
    });
    expect(result.manualFields).toContain('Fundamental Rights risk descriptions');
    expect(result.manualFields).toContain('Mitigation measures');
    expect(result.manualFields).toContain('Decision-maker sign-off');
  });

  it('includes structured payload in result', () => {
    const result = generateFria({ manifest: createManifest(), template: TEMPLATE });
    expect(result.structured).toBeDefined();
    expect(result.structured.toolSlug).toBe('agent-test-001');
    expect(result.structured.sections.general_info.toolName).toBe('Test Agent');
  });
});

describe('generateFriaStructured', () => {
  it('maps general_info from manifest', () => {
    const s = generateFriaStructured({ manifest: createManifest(), template: '' });
    expect(s.toolSlug).toBe('agent-test-001');
    expect(s.sections.general_info.toolName).toBe('Test Agent');
    expect(s.sections.general_info.vendor).toBe('Acme Corp');
    expect(s.sections.general_info.purpose).toBe('An AI agent for testing compliance');
    expect(s.sections.general_info.riskLevel).toBe('high');
    expect(s.sections.general_info.version).toBe('1.0.0');
    expect(s.sections.general_info.provider).toBe('OpenAI');
  });

  it('uses organization option over manifest.owner.team', () => {
    const s = generateFriaStructured({ manifest: createManifest(), template: '', organization: 'Custom Org' });
    expect(s.sections.general_info.organisation).toBe('Custom Org');
  });

  it('falls back to owner.team for organisation', () => {
    const s = generateFriaStructured({ manifest: createManifest(), template: '' });
    expect(s.sections.general_info.organisation).toBe('Acme Corp');
  });

  it('fills assessorName when assessor provided', () => {
    const s = generateFriaStructured({ manifest: createManifest(), template: '', assessor: 'Jane Doe' });
    expect(s.sections.general_info.assessorName).toBe('Jane Doe');
  });

  it('generates 8 Charter rights in specific_risks', () => {
    const s = generateFriaStructured({ manifest: createManifest(), template: '' });
    expect(s.sections.specific_risks.risks).toHaveLength(8);
    expect(s.sections.specific_risks.risks[0]!.right).toBe('Non-discrimination');
    expect(s.sections.specific_risks.risks[0]!.article).toBe('Art. 21');
  });

  it('pre-fills first risk severity from high-risk passport', () => {
    const s = generateFriaStructured({ manifest: createManifest(), template: '' });
    expect(s.sections.specific_risks.risks[0]!.severity).toBe('H');
    expect(s.sections.specific_risks.risks[1]!.severity).toBe('');
  });

  it('sets severity L for minimal risk', () => {
    const manifest = createManifest({
      compliance: { ...createManifest().compliance, eu_ai_act: { ...createManifest().compliance.eu_ai_act, risk_class: 'minimal' } },
    } as Partial<AgentManifest>);
    const s = generateFriaStructured({ manifest, template: '' });
    expect(s.sections.specific_risks.risks[0]!.severity).toBe('L');
  });

  it('derives human_oversight from autonomy level L2', () => {
    const s = generateFriaStructured({ manifest: createManifest(), template: '' });
    expect(s.sections.human_oversight.hasHumanOversight).toBe(true);
    expect(s.sections.human_oversight.oversightType).toBe('pre_decision');
    expect(s.sections.human_oversight.mechanism).toContain('3 human approval gate(s)');
  });

  it('derives human_oversight from autonomy level L4', () => {
    const manifest = createManifest({ autonomy_level: 'L4' } as Partial<AgentManifest>);
    const s = generateFriaStructured({ manifest, template: '' });
    expect(s.sections.human_oversight.hasHumanOversight).toBe(false);
    expect(s.sections.human_oversight.oversightType).toBe('post_hoc');
  });

  it('leaves manual fields as empty strings/arrays', () => {
    const s = generateFriaStructured({ manifest: createManifest(), template: '' });
    expect(s.sections.general_info.deploymentContext).toBe('');
    expect(s.sections.general_info.geographicScope).toBe('');
    expect(s.sections.affected_persons.categories).toEqual([]);
    expect(s.sections.affected_persons.description).toBe('');
    expect(s.sections.mitigation_measures.measures).toEqual([]);
    expect(s.sections.monitoring_plan.metrics).toEqual([]);
    expect(s.sections.monitoring_plan.frequency).toBe('');
  });

  it('generates valid assessmentId and date', () => {
    const s = generateFriaStructured({ manifest: createManifest(), template: '' });
    const year = new Date().getFullYear();
    expect(s.assessmentId).toMatch(new RegExp(`^FRIA-${year}-\\d{3}$`));
    expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
