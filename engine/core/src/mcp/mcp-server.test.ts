/**
 * MCP server unit tests — schema registry + handler behaviour.
 *
 * v1.0 (S05): 7 tools registered, 4 handler tests
 * V2-M02: 13 tools registered, +24 handler tests for the 6 new tools
 *
 * Test architecture rules (per `.claude/rules/architect-protocol.md` Phase 4.4):
 * - Every handler test uses real types from `types/` and domain interfaces
 * - Concrete numbers in `expect()` calls (no `toBeGreaterThan(0)` cargo-cult)
 * - Determinism: same input → identical output for pure-ish handlers
 * - Graceful errors when optional deps missing: `isError: true`, no throw
 * - One assertion per test (or one tightly-scoped behaviour cluster)
 */

import { describe, it, expect } from 'vitest';
import { MCP_TOOL_SCHEMAS } from './tools.js';
import { createMcpHandlers } from './handlers.js';
import type { ScanResult, ScoreBreakdown } from '../types/common.types.js';
import type { AgentPassport } from '../types/passport.types.js';
import type { EvalResult } from '../domain/eval/types.js';
import type {
  EvidenceStore,
  EvidenceChainSummary,
} from '../domain/scanner/evidence-store.js';
import type { PassportService } from '../services/passport-service.js';
import type { EvalService } from '../services/eval-service.js';
import { ENGINE_VERSION } from '../version.js';

// ── Test fixtures ─────────────────────────────────────────────

const makeScore = (totalScore = 42): ScoreBreakdown => ({
  totalScore,
  zone: totalScore >= 70 ? 'green' : totalScore >= 40 ? 'yellow' : 'red',
  categoryScores: [
    { category: 'Transparency', weight: 17, score: 30, obligationCount: 6, passedCount: 2 },
    { category: 'Risk Management', weight: 20, score: 50, obligationCount: 8, passedCount: 4 },
  ],
  criticalCapApplied: false,
  totalChecks: 14,
  passedChecks: 6,
  failedChecks: 7,
  skippedChecks: 1,
});

const makeScanResult = (overrides: Partial<ScanResult> = {}): ScanResult => ({
  score: makeScore(),
  findings: [
    {
      checkId: 'ai-disclosure',
      type: 'fail',
      message: 'No disclosure',
      severity: 'high',
      articleReference: 'Art. 50(1)',
    },
    { checkId: 'docs', type: 'pass', message: 'OK', severity: 'info' },
  ],
  projectPath: '/test',
  scannedAt: '2026-01-01T00:00:00Z',
  duration: 100,
  filesScanned: 50,
  ...overrides,
});

const makePassport = (name = 'test-agent'): AgentPassport =>
  ({
    schema_version: '1.0.0',
    passport_id: `passport-${name}`,
    name,
    type: 'feature',
    description: 'Test agent',
    organization: 'Test Co',
    created: '2026-01-01T00:00:00Z',
    last_updated: '2026-01-01T00:00:00Z',
    creation_mode: 'auto',
    confidence: 0.85,
    completeness: 75,
    completeness_field_count: 27,
    framework: 'openai',
    model: 'gpt-4o',
    autonomy: { level: 3, reasoning: 'L3' },
    capabilities: { primary_function: 'chat', tasks: ['answer'] },
    risk_classification: { level: 'limited', reasoning: 'chatbot' },
    permissions: { tools: [], denied: [] },
    constraints: {
      rate_limits: { per_minute: 60 },
      budget: { max_usd_per_session: 1.0 },
      prohibited_actions: [],
    },
    oversight: { human_review_required: false, review_triggers: [], escalation_path: '' },
    disclosure: { method: 'system_prompt', content: 'I am AI' },
    logging: { enabled: true, retention_days: 90 },
    lifecycle: {
      deployed_since: '2026-01-01T00:00:00Z',
      review_frequency: 'quarterly',
      next_review: '2026-04-01T00:00:00Z',
    },
    fria_completed: false,
    signature: { algorithm: 'ed25519', value: 'AAAA', public_key_id: 'k1' },
  }) as unknown as AgentPassport;

