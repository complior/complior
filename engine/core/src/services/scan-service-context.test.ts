/**
 * V1-M08 T-3: Scan Service Filter Context — RED test spec.
 *
 * Tests that scan-service populates filterContext on ScanResult
 * after applying both role AND risk-level filters.
 *
 * This test MUST fail (RED) until nodejs-dev integrates
 * risk-level filtering + context assembly in scan-service.ts.
 */
import { describe, it, expect } from 'vitest';
import { createScanService } from './scan-service.js';
import type { ScanResult, Finding, ScanFilterContext, Role } from '../types/common.types.js';
import type { ScanContext } from '../ports/scanner.port.js';
import { createEventBus } from '../infra/event-bus.js';

/** Minimal scan context with no files. */
const EMPTY_CTX: ScanContext = {
  files: [],
  projectPath: '/test-project',
  packageJson: null,
};

/** Stub scanner that returns deterministic findings. */
const createStubScanner = (findings: readonly Finding[]) => ({
  scan: (_ctx: ScanContext): ScanResult => ({
    score: {
      totalScore: 50,
      zone: 'yellow' as const,
      categoryScores: [],
      criticalCapApplied: false,
      totalChecks: findings.length,
      passedChecks: findings.filter(f => f.type === 'pass').length,
      failedChecks: findings.filter(f => f.type === 'fail').length,
      skippedChecks: 0,
    },
    findings,
    projectPath: '/test-project',
    scannedAt: new Date().toISOString(),
    duration: 100,
    filesScanned: 0,
  }),
});

const stubFindings: Finding[] = [
  // Provider-only check
  { checkId: 'qms', type: 'fail', message: 'Missing QMS', severity: 'high' },
  // Deployer-only check
  { checkId: 'fria', type: 'fail', message: 'Missing FRIA', severity: 'high' },
  // High-risk-only check
  { checkId: 'l4-conformity-assessment', type: 'fail', message: 'No conformity assessment', severity: 'high' },
  // Universal check
  { checkId: 'ai-disclosure', type: 'fail', message: 'No AI disclosure', severity: 'medium' },
  // Another universal
  { checkId: 'l3-no-logging', type: 'fail', message: 'No logging', severity: 'medium' },
];

describe('scan-service filterContext integration', () => {
  it('scan result includes filterContext when profile is available', async () => {
    const events = createEventBus();
    let lastResult: ScanResult | null = null;

    const scanService = createScanService({
      scanner: createStubScanner(stubFindings),
      collectFiles: async () => EMPTY_CTX,
      events,
      getLastScanResult: () => null,
      setLastScanResult: (r) => { lastResult = r; },
      getProjectProfile: async () => ({
        role: 'deployer' as Role,
        riskLevel: 'limited',
        domain: 'healthcare',
        applicableObligations: ['OBL-001', 'OBL-002'],
      }),
    });

    const result = await scanService.scan('/test-project');

    // filterContext MUST be present
    expect(result.filterContext).toBeDefined();
    const ctx: ScanFilterContext = result.filterContext!;
    expect(ctx.profileFound).toBe(true);
    expect(ctx.role).toBe('deployer');
    expect(ctx.riskLevel).toBe('limited');
    expect(ctx.domain).toBe('healthcare');
  });

  it('filterContext shows correct skip counts', async () => {
    const events = createEventBus();

    const scanService = createScanService({
      scanner: createStubScanner(stubFindings),
      collectFiles: async () => EMPTY_CTX,
      events,
      getLastScanResult: () => null,
      setLastScanResult: () => {},
      getProjectProfile: async () => ({
        role: 'deployer' as Role,
        riskLevel: 'limited',
        domain: 'healthcare',
        applicableObligations: [],
      }),
    });

    const result = await scanService.scan('/test-project');
    const ctx = result.filterContext!;

    // Provider-only checks skipped by role
    expect(ctx.skippedByRole).toBeGreaterThan(0);
    // High-risk-only checks skipped by risk level
    expect(ctx.skippedByRiskLevel).toBeGreaterThan(0);
    // Total obligations vs applicable
    expect(ctx.totalObligations).toBeGreaterThan(ctx.applicableObligations);
  });

  it('filterContext.profileFound is false when no profile exists', async () => {
    const events = createEventBus();

    const scanService = createScanService({
      scanner: createStubScanner(stubFindings),
      collectFiles: async () => EMPTY_CTX,
      events,
      getLastScanResult: () => null,
      setLastScanResult: () => {},
      // No getProjectProfile → defaults to no profile
    });

    const result = await scanService.scan('/test-project');

    // Without profile, filterContext should indicate no profile found
    expect(result.filterContext).toBeDefined();
    expect(result.filterContext!.profileFound).toBe(false);
    expect(result.filterContext!.role).toBe('both');
    expect(result.filterContext!.riskLevel).toBeNull();
    expect(result.filterContext!.skippedByRole).toBe(0);
    expect(result.filterContext!.skippedByRiskLevel).toBe(0);
  });

  it('recalculates score based on applicable findings only', async () => {
    const events = createEventBus();

    const scanService = createScanService({
      scanner: createStubScanner(stubFindings),
      collectFiles: async () => EMPTY_CTX,
      events,
      getLastScanResult: () => null,
      setLastScanResult: () => {},
      getProjectProfile: async () => ({
        role: 'deployer' as Role,
        riskLevel: 'limited',
        domain: null,
        applicableObligations: [],
      }),
    });

    const result = await scanService.scan('/test-project');

    // Score should reflect fewer applicable findings (some skipped)
    // With filters: provider-only + high-risk-only findings become skip
    // So score should be higher than raw (fewer failures counted)
    const skipCount = result.findings.filter(f => f.type === 'skip').length;
    expect(skipCount).toBeGreaterThan(0);
    expect(result.score.skippedChecks).toBe(skipCount);
  });
});
