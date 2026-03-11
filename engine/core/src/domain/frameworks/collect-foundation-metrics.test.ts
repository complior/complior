import { describe, it, expect } from 'vitest';
import { collectFoundationMetrics } from './collect-foundation-metrics.js';
import type { FoundationMetricsDeps } from './collect-foundation-metrics.js';
import type { ScanResult } from '../../types/common.types.js';

const mockScan: ScanResult = {
  score: {
    totalScore: 70,
    zone: 'yellow',
    categoryScores: [],
    criticalCapApplied: false,
    totalChecks: 20,
    passedChecks: 14,
    failedChecks: 6,
    skippedChecks: 0,
  },
  findings: [],
  projectPath: '/test',
  scannedAt: new Date().toISOString(),
  duration: 100,
  filesScanned: 10,
};

const defaultDeps: FoundationMetricsDeps = {
  getLastScanResult: () => mockScan,
  getPassport: async () => null,
  getPassportCompleteness: async () => 42,
  getEvidenceSummary: async () => ({
    totalEntries: 5,
    scanCount: 3,
    firstEntry: '2026-01-01',
    lastEntry: '2026-03-01',
    chainValid: true,
    uniqueFindings: 10,
  }),
  getDocuments: async () => new Set(['fria']),
};

describe('collectFoundationMetrics', () => {
  it('collects all fields', async () => {
    const result = await collectFoundationMetrics(defaultDeps);
    expect(result.scanResult).toBe(mockScan);
    expect(result.passport).toBeNull();
    expect(result.passportCompleteness).toBe(42);
    expect(result.evidenceChainValid).toBe(true);
    expect(result.evidenceEntryCount).toBe(5);
    expect(result.evidenceScanCount).toBe(3);
    expect(result.documents.has('fria')).toBe(true);
  });

  it('handles null scan result', async () => {
    const deps = { ...defaultDeps, getLastScanResult: () => null };
    const result = await collectFoundationMetrics(deps);
    expect(result.scanResult).toBeNull();
  });

  it('runs deps in parallel', async () => {
    let callOrder: string[] = [];
    const deps: FoundationMetricsDeps = {
      getLastScanResult: () => { callOrder.push('scan'); return mockScan; },
      getPassport: async () => { callOrder.push('passport'); return null; },
      getPassportCompleteness: async () => { callOrder.push('completeness'); return 50; },
      getEvidenceSummary: async () => {
        callOrder.push('evidence');
        return { totalEntries: 0, scanCount: 0, firstEntry: '', lastEntry: '', chainValid: false, uniqueFindings: 0 };
      },
      getDocuments: async () => { callOrder.push('documents'); return new Set<string>(); },
    };
    await collectFoundationMetrics(deps);
    expect(callOrder).toContain('passport');
    expect(callOrder).toContain('evidence');
  });

  it('propagates evidence summary fields correctly', async () => {
    const deps = {
      ...defaultDeps,
      getEvidenceSummary: async () => ({
        totalEntries: 0,
        scanCount: 0,
        firstEntry: '',
        lastEntry: '',
        chainValid: false,
        uniqueFindings: 0,
      }),
    };
    const result = await collectFoundationMetrics(deps);
    expect(result.evidenceChainValid).toBe(false);
    expect(result.evidenceEntryCount).toBe(0);
    expect(result.evidenceScanCount).toBe(0);
  });

  it('returns frozen object', async () => {
    const result = await collectFoundationMetrics(defaultDeps);
    expect(Object.isFrozen(result)).toBe(true);
  });
});