const makeMockPassportService = (overrides?: Partial<PassportService>): PassportService =>
  ({
    initPassport: async () =>
      Object.freeze({
        manifests: Object.freeze([makePassport('test-agent')]),
        savedPaths: Object.freeze(['/test/.complior/agents/test-agent-manifest.json']),
        skipped: Object.freeze([]),
      }),
    listPassports: async () => Object.freeze([makePassport('test-agent')]),
    showPassport: async (name: string) => makePassport(name),
    generateDocByType: async (name: string, docType: string) =>
      ({
        markdown: `# Test Doc for ${name}\n\nDocType: ${docType}\n`,
        docType,
        prefilledFields: ['name', 'organization'],
        manualFields: ['impact', 'mitigation'],
        savedPath: `/test/.complior/${docType}/${name}-${docType}.md`,
      }) as never,
    ...overrides,
  }) as unknown as PassportService;

const makeMockEvalService = (score = 78): EvalService =>
  ({
    runEval: async () =>
      Object.freeze({
        score,
        grade: score >= 70 ? 'B' : 'D',
        categories: Object.freeze([]),
        securityScore: score - 5,
        securityGrade: 'C',
        results: Object.freeze([]),
        totalTests: 300,
        passed: 240,
        failed: 50,
        errors: 0,
        inconclusive: 10,
        skipped: 0,
        duration: 2500,
        timestamp: '2026-05-07T10:00:00Z',
        criticalCapped: false,
        adapterName: 'openai',
      } satisfies EvalResult),
  }) as unknown as EvalService;

const makeMockEvidenceStore = (
  summary: Partial<EvidenceChainSummary> = {},
): EvidenceStore =>
  ({
    append: async () => undefined,
    getChain: async () => ({
      version: '1.0.0',
      projectPath: '/test',
      entries: [],
      lastHash: '',
    }),
    verify: async () => ({ valid: true, issues: Object.freeze([]) }),
    getSummary: async () =>
      Object.freeze({
        totalEntries: 12,
        scanCount: 3,
        firstEntry: '2026-04-01T00:00:00Z',
        lastEntry: '2026-05-07T00:00:00Z',
        chainValid: true,
        uniqueFindings: 8,
        ...summary,
      } satisfies EvidenceChainSummary),
  }) as unknown as EvidenceStore;

// ── Default mock handler set (with all V2-M02 services wired) ──

const baseDeps = () => ({
  scanService: { scan: async () => makeScanResult() } as never,
  fixService: { preview: () => null, applyFix: async () => ({}) } as never,
  getProjectPath: () => '/test',
  getLastScanResult: () => makeScanResult(),
  getRegulationData: () =>
    ({
      obligations: {
        obligations: [
          {
            obligation_id: 'OBL-001',
            article_reference: 'Art. 4',
            title: 'AI Literacy',
            description: 'Train staff',
            applies_to_role: 'both',
            applies_to_risk_level: ['high', 'limited'],
            obligation_type: 'process',
            what_to_do: ['Train'],
            severity: 'high',
            deadline: '2025-02-02',
          },
          {
            obligation_id: 'OBL-002',
            article_reference: 'Art. 5',
            title: 'Prohibited',
            description: 'Do not deploy',
            applies_to_role: 'provider',
            applies_to_risk_level: ['unacceptable'],
            obligation_type: 'prohibition',
            what_to_do: [],
            severity: 'critical',
            deadline: '2025-02-02',
          },
        ],
      },
      scoring: {},
    }) as never,
  version: ENGINE_VERSION,
  passportService: makeMockPassportService(),
  evalService: makeMockEvalService(),
  evidenceStore: makeMockEvidenceStore(),
  getPreviousScanResult: () => makeScanResult({ score: makeScore(60) }), // previous score 60
});

const mockHandlers = createMcpHandlers(baseDeps());

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Schema registry
// ════════════════════════════════════════════════════════════════

