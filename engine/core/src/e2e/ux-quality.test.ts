/**
 * V1-M06 UX Quality — RED test specs.
 *
 * 8 tasks testing engine output polish:
 *   T-1: Fix preview renders templates (not [TEMPLATE:xxx] markers)
 *   T-2: Action plan returns top-5 with priority + projectedScore
 *   T-3: Obligations endpoint filters by project role + risk_class
 *   T-4: L4 findings grouped by checkId (aggregation)
 *   T-5: Report builder populates documentContents
 *   T-6: Passport discovery: fix model detection regex
 *   T-7: Passport discovery: fix endpoint URL construction
 *   T-8: Fix preview includes projectedScore (what-if)
 *
 * Uses Hono in-memory requests (no real HTTP server) + unit tests for pure functions.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { loadApplication, type Application } from '../composition-root.js';
import { buildPriorityActions } from '../domain/reporter/priority-actions.js';
import { buildComplianceReport, type ReportBuildInput } from '../domain/reporter/report-builder.js';
import { runLayer4, layer4ToCheckResults } from '../domain/scanner/layers/layer4-patterns.js';
import { discoverAgents } from '../domain/passport/discovery/agent-discovery.js';
import { simulateActions, type SimulationInput } from '../domain/whatif/simulate-actions.js';
import type { Finding } from '../types/common.types.js';
import type { DocumentInventory, ObligationCoverage, PassportStatusSection, PriorityAction } from '../domain/reporter/types.js';
import type { ObligationRecord } from '../domain/reporter/obligation-coverage.js';
import { createMockFinding, createMockPassport, createScanFile, createScanCtx, createMockScanResult } from '../test-helpers/factories.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PROJECT = process.env['COMPLIOR_TEST_PROJECT']
  ?? resolve(__dirname, '../../../../..', 'test-projects/acme-ai-support');
const canRunE2E = existsSync(resolve(TEST_PROJECT, 'package.json'));

// ═══════════════════════════════════════════════════════════════════
//  T-1: Fix preview renders templates
// ═══════════════════════════════════════════════════════════════════

describe.skipIf(!canRunE2E)('T-1: Fix preview renders templates', () => {
  let application: Application;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
    // Initial scan to populate fix data
    await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
  }, 60_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('GET /fix/preview returns rendered markdown, not [TEMPLATE:xxx] markers', async () => {
    const res = await application.app.request('/fix/preview');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const fixes = body['fixes'] as Array<Record<string, unknown>>;

    // Find template-based fixes (type === 'create' actions with content)
    const templateFixes = fixes.filter((fix) => {
      const actions = fix['actions'] as Array<Record<string, unknown>>;
      return actions?.some(
        (a) => a['type'] === 'create' && typeof a['content'] === 'string',
      );
    });

    // If there are template fixes, none should contain raw [TEMPLATE:xxx] markers
    for (const fix of templateFixes) {
      const actions = fix['actions'] as Array<Record<string, unknown>>;
      for (const action of actions) {
        if (action['type'] === 'create' && typeof action['content'] === 'string') {
          const content = action['content'] as string;
          expect(content).not.toMatch(/\[TEMPLATE:[^\]]+\]/);
          // Rendered templates should contain actual markdown headings
          if (content.length > 50) {
            expect(content).toMatch(/^#\s+/m);
          }
        }
      }
    }
  }, 30_000);

  it('fix preview template content has passport placeholders resolved', async () => {
    const res = await application.app.request('/fix/preview');
    const body = await res.json() as Record<string, unknown>;
    const fixes = body['fixes'] as Array<Record<string, unknown>>;

    const createActions = fixes.flatMap((fix) => {
      const actions = fix['actions'] as Array<Record<string, unknown>>;
      return actions?.filter((a) => a['type'] === 'create') ?? [];
    });

    // If passport exists, [PASSPORT:name] should be resolved
    for (const action of createActions) {
      const content = action['content'] as string;
      if (content && content.length > 50) {
        // After rendering, the content should not contain raw [PASSPORT:display_name]
        // when a passport is present (test project has one)
        expect(content).not.toMatch(/\[PASSPORT:display_name\]/);
      }
    }
  }, 30_000);
});

// ═══════════════════════════════════════════════════════════════════
//  T-2: Action plan top-5 with priority + projectedScore
// ═══════════════════════════════════════════════════════════════════

describe('T-2: Action plan top-5 with priority + projectedScore', () => {
  const findings: readonly Finding[] = [
    createMockFinding({ checkId: 'l1-missing-fria', type: 'fail', severity: 'high', articleReference: 'Art. 27', fix: 'Create FRIA document', priority: 8 }),
    createMockFinding({ checkId: 'l1-missing-technical-doc', type: 'fail', severity: 'high', articleReference: 'Art. 11', fix: 'Create technical documentation', priority: 8 }),
    createMockFinding({ checkId: 'l4-bare-llm', type: 'fail', severity: 'medium', articleReference: 'Art. 50', fix: 'Wrap with @complior/sdk', priority: 5 }),
    createMockFinding({ checkId: 'l4-disclosure', type: 'fail', severity: 'low', articleReference: 'Art. 50', fix: 'Add disclosure', priority: 3 }),
    createMockFinding({ checkId: 'l1-missing-monitoring', type: 'fail', severity: 'medium', articleReference: 'Art. 72', fix: 'Create monitoring policy', priority: 6 }),
    createMockFinding({ checkId: 'l4-logging', type: 'fail', severity: 'low', articleReference: 'Art. 12', fix: 'Add logging', priority: 3 }),
    createMockFinding({ checkId: 'l1-missing-ai-literacy', type: 'fail', severity: 'medium', articleReference: 'Art. 4', fix: 'Create AI literacy training doc', priority: 5 }),
  ];

  const documents: DocumentInventory = {
    total: 7,
    byStatus: { missing: 3, scaffold: 1, draft: 2, reviewed: 1 },
    score: 45,
    documents: [
      { docType: 'fria', article: 'Art. 27', description: 'FRIA', outputFile: 'docs/fria.md', status: 'missing', scoreImpact: 8, prefilledPercent: null, lastModified: null, templateFile: 'fria.md' },
      { docType: 'technical-documentation', article: 'Art. 11', description: 'Technical Documentation', outputFile: 'docs/tech-doc.md', status: 'missing', scoreImpact: 8, prefilledPercent: null, lastModified: null, templateFile: 'technical-documentation.md' },
      { docType: 'ai-literacy', article: 'Art. 4', description: 'AI Literacy', outputFile: 'docs/ai-literacy.md', status: 'scaffold', scoreImpact: 5, prefilledPercent: 30, lastModified: null, templateFile: 'ai-literacy.md' },
    ],
  };

  const obligations: ObligationCoverage = {
    total: 10, covered: 3, uncovered: 7, coveragePercent: 30,
    byArticle: [],
    critical: [
      { id: 'OBL-001', article: 'Art. 9', title: 'Risk Management', role: 'provider', severity: 'critical', deadline: '2026-08-02', covered: false, linkedChecks: [] },
    ],
  };

  const passports: PassportStatusSection = {
    totalAgents: 1,
    passports: [{ name: 'test-agent', completeness: 60, completenessZone: 'amber', filledFields: 18, totalFields: 30, missingFields: ['constraints.budget'], friaCompleted: false, signed: false, lastUpdated: null }],
    averageCompleteness: 60,
  };

  it('buildPriorityActions respects maxOverride parameter', () => {
    // T-2 spec: buildPriorityActions should accept an optional maxOverride to limit results
    const result = buildPriorityActions(findings, documents, obligations, passports, null, 5);

    expect(result.actions.length).toBeLessThanOrEqual(5);
    expect(result.shownActions).toBeLessThanOrEqual(5);
    // Total should still reflect all available actions
    expect(result.totalActions).toBeGreaterThan(5);
  });

  it('priority actions sorted by priorityScore descending', () => {
    const result = buildPriorityActions(findings, documents, obligations, passports, null, 5);

    for (let i = 1; i < result.actions.length; i++) {
      expect(result.actions[i]!.priorityScore).toBeLessThanOrEqual(result.actions[i - 1]!.priorityScore);
    }
  });

  it('each action includes effort estimate', () => {
    const result = buildPriorityActions(findings, documents, obligations, passports, null, 5);

    for (const action of result.actions) {
      // T-2 spec: each action must have an effort field
      expect(action).toHaveProperty('effort');
      const effort = (action as PriorityAction & { effort?: string }).effort;
      expect(typeof effort).toBe('string');
      expect(effort!.length).toBeGreaterThan(0);
    }
  });

  it('each action includes projectedScore via simulateActions', () => {
    const result = buildPriorityActions(findings, documents, obligations, passports, null, 5);

    for (const action of result.actions) {
      // T-2 spec: each action must have projectedScore field
      expect(action).toHaveProperty('projectedScore');
      const projected = (action as PriorityAction & { projectedScore?: number }).projectedScore;
      expect(typeof projected).toBe('number');
      expect(projected).toBeGreaterThanOrEqual(0);
      expect(projected).toBeLessThanOrEqual(100);
    }
  });
});

// --- T-2 E2E: action plan via HTTP ---

describe.skipIf(!canRunE2E)('T-2 E2E: Action plan via /report/status', () => {
  let application: Application;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
    await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
  }, 60_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('GET /report/status returns actionPlan with max 5 items', async () => {
    const res = await application.app.request('/report/status');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const actionPlan = body['actionPlan'] as Record<string, unknown>;
    expect(actionPlan).toBeDefined();

    const actions = actionPlan['actions'] as Array<Record<string, unknown>>;
    expect(Array.isArray(actions)).toBe(true);
    // T-2 spec: HTTP response limited to top-5
    expect(actions.length).toBeLessThanOrEqual(5);

    if (actions.length > 0) {
      const first = actions[0]!;
      // Each action must have rank, source, severity, priorityScore
      expect(typeof first['rank']).toBe('number');
      expect(typeof first['source']).toBe('string');
      expect(typeof first['severity']).toBe('string');
      expect(typeof first['priorityScore']).toBe('number');

      // T-2 spec: effort and projectedScore fields present
      expect(first).toHaveProperty('effort');
      expect(typeof first['effort']).toBe('string');
      expect(first).toHaveProperty('projectedScore');
      expect(typeof first['projectedScore']).toBe('number');
    }
  }, 30_000);

  it('action plan actions sorted by priorityScore descending', async () => {
    const res = await application.app.request('/report/status');
    const body = await res.json() as Record<string, unknown>;
    const actionPlan = body['actionPlan'] as Record<string, unknown>;
    const actions = actionPlan['actions'] as Array<Record<string, unknown>>;

    for (let i = 1; i < actions.length; i++) {
      const prev = actions[i - 1]!['priorityScore'] as number;
      const curr = actions[i]!['priorityScore'] as number;
      expect(curr).toBeLessThanOrEqual(prev);
    }
  }, 30_000);
});

// ═══════════════════════════════════════════════════════════════════
//  T-3: Obligations filter by project role + risk_class
// ═══════════════════════════════════════════════════════════════════

describe.skipIf(!canRunE2E)('T-3: Obligations filter by project config', () => {
  let application: Application;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
    await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
  }, 60_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('GET /obligations returns obligations filtered by project role', async () => {
    // First get full list (no filter)
    const allRes = await application.app.request('/obligations');
    expect(allRes.status).toBe(200);
    const allObls = await allRes.json() as Array<Record<string, unknown>>;

    // Get with path filter (project has a role configured)
    const filteredRes = await application.app.request(`/obligations?path=${encodeURIComponent(TEST_PROJECT)}`);
    expect(filteredRes.status).toBe(200);
    const filteredObls = await filteredRes.json() as Array<Record<string, unknown>>;

    // When project has a specific role (not 'both'), filtered should be subset
    // At minimum, no provider-only obligations for a deployer project
    const roles = new Set(filteredObls.map((o) => o['role']));
    if (roles.has('deployer') && !roles.has('provider')) {
      // Deployer-only project: no pure-provider obligations
      const providerOnly = filteredObls.filter((o) => o['role'] === 'provider');
      expect(providerOnly.length).toBe(0);
    }

    // Filtered list should be <= full list
    expect(filteredObls.length).toBeLessThanOrEqual(allObls.length);
  }, 30_000);

  it('obligations response includes role and risk_levels fields', async () => {
    const res = await application.app.request(`/obligations?path=${encodeURIComponent(TEST_PROJECT)}`);
    const obls = await res.json() as Array<Record<string, unknown>>;

    if (obls.length > 0) {
      const first = obls[0]!;
      expect(first).toHaveProperty('role');
      expect(first).toHaveProperty('risk_levels');
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('title');
    }
  }, 30_000);
});

// ═══════════════════════════════════════════════════════════════════
//  T-4: L4 findings grouped by checkId (aggregation)
// ═══════════════════════════════════════════════════════════════════

describe('T-4: L4 findings grouped by checkId', () => {
  it('groups multiple bare-llm findings into one with count and affectedFiles', () => {
    // Create scan context with 5 files each having bare OpenAI calls
    const files = [
      createScanFile('src/agents/agent1.ts', 'import OpenAI from "openai";\nconst openai = new OpenAI();\nawait openai.chat.completions.create({ model: "gpt-4" });'),
      createScanFile('src/agents/agent2.ts', 'import OpenAI from "openai";\nconst openai = new OpenAI();\nawait openai.chat.completions.create({ model: "gpt-4" });'),
      createScanFile('src/agents/agent3.ts', 'import OpenAI from "openai";\nconst openai = new OpenAI();\nawait openai.chat.completions.create({ model: "gpt-4" });'),
      createScanFile('src/agents/agent4.ts', 'import OpenAI from "openai";\nconst openai = new OpenAI();\nawait openai.chat.completions.create({ model: "gpt-4" });'),
      createScanFile('src/agents/agent5.ts', 'import OpenAI from "openai";\nconst openai = new OpenAI();\nawait openai.chat.completions.create({ model: "gpt-4" });'),
    ];

    const ctx = createScanCtx(files);
    const l3Results = [{ type: 'ai-sdk-detected' as const, packageName: 'openai', name: 'openai', version: '4.0.0', source: 'package.json' as const }];

    const l4Results = runLayer4(ctx, l3Results);
    const checkResults = layer4ToCheckResults(l4Results);

    // Find all bare-llm fail findings
    const bareLlmFindings = checkResults.filter(
      (r) => r.type === 'fail' && r.checkId === 'l4-bare-llm',
    );

    // T-4 spec: should be grouped into 1 finding (not 5 separate ones)
    expect(bareLlmFindings.length).toBe(1);

    const finding = bareLlmFindings[0]!;

    // Should have count field showing total occurrences
    expect(finding).toHaveProperty('count');
    expect((finding as typeof finding & { count: number }).count).toBe(5);

    // Should have affectedFiles array listing all 5 files
    expect(finding).toHaveProperty('affectedFiles');
    const affectedFiles = (finding as typeof finding & { affectedFiles: string[] }).affectedFiles;
    expect(affectedFiles).toHaveLength(5);
    expect(affectedFiles).toContain('src/agents/agent1.ts');
    expect(affectedFiles).toContain('src/agents/agent5.ts');

    // Message should indicate count
    expect(finding.message).toMatch(/5\s+files?/i);
  });

  it('single-file finding remains ungrouped', () => {
    const files = [
      createScanFile('src/app.ts', 'import OpenAI from "openai";\nconst openai = new OpenAI();\nawait openai.chat.completions.create({ model: "gpt-4" });'),
    ];

    const ctx = createScanCtx(files);
    const l3Results = [{ type: 'ai-sdk-detected' as const, packageName: 'openai', name: 'openai', version: '4.0.0', source: 'package.json' as const }];

    const l4Results = runLayer4(ctx, l3Results);
    const checkResults = layer4ToCheckResults(l4Results);

    const bareLlmFindings = checkResults.filter(
      (r) => r.type === 'fail' && r.checkId === 'l4-bare-llm',
    );

    // Single occurrence: no grouping needed
    expect(bareLlmFindings.length).toBe(1);
    // Should NOT have count/affectedFiles for single occurrence
    // (or count should be 1 — either is acceptable)
    const finding = bareLlmFindings[0]!;
    expect(finding.file).toBe('src/app.ts');
  });

  it('pass findings are not grouped', () => {
    const files = [
      createScanFile('src/app.ts', 'import { complior } from "@complior/sdk";\ncomplior(openai);\nconsole.log("AI disclosure: this app uses AI");'),
      createScanFile('src/utils.ts', 'function humanOversight() { return true; }'),
    ];

    const ctx = createScanCtx(files);
    const l3Results = [{ type: 'ai-sdk-detected' as const, packageName: '@complior/sdk', name: '@complior/sdk', version: '1.0.0', source: 'package.json' as const }];

    const l4Results = runLayer4(ctx, l3Results);
    const checkResults = layer4ToCheckResults(l4Results);

    const passFindings = checkResults.filter((r) => r.type === 'pass');
    // Pass findings should remain individual (not grouped)
    for (const pf of passFindings) {
      expect(pf).not.toHaveProperty('affectedFiles');
    }
  });
});

// --- T-4 E2E: grouped findings via HTTP scan ---

describe.skipIf(!canRunE2E)('T-4 E2E: Scan returns grouped L4 findings', () => {
  let application: Application;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
  }, 60_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('POST /scan groups identical L4 findings by checkId', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const findings = body['findings'] as Array<Record<string, unknown>>;

    // Find all l4-bare-llm fail findings
    const bareLlm = findings.filter(
      (f) => f['type'] === 'fail' && f['checkId'] === 'l4-bare-llm',
    );

    // T-4 spec: there should be at most 1 bare-llm finding (grouped)
    // If test project has bare LLM calls, they should be aggregated
    if (bareLlm.length > 0) {
      expect(bareLlm.length).toBe(1);

      const finding = bareLlm[0]!;
      // Grouped finding should have count showing total occurrences
      if ((finding['count'] as number) > 1) {
        expect(finding).toHaveProperty('affectedFiles');
        expect(Array.isArray(finding['affectedFiles'])).toBe(true);
        expect((finding['affectedFiles'] as string[]).length).toBe(finding['count']);
      }
    }
  }, 30_000);
});

// ═══════════════════════════════════════════════════════════════════
//  T-5: Report builder populates documentContents
// ═══════════════════════════════════════════════════════════════════

describe.skipIf(!canRunE2E)('T-5: Report builder populates documentContents', () => {
  let application: Application;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
    // Scan + fix to generate documents
    await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    await application.app.request('/fix/apply-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ useAi: false, projectPath: TEST_PROJECT }),
    });
  }, 120_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('report includes documentContents from generated compliance docs', async () => {
    const res = await application.app.request('/report/status', {
      method: 'GET',
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const documentContents = body['documentContents'] as Array<Record<string, unknown>> | undefined;

    // T-5 spec: documentContents should be populated (not empty array)
    expect(documentContents).toBeDefined();
    expect(Array.isArray(documentContents)).toBe(true);
    expect(documentContents!.length).toBeGreaterThan(0);

    // Each entry should have docType, path, content
    for (const doc of documentContents!) {
      expect(typeof doc['docType']).toBe('string');
      expect(typeof doc['path']).toBe('string');
      expect(typeof doc['content']).toBe('string');
      // Content should be a non-empty excerpt (max ~500 chars)
      expect((doc['content'] as string).length).toBeGreaterThan(0);
      expect((doc['content'] as string).length).toBeLessThanOrEqual(600);
    }
  }, 60_000);
});

describe('T-5: Report builder documentContents (unit)', () => {
  it('buildComplianceReport passes through documentContents from input', () => {
    const input: ReportBuildInput = {
      scanResult: createMockScanResult(),
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.9.5',
      documentContents: [
        { docType: 'fria', path: '.complior/docs/fria.md', content: '# Fundamental Rights Impact Assessment\n\nThis document...' },
        { docType: 'ai-literacy', path: '.complior/docs/ai-literacy.md', content: '# AI Literacy Training Plan\n\nSection 1...' },
      ],
    };

    const report = buildComplianceReport(input);

    expect(report.documentContents).toHaveLength(2);
    expect(report.documentContents[0]!.docType).toBe('fria');
    expect(report.documentContents[0]!.content).toContain('Fundamental Rights');
    expect(report.documentContents[1]!.docType).toBe('ai-literacy');
  });
});

// ═══════════════════════════════════════════════════════════════════
//  T-6: Passport discovery — fix model detection regex
// ═══════════════════════════════════════════════════════════════════

describe('T-6: Passport discovery model detection', () => {
  it('does NOT match model names in comments', () => {
    const files = [
      createScanFile('src/app.ts', [
        'import OpenAI from "openai";',
        '// Using gpt-4o for testing purposes',
        '/* We considered claude-3-opus but chose gpt-4 */',
        'const client = new OpenAI();',
        'const res = await client.chat.completions.create({ model: "gpt-4o-mini" });',
      ].join('\n')),
    ];

    const ctx = createScanCtx(files);
    const deps = [{ name: 'openai', version: '4.0.0', source: 'package.json' as const }];

    const agents = discoverAgents(ctx, deps);
    expect(agents.length).toBeGreaterThan(0);

    const models = agents[0]!.detectedModels;
    // Should detect gpt-4o-mini from the actual code, NOT from comments
    expect(models).toContain('gpt-4o-mini');
    // Should NOT detect model names from comments
    expect(models).not.toContain('gpt-4o');
    expect(models).not.toContain('claude-3-opus');
  });

  it('does NOT match env var key names as models', () => {
    const files = [
      createScanFile('src/config.ts', [
        'import OpenAI from "openai";',
        'const OPENAI_API_KEY = process.env.OPENAI_API_KEY;',
        'const OPENAI_MODEL = "gpt-4";',
        'const client = new OpenAI({ apiKey: OPENAI_API_KEY });',
        'const response = await client.chat.completions.create({ model: OPENAI_MODEL });',
      ].join('\n')),
    ];

    const ctx = createScanCtx(files);
    const deps = [{ name: 'openai', version: '4.0.0', source: 'package.json' as const }];

    const agents = discoverAgents(ctx, deps);
    expect(agents.length).toBeGreaterThan(0);

    const models = agents[0]!.detectedModels;
    // Should detect gpt-4 from the assignment
    expect(models).toContain('gpt-4');
    // Model list should NOT contain env var names or key-like strings
    for (const m of models) {
      expect(m).not.toMatch(/API_KEY/i);
      expect(m).not.toMatch(/^OPENAI_/);
    }
  });

  it('detects model in assignment context', () => {
    const files = [
      createScanFile('src/agent.ts', [
        'import Anthropic from "@anthropic-ai/sdk";',
        'const client = new Anthropic();',
        'const msg = await client.messages.create({',
        '  model: "claude-3-5-sonnet-20241022",',
        '  max_tokens: 1024,',
        '  messages: [{ role: "user", content: "Hello" }]',
        '});',
      ].join('\n')),
    ];

    const ctx = createScanCtx(files);
    const deps = [{ name: '@anthropic-ai/sdk', version: '0.32.0', source: 'package.json' as const }];

    const agents = discoverAgents(ctx, deps);
    expect(agents.length).toBeGreaterThan(0);
    expect(agents[0]!.detectedModels).toContain('claude-3-5-sonnet-20241022');
  });
});

