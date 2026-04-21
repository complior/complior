import { describe, it, expect, vi } from 'vitest';
import { createScanService } from './scan-service.js';
import type { ScanServiceDeps } from './scan-service.js';
import type { ScanContext, FileInfo } from '../ports/scanner.port.js';
import type { ScanResult, Finding, ScoreBreakdown } from '../types/common.types.js';
import type { Scanner } from '../domain/scanner/create-scanner.js';
import type { EventBusPort } from '../ports/events.port.js';

// --- Helpers ---

const makeFile = (relativePath: string, content: string): FileInfo => ({
  path: `/project/${relativePath}`,
  content,
  extension: relativePath.slice(relativePath.lastIndexOf('.')),
  relativePath,
});

const makeScore = (total: number): ScoreBreakdown => ({
  totalScore: total,
  zone: total >= 80 ? 'green' : total >= 50 ? 'yellow' : 'red',
  categoryScores: [],
  criticalCapApplied: false,
  totalChecks: 1,
  passedChecks: total === 100 ? 1 : 0,
  failedChecks: total === 100 ? 0 : 1,
  skippedChecks: 0,
});

const makeScanResult = (opts: { score?: number; duration?: number; findings?: readonly Finding[] }): ScanResult => ({
  score: makeScore(opts.score ?? 50),
  findings: opts.findings ?? [],
  projectPath: '/project',
  scannedAt: new Date().toISOString(),
  duration: opts.duration ?? 100,
  filesScanned: 1,
});

const createMockEvents = (): EventBusPort => ({
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
});

const createMockDeps = (overrides?: Partial<ScanServiceDeps>): ScanServiceDeps & {
  scanCallCount: () => number;
  events: EventBusPort;
} => {
  let scanCalls = 0;
  let lastResult: ScanResult | null = null;

  const files: FileInfo[] = [
    makeFile('src/app.ts', 'const x = 1;'),
    makeFile('package.json', '{"name":"test"}'),
  ];

  const ctx: ScanContext = { files, projectPath: '/project' };
  const result = makeScanResult({ score: 50, duration: 100 });

  const scanner: Scanner = {
    scan: (_ctx: ScanContext): ScanResult => {
      scanCalls++;
      return result;
    },
  };

  const events = createMockEvents();

  return {
    scanner: overrides?.scanner ?? scanner,
    collectFiles: overrides?.collectFiles ?? (async () => ctx),
    events: overrides?.events ?? events,
    getLastScanResult: overrides?.getLastScanResult ?? (() => lastResult),
    setLastScanResult: overrides?.setLastScanResult ?? ((r: ScanResult) => { lastResult = r; }),
    passportService: overrides?.passportService,
    scanCallCount: () => scanCalls,
  };
};

// --- Tests ---

