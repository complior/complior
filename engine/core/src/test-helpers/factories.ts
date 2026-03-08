import type {
  Finding,
  CheckResult,
  ScanResult,
  CompliorConfig,
  ProjectProfile,
} from '../types/common.types.js';
import type { AgentPassport } from '../types/passport.types.js';
import type { FileInfo, ScanContext } from '../ports/scanner.port.js';

export const createMockFinding = (overrides?: Partial<Finding>): Finding => ({
  checkId: 'CHECK-001',
  type: 'fail',
  message: 'Test finding',
  severity: 'medium',
  ...overrides,
});

export const createMockCheckResult = (overrides?: Partial<Extract<CheckResult, { readonly type: 'fail' }>>): CheckResult => ({
  type: 'fail',
  checkId: 'CHECK-001',
  message: 'Test check result',
  severity: 'medium',
  ...overrides,
});

export const createMockScanResult = (overrides?: Partial<ScanResult>): ScanResult => ({
  score: {
    totalScore: 75,
    zone: 'yellow',
    categoryScores: [],
    criticalCapApplied: false,
    totalChecks: 10,
    passedChecks: 7,
    failedChecks: 2,
    skippedChecks: 1,
  },
  findings: [],
  projectPath: '/test/project',
  scannedAt: new Date().toISOString(),
  duration: 150,
  filesScanned: 10,
  ...overrides,
});

export const createMockConfig = (overrides?: Partial<CompliorConfig>): CompliorConfig => ({
  projectPath: '/test/project',
  extends: ['complior:eu-ai-act'],
  exclude: ['node_modules', '.git', 'dist', 'build'],
  severity: 'low',
  outputFormat: 'json',
  ...overrides,
});

export const createMockProjectProfile = (overrides?: Partial<ProjectProfile>): ProjectProfile => ({
  frameworks: [{ name: 'Next.js', version: '^14.0.0', confidence: 1.0 }],
  aiTools: [{ name: 'OpenAI', version: '^4.0.0', type: 'sdk' }],
  languages: ['TypeScript', 'JavaScript'],
  hasPackageJson: true,
  detectedModels: ['gpt-4'],
  ...overrides,
});

export const createMockPassport = (overrides?: Partial<AgentPassport>): AgentPassport => ({
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
} as AgentPassport);

export const createScanFile = (relativePath: string, content: string): FileInfo => ({
  path: `/test/project/${relativePath}`,
  content,
  extension: `.${relativePath.split('.').pop()}`,
  relativePath,
});

export const createScanCtx = (files: readonly FileInfo[]): ScanContext => ({
  files,
  projectPath: '/test/project',
});