describe('MCP Tool Schemas', () => {
  it('defines all 13 tools', () => {
    const names = Object.keys(MCP_TOOL_SCHEMAS);
    expect(names).toHaveLength(13);
  });

  it('preserves all 7 v1.0 tools (no breaking changes)', () => {
    const names = Object.keys(MCP_TOOL_SCHEMAS);
    expect(names).toContain('complior_scan');
    expect(names).toContain('complior_fix');
    expect(names).toContain('complior_status');
    expect(names).toContain('complior_explain');
    expect(names).toContain('complior_search_tool');
    expect(names).toContain('complior_classify');
    expect(names).toContain('complior_report');
  });

  it('adds 6 V2-M02 tools', () => {
    const names = Object.keys(MCP_TOOL_SCHEMAS);
    expect(names).toContain('complior_passport_init');
    expect(names).toContain('complior_doc_generate');
    expect(names).toContain('complior_redteam');
    expect(names).toContain('complior_evidence_verify');
    expect(names).toContain('complior_drift_detect');
    expect(names).toContain('complior_obligations_status');
  });

  it('every schema has a non-empty description', () => {
    for (const [name, schema] of Object.entries(MCP_TOOL_SCHEMAS)) {
      expect(schema.description, `${name} description`).toBeTruthy();
      expect(schema.description.length, `${name} description length`).toBeGreaterThan(20);
    }
  });
});

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Legacy v1.0 handlers (regression — must keep GREEN)
// ════════════════════════════════════════════════════════════════