// ═══════════════════════════════════════════════════════════════════
//  T-7: Passport discovery — fix endpoint URL construction
// ═══════════════════════════════════════════════════════════════════

describe('T-7: Passport discovery endpoint URL construction', () => {
  it('constructs valid endpoint URLs from port + routes', () => {
    const files = [
      createScanFile('.env', 'PORT=3000\nOPENAI_API_KEY=sk-test-key-123'),
      createScanFile('src/server.ts', [
        'import { Hono } from "hono";',
        'import OpenAI from "openai";',
        'const app = new Hono();',
        'const openai = new OpenAI();',
        'app.post("/api/chat", async (c) => {',
        '  const res = await openai.chat.completions.create({ model: "gpt-4" });',
        '  return c.json(res);',
        '});',
        'app.get("/api/health", (c) => c.json({ ok: true }));',
      ].join('\n')),
    ];

    const ctx = createScanCtx(files);
    const deps = [{ name: 'openai', version: '4.0.0', source: 'package.json' as const }];

    const agents = discoverAgents(ctx, deps);
    expect(agents.length).toBeGreaterThan(0);

    const endpoints = agents[0]!.detectedEndpoints;
    expect(endpoints).toBeDefined();
    expect(endpoints!.length).toBeGreaterThan(0);

    // All endpoints should be valid URLs
    for (const ep of endpoints!) {
      expect(ep).toMatch(/^https?:\/\//);
      // Should NOT contain env var key names
      expect(ep).not.toContain('OPENAI_API_KEY');
      expect(ep).not.toContain('sk-test');
      // Should be a valid URL (can be parsed)
      expect(() => new URL(ep)).not.toThrow();
    }

    // Should contain the chat endpoint
    expect(endpoints).toContain('http://localhost:3000/api/chat');
    expect(endpoints).toContain('http://localhost:3000/api/health');
  });

  it('does NOT include env var values as route paths', () => {
    const files = [
      createScanFile('.env', 'PORT=3000\nOPENAI_API_KEY=sk-test-123\nDATABASE_URL=postgres://localhost/db'),
      createScanFile('src/index.ts', [
        'import OpenAI from "openai";',
        'const openai = new OpenAI();',
        'app.post("/api/generate", async (c) => {',
        '  const res = await openai.chat.completions.create({ model: "gpt-4" });',
        '  return c.json(res);',
        '});',
      ].join('\n')),
    ];

    const ctx = createScanCtx(files);
    const deps = [{ name: 'openai', version: '4.0.0', source: 'package.json' as const }];

    const agents = discoverAgents(ctx, deps);

    if (agents[0]?.detectedEndpoints) {
      for (const ep of agents[0].detectedEndpoints) {
        // Endpoints should only contain proper URL paths, not arbitrary strings
        const url = new URL(ep);
        expect(url.pathname).toMatch(/^\//);
        expect(url.pathname).not.toMatch(/OPENAI|DATABASE|sk-/);
      }
    }
  });

  it('endpoint URLs have proper path separators', () => {
    const files = [
      createScanFile('Dockerfile', 'FROM node:20\nEXPOSE 8080'),
      createScanFile('src/routes.ts', [
        'import OpenAI from "openai";',
        'const openai = new OpenAI();',
        'router.post("/v1/completions", handler);',
        'router.get("/v1/models", listModels);',
      ].join('\n')),
    ];

    const ctx = createScanCtx(files);
    const deps = [{ name: 'openai', version: '4.0.0', source: 'package.json' as const }];

    const agents = discoverAgents(ctx, deps);
    expect(agents.length).toBeGreaterThan(0);

    const endpoints = agents[0]!.detectedEndpoints;
    if (endpoints) {
      for (const ep of endpoints) {
        // Must have / between port and path
        expect(ep).toMatch(/:\d+\//);
      }
    }
  });
});

// --- T-6/T-7 E2E: passport discovery via HTTP ---

describe.skipIf(!canRunE2E)('T-6/T-7 E2E: Passport discovery via /agent/init', () => {
  let application: Application;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
  }, 60_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('POST /agent/init discovers agents with clean model names (no comment matches)', async () => {
    const res = await application.app.request('/agent/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    // agent/init returns the created passport or discovery result
    // Check detectedModels if present in the response
    const agents = (body['agents'] ?? body['discoveredAgents'] ?? [body]) as Array<Record<string, unknown>>;

    for (const agent of agents) {
      const models = agent['detectedModels'] as string[] | undefined;
      if (models && models.length > 0) {
        for (const model of models) {
          // T-6 spec: model names should not be env var keys or garbage
          expect(model).not.toMatch(/API_KEY/i);
          expect(model).not.toMatch(/^OPENAI_/);
          // Should be a valid model name pattern
          expect(model).toMatch(/^(claude|gpt|gemini|llama|mistral|command)-/);
        }
      }
    }
  }, 30_000);

  it('POST /agent/init produces valid endpoint URLs (no garbage concatenation)', async () => {
    const res = await application.app.request('/agent/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    const body = await res.json() as Record<string, unknown>;
    const agents = (body['agents'] ?? body['discoveredAgents'] ?? [body]) as Array<Record<string, unknown>>;

    for (const agent of agents) {
      const endpoints = agent['detectedEndpoints'] as string[] | undefined;
      if (endpoints) {
        for (const ep of endpoints) {
          // T-7 spec: all endpoints must be parseable URLs
          expect(() => new URL(ep)).not.toThrow();
          const url = new URL(ep);
          // Path must start with /
          expect(url.pathname).toMatch(/^\//);
          // Must not contain env var names or secret values
          expect(ep).not.toMatch(/API_KEY|sk-|SECRET/i);
        }
      }
    }
  }, 30_000);
});

// ═══════════════════════════════════════════════════════════════════
//  T-8: Fix preview includes projectedScore
// ═══════════════════════════════════════════════════════════════════

describe.skipIf(!canRunE2E)('T-8: Fix preview includes projectedScore', () => {
  let application: Application;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
    await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
  }, 60_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('GET /fix/preview includes projectedScore per fix', async () => {
    const res = await application.app.request('/fix/preview');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const fixes = body['fixes'] as Array<Record<string, unknown>>;

    if (fixes.length > 0) {
      for (const fix of fixes) {
        // T-8 spec: each fix should include projectedScore
        expect(fix).toHaveProperty('projectedScore');
        const projected = fix['projectedScore'] as number;
        expect(typeof projected).toBe('number');
        expect(projected).toBeGreaterThanOrEqual(0);
        expect(projected).toBeLessThanOrEqual(100);

        // projectedScore should be >= current score (fixes improve things)
        const scoreImpact = fix['scoreImpact'] as number;
        if (scoreImpact > 0) {
          expect(projected).toBeGreaterThan(0);
        }
      }
    }
  }, 30_000);

  it('POST /fix/preview for specific checkId includes projectedScore', async () => {
    // Get available fixes
    const previewRes = await application.app.request('/fix/preview');
    const body = await previewRes.json() as Record<string, unknown>;
    const fixes = body['fixes'] as Array<Record<string, unknown>>;

    if (fixes.length === 0) return;

    const checkId = fixes[0]!['checkId'] as string;
    const singleRes = await application.app.request('/fix/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkId }),
    });
    expect(singleRes.status).toBe(200);

    const plan = await singleRes.json() as Record<string, unknown>;
    expect(plan).toHaveProperty('projectedScore');
    expect(typeof plan['projectedScore']).toBe('number');
  }, 30_000);
});

// ═══════════════════════════════════════════════════════════════════
//  T-8 Unit: simulateActions correctness
// ═══════════════════════════════════════════════════════════════════

describe('T-8: simulateActions projectedScore calculation', () => {
  it('projects score correctly for a single fix action', () => {
    const input: SimulationInput = {
      actions: [{ type: 'fix', target: 'l4-bare-llm' }],
      currentScore: 65,
      findings: [
        { checkId: 'l4-bare-llm', severity: 'medium', status: 'fail' },
        { checkId: 'l1-missing-fria', severity: 'high', status: 'fail' },
      ],
      passportCompleteness: 60,
    };

    const result = simulateActions(input);

    expect(result.currentScore).toBe(65);
    expect(result.projectedScore).toBeGreaterThan(65);
    expect(result.delta).toBeGreaterThan(0);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]!.scoreImpact).toBe(1.5); // medium severity = 1.5 points
  });

  it('projects score for multiple fix actions', () => {
    const input: SimulationInput = {
      actions: [
        { type: 'fix', target: 'l4-bare-llm' },
        { type: 'add-doc', target: 'fria' },
        { type: 'fix', target: 'l1-missing-fria' },
      ],
      currentScore: 50,
      findings: [
        { checkId: 'l4-bare-llm', severity: 'medium', status: 'fail' },
        { checkId: 'l1-missing-fria', severity: 'high', status: 'fail' },
      ],
      passportCompleteness: 40,
    };

    const result = simulateActions(input);

    expect(result.projectedScore).toBeGreaterThan(50);
    // medium fix (1.5) + fria doc (4.0) + high fix (3.0) = 8.5 delta
    expect(result.delta).toBeCloseTo(8.5, 1);
    expect(result.projectedScore).toBeCloseTo(58.5, 1);
  });

  it('caps projectedScore at 100', () => {
    const input: SimulationInput = {
      actions: [
        { type: 'fix', target: 'l4-bare-llm' },
        { type: 'add-doc', target: 'fria' },
      ],
      currentScore: 98,
      findings: [
        { checkId: 'l4-bare-llm', severity: 'medium', status: 'fail' },
      ],
      passportCompleteness: 100,
    };

    const result = simulateActions(input);
    expect(result.projectedScore).toBeLessThanOrEqual(100);
  });
});