describe('ScanService E-11 project-level cache', () => {
  it('calls scanner on first scan', async () => {
    const deps = createMockDeps();
    const service = createScanService(deps);

    const result = await service.scan('/project');

    expect(result.score.totalScore).toBe(50);
    expect(deps.scanCallCount()).toBe(1);
  });

  it('returns cached result on second scan with same files (scanner NOT called)', async () => {
    const deps = createMockDeps();
    const service = createScanService(deps);

    const result1 = await service.scan('/project');
    const result2 = await service.scan('/project');

    // Scanner should only be called ONCE — second call should hit cache
    expect(deps.scanCallCount()).toBe(1);

    // Cached result should have the same duration as original
    expect(result2.duration).toBe(result1.duration);
    expect(result2.duration).toBe(100); // from our mock

    // Score should be identical
    expect(result2.score.totalScore).toBe(result1.score.totalScore);

    // scannedAt should be a valid ISO timestamp (fresh on cache hit)
    expect(result2.scannedAt).toBeDefined();
  });

  it('invalidates cache when file content changes', async () => {
    let callCount = 0;
    const files1: FileInfo[] = [makeFile('src/app.ts', 'const x = 1;')];
    const files2: FileInfo[] = [makeFile('src/app.ts', 'const x = 2;')]; // changed

    const result1 = makeScanResult({ score: 50, duration: 100 });
    const result2 = makeScanResult({ score: 60, duration: 100 });

    const scanner: Scanner = {
      scan: () => {
        callCount++;
        return callCount === 1 ? result1 : result2;
      },
    };

    let currentFiles = files1;
    const deps = createMockDeps({
      scanner,
      collectFiles: async () => ({ files: currentFiles, projectPath: '/project' }),
    });
    const service = createScanService(deps);

    // Scan 1: fresh
    await service.scan('/project');
    expect(callCount).toBe(1);

    // Scan 2: same files → cache hit
    await service.scan('/project');
    expect(callCount).toBe(1); // NOT called again

    // Change file content
    currentFiles = files2;

    // Scan 3: different content → cache miss → scanner called
    const r3 = await service.scan('/project');
    expect(callCount).toBe(2);
    expect(r3.score.totalScore).toBe(60);
  });

  it('invalidates cache when a new file is added', async () => {
    let callCount = 0;
    const files1: FileInfo[] = [makeFile('src/app.ts', 'const x = 1;')];
    const files2: FileInfo[] = [
      makeFile('src/app.ts', 'const x = 1;'),
      makeFile('src/new.ts', 'export const y = 2;'), // new file
    ];

    const scanner: Scanner = {
      scan: () => { callCount++; return makeScanResult({ score: 50 }); },
    };

    let currentFiles = files1;
    const deps = createMockDeps({
      scanner,
      collectFiles: async () => ({ files: currentFiles, projectPath: '/project' }),
    });
    const service = createScanService(deps);

    await service.scan('/project');
    expect(callCount).toBe(1);

    await service.scan('/project');
    expect(callCount).toBe(1); // cached

    currentFiles = files2; // add new file

    await service.scan('/project');
    expect(callCount).toBe(2); // cache invalidated
  });

  it('invalidates cache when a file is removed', async () => {
    let callCount = 0;
    const files1: FileInfo[] = [
      makeFile('src/app.ts', 'const x = 1;'),
      makeFile('src/old.ts', 'export const z = 3;'),
    ];
    const files2: FileInfo[] = [makeFile('src/app.ts', 'const x = 1;')]; // old.ts removed

    const scanner: Scanner = {
      scan: () => { callCount++; return makeScanResult({ score: 50 }); },
    };

    let currentFiles = files1;
    const deps = createMockDeps({
      scanner,
      collectFiles: async () => ({ files: currentFiles, projectPath: '/project' }),
    });
    const service = createScanService(deps);

    await service.scan('/project');
    await service.scan('/project');
    expect(callCount).toBe(1); // cached

    currentFiles = files2;

    await service.scan('/project');
    expect(callCount).toBe(2); // cache invalidated
  });

  it('emits scan.completed event on cache hit', async () => {
    const events = createMockEvents();
    const deps = createMockDeps({ events });
    const service = createScanService(deps);

    await service.scan('/project');
    await service.scan('/project'); // cache hit

    // scan.completed should be emitted on both calls
    const emitCalls = (events.emit as ReturnType<typeof vi.fn>).mock.calls;
    const completedEvents = emitCalls.filter(([event]) => event === 'scan.completed');
    expect(completedEvents).toHaveLength(2);
  });

  it('does NOT call setLastScanResult on cache hit', async () => {
    const setLast = vi.fn();
    const deps = createMockDeps({ setLastScanResult: setLast });
    const service = createScanService(deps);

    await service.scan('/project');
    expect(setLast).toHaveBeenCalledTimes(1);

    await service.scan('/project'); // cache hit
    expect(setLast).toHaveBeenCalledTimes(1); // NOT called again
  });
});

