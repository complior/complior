/**
 * V1-M23 / W-1: RED runtime test — scan service must include `disclaimer` in result.
 *
 * Background:
 *   V1-M22 unit test `scan-json-disclaimer.test.ts` verified `buildScanDisclaimer()`
 *   function exists and returns valid object. But V1-M21 re-run on eval-target
 *   discovered `complior scan --json` does NOT include `disclaimer` in output:
 *
 *     $ complior scan --json | jq 'keys'
 *     [..., "filterContext", ...]   ← no "disclaimer"
 *
 *   Function is built but NEVER WIRED into scan-service output.
 *
 * Specification:
 *   - `scanService.scan(projectPath)` returns ScanResult with `disclaimer` field
 *   - `disclaimer` matches eval pattern (summary, limitations, etc.)
 *   - Even when no profile is set, disclaimer present (with appropriate content)
 *
 * Architecture:
 *   - Object.freeze on result (existing pattern)
 *   - Reuse `buildScanDisclaimer` (V1-M22 created it)
 *   - Mirror eval-service.ts pattern (which DOES attach disclaimer)
 */

import { describe, it, expect } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m23-disclaimer-${process.pid}`);

describe('V1-M23 / W-1: scan service attaches disclaimer to ScanResult', () => {
  it('scan result has top-level `disclaimer` field', async () => {
    setupTestProject();
    const { scanService } = await buildScanServiceForTest();

    const result = await scanService.scan(TEST_PROJECT);

    expect(result).toHaveProperty('disclaimer');
    expect(result.disclaimer).not.toBeNull();
    expect(result.disclaimer).not.toBeUndefined();
  });

  it('disclaimer has summary string', async () => {
    setupTestProject();
    const { scanService } = await buildScanServiceForTest();
    const result = await scanService.scan(TEST_PROJECT);

    expect(typeof result.disclaimer?.summary).toBe('string');
    expect((result.disclaimer?.summary ?? '').length).toBeGreaterThan(10);
  });

  it('disclaimer has limitations array', async () => {
    setupTestProject();
    const { scanService } = await buildScanServiceForTest();
    const result = await scanService.scan(TEST_PROJECT);

    expect(Array.isArray(result.disclaimer?.limitations)).toBe(true);
  });

  it('disclaimer object is frozen', async () => {
    setupTestProject();
    const { scanService } = await buildScanServiceForTest();
    const result = await scanService.scan(TEST_PROJECT);

    if (result.disclaimer) {
      expect(Object.isFrozen(result.disclaimer)).toBe(true);
    }
  });

  it('disclaimer present even when no profile/onboarding completed', async () => {
    setupTestProject(); // no project.toml
    const { scanService } = await buildScanServiceForTest();
    const result = await scanService.scan(TEST_PROJECT);

    expect(result.disclaimer).toBeTruthy();
  });
});

// ── Helpers ────────────────────────────────────────────────────────

function setupTestProject(): void {
  rmSync(TEST_PROJECT, { recursive: true, force: true });
  mkdirSync(TEST_PROJECT, { recursive: true });
  writeFileSync(
    resolve(TEST_PROJECT, 'README.md'),
    '# Test project for V1-M23 W-1\n',
    'utf-8',
  );
}

async function buildScanServiceForTest() {
  // Use the project's composition-root or a minimal scaffold.
  // This intentionally tests the SAME factory user invocation goes through.
  const { createScanService } = await import('./scan-service.js');

  // Inline stub for collectFiles (file-collector.ts does not exist as a module)
  const stubCollectFiles = async (_projectPath: string) =>
    Object.freeze({
      files: Object.freeze([
        Object.freeze({
          relativePath: 'README.md',
          content: '# Test\n',
          size: 6,
        }),
      ]),
    });

  // Minimal scanner stub returning empty result (focus on disclaimer wiring)
  const stubScanner = Object.freeze({
    scan: async (projectPath: string) =>
      Object.freeze({
        score: Object.freeze({
          totalScore: 100,
          zone: 'green' as const,
          categoryScores: Object.freeze([]),
          criticalCapApplied: false,
          totalChecks: 0,
          passedChecks: 0,
          failedChecks: 0,
          skippedChecks: 0,
        }),
        findings: Object.freeze([]),
        projectPath,
        scannedAt: new Date().toISOString(),
        duration: 0,
        filesScanned: 0,
      }),
  });

  const stubEvents = Object.freeze({
    emit: () => undefined,
    on: () => () => undefined,
  });

  const scanService = createScanService({
    scanner: stubScanner as never,
    collectFiles: stubCollectFiles as never,
    events: stubEvents as never,
    setLastScanResult: () => undefined,
    getLastScanResult: () => null,
  } as never);

  return { scanService };
}
