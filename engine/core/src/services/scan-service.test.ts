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
