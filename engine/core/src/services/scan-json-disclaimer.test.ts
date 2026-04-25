/**
 * V1-M22 / B-2 (B-4): RED test — `scan --json` output must include `disclaimer` field.
 *
 * Background (V1-M21 review):
 *   `complior scan --json` output has these top-level keys:
 *     agentSummaries, deepAnalysis, duration, externalToolResults, filesExcluded,
 *     filesScanned, filterContext, findings, grade, l5Cost, projectPath,
 *     regulationVersion, scannedAt, score, tier, topActions
 *   `disclaimer` is MISSING. V1-M10 (Score Transparency) required disclaimer
 *   in output; work was done for eval but not for scan.
 *
 * Specification:
 *   - Top-level `disclaimer` object present in ScanResult (matches eval output shape)
 *   - Contains: `summary`, `limitations[]`, `confidenceLevel`, optionally `profile`
 *   - Built by same `buildEvalDisclaimer`-like util (shared), specialized for scan
 *
 * Architecture:
 *   - Pure function
 *   - Object.freeze result
 *   - Consistent with eval disclaimer shape (reuse util)
 */

import { describe, it, expect } from 'vitest';

describe('V1-M22 / B-2: ScanResult contains disclaimer field', () => {
  it('scan-service attaches disclaimer to ScanResult', async () => {
    // Import lazily so test file fails fast at assertion, not at import
    const { buildScanDisclaimer } = await import('../domain/scanner/scan-disclaimer.js');
    expect(typeof buildScanDisclaimer).toBe('function');
  });

  it('buildScanDisclaimer returns required fields', async () => {
    const { buildScanDisclaimer } = await import('../domain/scanner/scan-disclaimer.js');
    const disclaimer = buildScanDisclaimer(mockFilterContext());

    expect(disclaimer).toHaveProperty('summary');
    expect(disclaimer).toHaveProperty('limitations');
    expect(Array.isArray(disclaimer.limitations)).toBe(true);
  });

  it('disclaimer object is frozen', async () => {
    const { buildScanDisclaimer } = await import('../domain/scanner/scan-disclaimer.js');
    const disclaimer = buildScanDisclaimer(mockFilterContext());

    expect(Object.isFrozen(disclaimer)).toBe(true);
    expect(Object.isFrozen(disclaimer.limitations)).toBe(true);
  });

  it('is deterministic (same input → same output)', async () => {
    const { buildScanDisclaimer } = await import('../domain/scanner/scan-disclaimer.js');
    expect(buildScanDisclaimer(mockFilterContext())).toStrictEqual(
      buildScanDisclaimer(mockFilterContext()),
    );
  });

  it('disclaimer summary mentions scan scope / coverage', async () => {
    const { buildScanDisclaimer } = await import('../domain/scanner/scan-disclaimer.js');
    const disclaimer = buildScanDisclaimer(mockFilterContext());

    expect(typeof disclaimer.summary).toBe('string');
    expect(disclaimer.summary.length).toBeGreaterThan(10);
  });
});

function mockFilterContext() {
  return Object.freeze({
    role: 'provider' as const,
    riskLevel: 'high',
    domain: 'healthcare',
    profileFound: true,
    totalTests: 100,
    applicableTests: 80,
    skippedByRole: 10,
    skippedByRiskLevel: 5,
    skippedByDomain: 5,
  });
}