describe('ScanService agent attribution via import graph', () => {
  it('enriches findings with agentId from passportService + import graph', async () => {
    // Two agents: chat-agent and embed-agent, each with own files
    // chat-agent imports a helper transitively
    const files: FileInfo[] = [
      makeFile('agents/chat/index.ts', `import { OpenAI } from 'openai';\nimport { fmt } from './format.js';`),
      makeFile('agents/chat/format.ts', `export const fmt = (s: string) => s;`),
      makeFile('agents/embed/main.ts', `import { embed } from '@ai-sdk/openai';`),
      makeFile('package.json', `{"name":"test"}`),
    ];

    const ctx: ScanContext = { files, projectPath: '/project' };

    const findings: Finding[] = [
      { checkId: 'sdk-no-disclosure', type: 'fail', message: 'No disclosure', severity: 'high', file: 'agents/chat/index.ts' },
      { checkId: 'missing-handler', type: 'fail', message: 'No handler', severity: 'medium', file: 'agents/chat/format.ts' },
      { checkId: 'sdk-no-disclosure', type: 'fail', message: 'No disclosure', severity: 'high', file: 'agents/embed/main.ts' },
      { checkId: 'banned-pkg', type: 'fail', message: 'Banned', severity: 'critical', file: 'package.json' },
      { checkId: 'missing-fria', type: 'fail', message: 'No FRIA', severity: 'high' }, // no file (L1)
    ];

    const scanner: Scanner = {
      scan: () => makeScanResult({ score: 40, findings }),
    };

    const passportService = {
      listPassports: async () => [
        { name: 'chat-agent', source_files: ['agents/chat/index.ts'] as readonly string[] },
        { name: 'embed-agent', source_files: ['agents/embed/main.ts'] as readonly string[] },
      ],
    };

    const deps = createMockDeps({
      scanner,
      collectFiles: async () => ctx,
      passportService,
    });
    const service = createScanService(deps);

    const result = await service.scan('/project');

    // Chat agent: index.ts (direct) + format.ts (transitive via import graph)
    expect(result.findings[0].agentId).toBe('chat-agent');
    expect(result.findings[1].agentId).toBe('chat-agent');

    // Embed agent: main.ts (direct)
    expect(result.findings[2].agentId).toBe('embed-agent');

    // Root-level package.json → project-level (no agentId)
    expect(result.findings[3].agentId).toBeUndefined();

    // L1 finding without file → project-level
    expect(result.findings[4].agentId).toBeUndefined();

    // Agent summaries should exist for both agents
    expect(result.agentSummaries).toHaveLength(2);
    const chatSummary = result.agentSummaries!.find(s => s.agentId === 'chat-agent');
    const embedSummary = result.agentSummaries!.find(s => s.agentId === 'embed-agent');
    expect(chatSummary!.findingCount).toBe(2); // 2 fail findings
    expect(chatSummary!.highCount).toBe(1);
    expect(embedSummary!.findingCount).toBe(1);
    expect(embedSummary!.highCount).toBe(1);
  });

  it('multi-agent scan produces per-agent doc-presence findings', async () => {
    const files: FileInfo[] = [
      makeFile('agents/chat/index.ts', `import { OpenAI } from 'openai';`),
      makeFile('agents/embed/main.ts', `import { embed } from '@ai-sdk/openai';`),
      makeFile('package.json', `{"name":"test"}`),
    ];

    const ctx: ScanContext = { files, projectPath: '/project' };

    const findings: Finding[] = [
      // Per-agent doc checks (L1, no file) — should be expanded
      { checkId: 'fria', type: 'fail', message: 'No FRIA found', severity: 'high' },
      { checkId: 'risk-management', type: 'fail', message: 'No risk management', severity: 'high' },
      // Project-level doc check — should NOT expand
      { checkId: 'qms', type: 'fail', message: 'No QMS', severity: 'medium' },
      // Pass finding — should NOT expand
      { checkId: 'technical-documentation', type: 'pass', message: 'Tech docs found', severity: 'low' },
      // Code finding — not a doc check, stays as-is
      { checkId: 'sdk-no-disclosure', type: 'fail', message: 'No disclosure', severity: 'high', file: 'agents/chat/index.ts' },
    ];

    const scanner: Scanner = {
      scan: () => makeScanResult({ score: 30, findings }),
    };

    const passportService = {
      listPassports: async () => [
        { name: 'chat-agent', source_files: ['agents/chat/index.ts'] as readonly string[] },
        { name: 'embed-agent', source_files: ['agents/embed/main.ts'] as readonly string[] },
      ],
    };

    const deps = createMockDeps({
      scanner,
      collectFiles: async () => ctx,
      passportService,
    });
    const service = createScanService(deps);

    const result = await service.scan('/project');

    // fria fail → 2, risk-management fail → 2, qms → 1, tech-doc pass → 2 (per-agent), sdk-no-disclosure → 1
    expect(result.findings).toHaveLength(8);

    // Per-agent FRIA findings
    const friaFindings = result.findings.filter(f => f.checkId === 'fria');
    expect(friaFindings).toHaveLength(2);
    expect(friaFindings.map(f => f.agentId).sort()).toEqual(['chat-agent', 'embed-agent']);

    // Per-agent risk-management findings
    const rmFindings = result.findings.filter(f => f.checkId === 'risk-management');
    expect(rmFindings).toHaveLength(2);
    expect(rmFindings.map(f => f.agentId).sort()).toEqual(['chat-agent', 'embed-agent']);

    // QMS stays project-level (1 finding, no agentId)
    const qmsFindings = result.findings.filter(f => f.checkId === 'qms');
    expect(qmsFindings).toHaveLength(1);
    expect(qmsFindings[0].agentId).toBeUndefined();

    // Tech-doc pass expanded per-agent (each agent gets credit)
    const techDocFindings = result.findings.filter(f => f.checkId === 'technical-documentation');
    expect(techDocFindings).toHaveLength(2);
    expect(techDocFindings.map(f => f.agentId).sort()).toEqual(['chat-agent', 'embed-agent']);

    // Agent summaries should count per-agent doc failures
    expect(result.agentSummaries).toHaveLength(2);
    const chatSummary = result.agentSummaries!.find(s => s.agentId === 'chat-agent');
    // chat-agent: fria fail + risk-management fail + sdk-no-disclosure = 3 fails
    expect(chatSummary!.findingCount).toBe(3);
  });

  it('single agent — all findings attributed via import graph', async () => {
    const findings: Finding[] = [
      { checkId: 'test', type: 'fail', message: 'Test', severity: 'medium', file: 'src/app.ts' },
    ];

    const scanner: Scanner = {
      scan: () => makeScanResult({ score: 50, findings }),
    };

    const passportService = {
      listPassports: async () => [
        { name: 'sole-agent', source_files: ['src/app.ts'] as readonly string[] },
      ],
    };

    const deps = createMockDeps({
      scanner,
      passportService,
    });
    const service = createScanService(deps);

    const result = await service.scan('/project');

    // Single agent → all findings attributed
    expect(result.findings[0].agentId).toBe('sole-agent');
    expect(result.agentSummaries).toHaveLength(1);
  });
});

