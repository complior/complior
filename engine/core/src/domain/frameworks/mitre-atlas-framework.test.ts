import { describe, it, expect } from 'vitest';
import { createMitreAtlasFramework, scoreMitreAtlas } from './mitre-atlas-framework.js';
import type { FoundationMetrics } from '../../types/framework.types.js';

const emptyMetrics: FoundationMetrics = {
  scanResult: null,
  passport: null,
  passportCompleteness: 0,
  evidenceChainValid: false,
  evidenceEntryCount: 0,
  evidenceScanCount: 0,
  documents: new Set(),
};

describe('MITRE ATLAS Framework', () => {
  it('creates framework with correct id and 6 categories', () => {
    const fw = createMitreAtlasFramework();
    expect(fw.id).toBe('mitre-atlas');
    expect(fw.name).toBe('MITRE ATLAS');
    expect(fw.categories).toHaveLength(6);
    expect(fw.gradeMapping.type).toBe('letter');
  });

  it('returns grade F with score 0 when no scan result', () => {
    const fw = createMitreAtlasFramework();
    const result = scoreMitreAtlas(fw, emptyMetrics);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
    expect(result.frameworkId).toBe('mitre-atlas');
  });

  it('returns score 0 when scan has no relevant findings (untested)', () => {
    const fw = createMitreAtlasFramework();
    const scan = {
      score: { totalScore: 80 },
      findings: [],
      projectPath: '/test',
      scannedAt: new Date().toISOString(),
      duration: 100,
      filesScanned: 5,
    } as any;

    const result = scoreMitreAtlas(fw, { ...emptyMetrics, scanResult: scan });
    // No relevant findings → 0 (untested = not secure)
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
  });

  it('has correct grade thresholds', () => {
    const fw = createMitreAtlasFramework();
    expect(fw.gradeMapping.thresholds).toHaveLength(5);
  });
});