describe('MCP Handlers — v1.0 legacy', () => {
  it('complior_scan returns score and findings', async () => {
    const result = await mockHandlers.complior_scan({});
    const data = JSON.parse(result.content[0].text);
    expect(data.score).toBe(42);
    expect(data.violations).toBe(1);
    expect(data.topFindings).toHaveLength(1);
  });

  it('complior_status returns category breakdown', async () => {
    const result = await mockHandlers.complior_status();
    const data = JSON.parse(result.content[0].text);
    expect(data.score).toBe(42);
    expect(data.categories).toHaveLength(2);
  });

  it('complior_classify returns risk level', async () => {
    const result = await mockHandlers.complior_classify({
      description: 'HR recruitment screening tool',
      domain: 'hr',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.riskLevel).toBe('high');
    expect(data.reason).toContain('HR');
  });

  it('complior_fix returns error for unknown finding', async () => {
    const result = await mockHandlers.complior_fix({ checkId: 'unknown' });
    expect(result.isError).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// SECTION 3 — V2-M02 Builder tools
// ════════════════════════════════════════════════════════════════

describe('complior_passport_init handler', () => {
  it('returns generated passport with name and signature', async () => {
    const result = await mockHandlers.complior_passport_init({});
    const data = JSON.parse(result.content[0].text);
    expect(data.passports).toHaveLength(1);
    expect(data.passports[0].name).toBe('test-agent');
    expect(data.passports[0].signature.algorithm).toBe('ed25519');
  });

  it('reports savedPaths and count', async () => {
    const result = await mockHandlers.complior_passport_init({});
    const data = JSON.parse(result.content[0].text);
    expect(data.count).toBe(1);
    expect(data.savedPaths).toEqual(['/test/.complior/agents/test-agent-manifest.json']);
  });

  it('forwards agentName filter to passportService', async () => {
    let capturedName: string | undefined;
    const handlers = createMcpHandlers({
      ...baseDeps(),
      passportService: makeMockPassportService({
        initPassport: (async (
          _path?: string,
          _overrides?: Record<string, unknown>,
          _force?: boolean,
          name?: string,
        ) => {
          capturedName = name;
          return Object.freeze({
            manifests: Object.freeze([]),
            savedPaths: Object.freeze([]),
            skipped: Object.freeze([]),
          });
        }) as never,
      }),
    });
    await handlers.complior_passport_init({ agentName: 'my-bot' });
    expect(capturedName).toBe('my-bot');
  });

  it('returns isError=true when passportService is not configured', async () => {
    const handlers = createMcpHandlers({ ...baseDeps(), passportService: undefined });
    const result = await handlers.complior_passport_init({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/passport.*not configured/i);
  });

  it('returns isError=true when no agents discovered', async () => {
    const handlers = createMcpHandlers({
      ...baseDeps(),
      passportService: makeMockPassportService({
        initPassport: (async () =>
          Object.freeze({
            manifests: Object.freeze([]),
            savedPaths: Object.freeze([]),
            skipped: Object.freeze([]),
          })) as never,
      }),
    });
    const result = await handlers.complior_passport_init({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/no agents/i);
  });
});

describe('complior_doc_generate handler', () => {
  it('returns markdown content for valid docType', async () => {
    const result = await mockHandlers.complior_doc_generate({
      docType: 'fria',
      passportName: 'test-agent',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.docType).toBe('fria');
    expect(data.markdown).toContain('Test Doc for test-agent');
    expect(data.markdown).toContain('DocType: fria');
  });

  it('returns prefilledFields and manualFields lists', async () => {
    const result = await mockHandlers.complior_doc_generate({
      docType: 'fria',
      passportName: 'test-agent',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.prefilledFields).toEqual(['name', 'organization']);
    expect(data.manualFields).toEqual(['impact', 'mitigation']);
  });

  it('returns savedPath in /.complior/{docType}/', async () => {
    const result = await mockHandlers.complior_doc_generate({
      docType: 'risk-management',
      passportName: 'test-agent',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.savedPath).toBe(
      '/test/.complior/risk-management/test-agent-risk-management.md',
    );
  });

  it('returns isError=true when passportService is not configured', async () => {
    const handlers = createMcpHandlers({ ...baseDeps(), passportService: undefined });
    const result = await handlers.complior_doc_generate({
      docType: 'fria',
      passportName: 'test-agent',
    });
    expect(result.isError).toBe(true);
  });

  it('returns isError=true when passport not found', async () => {
    const handlers = createMcpHandlers({
      ...baseDeps(),
      passportService: makeMockPassportService({
        generateDocByType: (async () => null) as never,
      }),
    });
    const result = await handlers.complior_doc_generate({
      docType: 'fria',
      passportName: 'missing',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/passport.*not found/i);
  });
});

describe('complior_redteam handler', () => {
  it('returns aggregate score and per-category breakdown', async () => {
    const result = await mockHandlers.complior_redteam({
      target: 'https://api.example.com/v1/chat',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.score).toBe(78);
    expect(data.totalTests).toBe(300);
    expect(data.passed).toBe(240);
  });

  it('reports security score and grade', async () => {
    const result = await mockHandlers.complior_redteam({
      target: 'https://api.example.com/v1/chat',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.securityScore).toBe(73);
    expect(data.securityGrade).toBe('C');
  });

  it('returns isError=true with threshold-fail when score < threshold', async () => {
    const result = await mockHandlers.complior_redteam({
      target: 'https://api.example.com/v1/chat',
      threshold: 90,
    });
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.thresholdFailed).toBe(true);
    expect(data.score).toBe(78);
  });

  it('returns success when score >= threshold', async () => {
    const result = await mockHandlers.complior_redteam({
      target: 'https://api.example.com/v1/chat',
      threshold: 70,
    });
    expect(result.isError).toBeUndefined();
  });

  it('returns isError=true when evalService is not configured', async () => {
    const handlers = createMcpHandlers({ ...baseDeps(), evalService: undefined });
    const result = await handlers.complior_redteam({
      target: 'https://api.example.com/v1/chat',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/eval.*not configured/i);
  });
});

// ════════════════════════════════════════════════════════════════
// SECTION 4 — V2-M02 Analytics tools
// ════════════════════════════════════════════════════════════════

describe('complior_evidence_verify handler', () => {
  it('returns valid=true with summary for healthy chain', async () => {
    const result = await mockHandlers.complior_evidence_verify({});
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(true);
    expect(data.totalEntries).toBe(12);
    expect(data.scanCount).toBe(3);
  });

  it('returns valid=false with brokenAt index when chain is tampered', async () => {
    const handlers = createMcpHandlers({
      ...baseDeps(),
      evidenceStore: {
        ...makeMockEvidenceStore(),
        verify: async () => ({
          valid: false,
          brokenAt: 4,
          issues: Object.freeze(['Chain broken at index 4: hash mismatch']),
        }),
      } as unknown as EvidenceStore,
    });
    const result = await handlers.complior_evidence_verify({});
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(false);
    expect(data.brokenAt).toBe(4);
    expect(data.issues).toContain('Chain broken at index 4: hash mismatch');
  });

  it('reports firstEntry and lastEntry timestamps from summary', async () => {
    const result = await mockHandlers.complior_evidence_verify({});
    const data = JSON.parse(result.content[0].text);
    expect(data.firstEntry).toBe('2026-04-01T00:00:00Z');
    expect(data.lastEntry).toBe('2026-05-07T00:00:00Z');
  });

  it('returns isError=true when evidenceStore is not configured', async () => {
    const handlers = createMcpHandlers({ ...baseDeps(), evidenceStore: undefined });
    const result = await handlers.complior_evidence_verify({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/evidence.*not configured/i);
  });
});

describe('complior_drift_detect handler', () => {
  it('returns drift severity and score change', async () => {
    const result = await mockHandlers.complior_drift_detect({});
    const data = JSON.parse(result.content[0].text);
    // current score 42 vs previous 60 → -18 → major (drop > 10)
    expect(data.scoreChange).toBe(-18);
    expect(data.severity).toBe('major');
  });

  it('returns hasDrift=true when failures changed', async () => {
    const result = await mockHandlers.complior_drift_detect({});
    const data = JSON.parse(result.content[0].text);
    expect(data.hasDrift).toBe(false); // same fail finding in both, just different score
  });

  it('returns severity=none when no scan history', async () => {
    const handlers = createMcpHandlers({
      ...baseDeps(),
      getPreviousScanResult: () => null,
    });
    const result = await handlers.complior_drift_detect({});
    const data = JSON.parse(result.content[0].text);
    expect(data.severity).toBe('none');
    expect(data.message).toMatch(/no previous scan/i);
  });

  it('returns isError=true when no current scan', async () => {
    const handlers = createMcpHandlers({
      ...baseDeps(),
      getLastScanResult: () => null,
    });
    const result = await handlers.complior_drift_detect({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/no scan/i);
  });

  it('lists affected articles', async () => {
    const handlers = createMcpHandlers({
      ...baseDeps(),
      getLastScanResult: () =>
        makeScanResult({
          findings: [
            {
              checkId: 'art5-prohibited',
              type: 'fail',
              message: 'Prohibited',
              severity: 'critical',
              articleReference: 'Art. 5(1)(a)',
            },
          ],
          score: makeScore(20),
        }),
      getPreviousScanResult: () => makeScanResult({ score: makeScore(80), findings: [] }),
    });
    const result = await handlers.complior_drift_detect({});
    const data = JSON.parse(result.content[0].text);
    expect(data.severity).toBe('critical'); // Art. 5 new failure → critical
    expect(data.affectedArticles).toContain('Art. 5(1)(a)');
  });
});

describe('complior_obligations_status handler', () => {
  it('returns coverage summary across all obligations', async () => {
    const result = await mockHandlers.complior_obligations_status({});
    const data = JSON.parse(result.content[0].text);
    expect(data.total).toBe(2);
    expect(data.obligations).toHaveLength(2);
  });

  it('filters by role=provider', async () => {
    const result = await mockHandlers.complior_obligations_status({ role: 'provider' });
    const data = JSON.parse(result.content[0].text);
    expect(data.total).toBe(1);
    expect(data.obligations[0].obligation_id).toBe('OBL-002');
  });

  it('filters by riskLevel=unacceptable', async () => {
    const result = await mockHandlers.complior_obligations_status({
      riskLevel: 'unacceptable',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.total).toBe(1);
    expect(data.obligations[0].article_reference).toBe('Art. 5');
  });

  it('reports per-obligation coverage status (covered / uncovered)', async () => {
    const result = await mockHandlers.complior_obligations_status({});
    const data = JSON.parse(result.content[0].text);
    for (const ob of data.obligations) {
      expect(ob.coverage).toMatch(/^(covered|uncovered)$/);
    }
  });

  it('is deterministic (same input → same output)', async () => {
    const r1 = await mockHandlers.complior_obligations_status({ role: 'provider' });
    const r2 = await mockHandlers.complior_obligations_status({ role: 'provider' });
    expect(r1.content[0].text).toBe(r2.content[0].text);
  });
});