describe('ScanService role-based finding filtering', () => {
  it('deployer role skips provider-only checks (qms, gpai-transparency)', async () => {
    const findings: Finding[] = [
      { checkId: 'qms', type: 'fail', message: 'No QMS', severity: 'medium' },
      { checkId: 'gpai-transparency', type: 'fail', message: 'No GPAI transparency', severity: 'high' },
      { checkId: 'fria', type: 'fail', message: 'No FRIA', severity: 'high' },
      { checkId: 'l1-risk', type: 'fail', message: 'No risk doc', severity: 'high' },
      { checkId: 'technical-documentation', type: 'pass', message: 'Tech docs found', severity: 'low' },
    ];

    const scanner: Scanner = {
      scan: () => makeScanResult({ score: 40, findings }),
    };

    const deps = createMockDeps({
      scanner,
    });
    // Inject deployer role via deps (Clean Architecture — no filesystem I/O in tests)
    (deps as Record<string, unknown>).getProjectRole = async () => 'deployer';
    const service = createScanService(deps);

    const result = await service.scan('/project');

    // Provider-only checks → skip (role filter applied via legacy fallback)
    const qms = result.findings.find(f => f.checkId === 'qms')!;
    expect(qms.type).toBe('skip');
    expect(qms.message).toBe('Skipped: provider-only check (project role: deployer)');

    const gpai = result.findings.find(f => f.checkId === 'gpai-transparency')!;
    expect(gpai.type).toBe('skip');

    // Deployer and both checks → unchanged
    const fria = result.findings.find(f => f.checkId === 'fria')!;
    expect(fria.type).toBe('fail');

    const risk = result.findings.find(f => f.checkId === 'l1-risk')!;
    expect(risk.type).toBe('fail');

    const techDoc = result.findings.find(f => f.checkId === 'technical-documentation')!;
    expect(techDoc.type).toBe('pass');

    // Legacy role fallback (no profileFound): score NOT recalculated, stays at original
    // score = 40 (from mock, not recalculated without real profile)
    expect(result.score.totalScore).toBe(40);
    expect(result.score.skippedChecks).toBe(0); // from original mock score
    expect(result.filterContext).toBeDefined();
    expect(result.filterContext!.profileFound).toBe(false);
    expect(result.filterContext!.role).toBe('deployer');
  });

  it('no getProjectRole defaults to both (no filtering)', async () => {
    const findings: Finding[] = [
      { checkId: 'qms', type: 'fail', message: 'No QMS', severity: 'medium' },
      { checkId: 'fria', type: 'fail', message: 'No FRIA', severity: 'high' },
    ];

    const scanner: Scanner = {
      scan: () => makeScanResult({ score: 0, findings }),
    };

    // No getProjectRole in deps → defaults to 'both' (no filtering)
    const deps = createMockDeps({ scanner });
    const service = createScanService(deps);

    const result = await service.scan('/project');

    // No filtering — both findings should remain as fail
    expect(result.findings.find(f => f.checkId === 'qms')!.type).toBe('fail');
    expect(result.findings.find(f => f.checkId === 'fria')!.type).toBe('fail');
  });
});

/**
 * V1-M18 T-4: Scan with domain profile — domain-specific checks become skip.
 *
 * Integration test: getProjectProfile returns healthcare domain profile →
 * domain filter runs as Step 3 after role + risk-level filters →
 * HR-only checks become skip, filterContext.skippedByDomain > 0.
 *
 * RED until domain-filter.ts is created + wired into scan-service Step 3.
 */
describe('V1-M18: ScanService domain-based finding filtering', () => {
  it('healthcare domain profile: HR-only checks become skip, skippedByDomain > 0', async () => {
    const findings: Finding[] = [
      { checkId: 'industry-hr-bias', type: 'fail', message: 'HR bias check not addressed', severity: 'medium' },
      { checkId: 'industry-hr-notification', type: 'fail', message: 'HR notification missing', severity: 'medium' },
      { checkId: 'ai-disclosure', type: 'fail', message: 'No AI disclosure', severity: 'high' },
      { checkId: 'industry-healthcare-clinical', type: 'fail', message: 'Clinical validation missing', severity: 'high' },
      { checkId: 'l4-bare-llm', type: 'fail', message: 'Bare LLM call detected', severity: 'medium' },
    ];

    const scanner: Scanner = {
      scan: () => makeScanResult({ score: 45, findings }),
    };

    const deps = createMockDeps({ scanner });
    // Inject healthcare domain profile
    (deps as Record<string, unknown>).getProjectProfile = async () => ({
      role: 'deployer' as const,
      riskLevel: 'high' as const,
      domain: 'healthcare',
      applicableObligations: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004', 'OBL-005'],
    });
    const service = createScanService(deps);

    const result = await service.scan('/project');

    // HR-only checks → skip (not applicable for healthcare domain)
    const hrBias = result.findings.find(f => f.checkId === 'industry-hr-bias')!;
    expect(hrBias.type).toBe('skip');

    const hrNotif = result.findings.find(f => f.checkId === 'industry-hr-notification')!;
    expect(hrNotif.type).toBe('skip');

    // Healthcare-domain check → unchanged (same domain)
    const clinical = result.findings.find(f => f.checkId === 'industry-healthcare-clinical')!;
    expect(clinical.type).toBe('fail');

    // Universal checks (no domain restriction) → unchanged
    const disclosure = result.findings.find(f => f.checkId === 'ai-disclosure')!;
    expect(disclosure.type).toBe('fail');

    const bareLlm = result.findings.find(f => f.checkId === 'l4-bare-llm')!;
    expect(bareLlm.type).toBe('fail');

    // filterContext should report domain skips
    expect(result.filterContext).toBeDefined();
    expect(result.filterContext!.profileFound).toBe(true);
    expect(result.filterContext!.domain).toBe('healthcare');
    expect(result.filterContext!.skippedByDomain).toBe(2);
  });
});
