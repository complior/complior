/**
 * V1-M23 / W-2: RED runtime test — report service must honor --output path for ALL formats.
 *
 * Background:
 *   V1-M21 re-run on eval-target discovered:
 *     $ complior report --format html --output /tmp/foo.html
 *     Report saved to: /tmp/foo.html      ← CLI says this
 *     $ ls /tmp/foo.html
 *     ls: cannot access '/tmp/foo.html': No such file
 *     $ ls ~/eval-target/.complior/reports/
 *     compliance-report-{timestamp}.html  ← actual location
 *
 *   ROOT CAUSE (cli/src/headless/commands.rs:247):
 *     client.post_json(endpoint, &serde_json::json!({}))  // empty body!
 *     ↑ never passes user's --output to engine route
 *   Engine route ACCEPTS outputPath (HtmlReportSchema, MarkdownReportSchema have it).
 *   The bug is in CLI not sending it.
 *
 * Specification:
 *   - reportService.generatePdf({ outputPath: '/tmp/x.pdf' }) writes to /tmp/x.pdf
 *   - reportService.generateMarkdown({ outputPath: '/tmp/x.md' }) writes to /tmp/x.md
 *   - reportService.generateOfflineHtml({ outputPath: '/tmp/x.html' }) writes to /tmp/x.html
 *   - For each: file must EXIST at exact path after call
 *
 * Architecture:
 *   - Path resolution: if outputPath provided, use it verbatim; else fallback to .complior/reports/
 *   - mkdir parent dir as needed
 *   - Pure file writes (no implicit prefix injection)
 *
 * Note: This test verifies the SERVICE layer honors outputPath.
 * Separate Rust integration test verifies CLI passes --output through to engine body.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m23-output-${process.pid}`);
const OUTPUT_DIR = resolve(tmpdir(), `complior-m23-output-out-${process.pid}`);

describe('V1-M23 / W-2: report service honors --output path for all formats', () => {
  beforeEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    rmSync(OUTPUT_DIR, { recursive: true, force: true });
    mkdirSync(TEST_PROJECT, { recursive: true });
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(resolve(TEST_PROJECT, 'README.md'), '# test\n', 'utf-8');
  });

  afterEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    rmSync(OUTPUT_DIR, { recursive: true, force: true });
  });

  it('generateMarkdown writes to outputPath when provided', async () => {
    const { reportService } = await buildReportServiceForTest();
    const target = resolve(OUTPUT_DIR, 'custom-report.md');

    const result = await reportService.generateMarkdown({ outputPath: target });

    expect(result.path).toBe(target);
    expect(existsSync(target)).toBe(true);
    // Must NOT have been written to .complior/reports/ as fallback
    expect(existsSync(resolve(TEST_PROJECT, '.complior/reports/compliance.md'))).toBe(false);
  });

  it('generatePdf writes to outputPath when provided', async () => {
    const { reportService } = await buildReportServiceForTest();
    const target = resolve(OUTPUT_DIR, 'custom-report.pdf');

    const result = await reportService.generatePdf({ outputPath: target });

    expect(result.path).toBe(target);
    expect(existsSync(target)).toBe(true);
    expect(existsSync(resolve(TEST_PROJECT, '.complior/reports'))).toBe(false);
  });

  it('generateOfflineHtml writes to outputPath when provided', async () => {
    const { reportService } = await buildReportServiceForTest();
    const target = resolve(OUTPUT_DIR, 'custom-report.html');

    // Service must expose generateOfflineHtml accepting outputPath
    const result = await (
      reportService as unknown as {
        generateOfflineHtml: (opts: { outputPath?: string }) => Promise<{ path: string }>;
      }
    ).generateOfflineHtml({ outputPath: target });

    expect(result.path).toBe(target);
    expect(existsSync(target)).toBe(true);
  });

  it('generateMarkdown falls back to .complior/reports/ when outputPath omitted', async () => {
    const { reportService } = await buildReportServiceForTest();

    const result = await reportService.generateMarkdown({});

    expect(result.path).toContain('.complior/reports');
    expect(existsSync(result.path)).toBe(true);
  });

  it('outputPath creates parent directory if missing', async () => {
    const { reportService } = await buildReportServiceForTest();
    const deepTarget = resolve(OUTPUT_DIR, 'nested/deep/report.md');

    const result = await reportService.generateMarkdown({ outputPath: deepTarget });

    expect(result.path).toBe(deepTarget);
    expect(existsSync(deepTarget)).toBe(true);
  });
});

// ── Helpers ────────────────────────────────────────────────────────

async function buildReportServiceForTest() {
  const { createReportService } = await import('./report-service.js');

  // Minimal scan result for report generation
  const stubScanResult = Object.freeze({
    score: Object.freeze({
      totalScore: 75,
      zone: 'yellow' as const,
      categoryScores: Object.freeze([]),
      criticalCapApplied: false,
      totalChecks: 10,
      passedChecks: 7,
      failedChecks: 3,
      skippedChecks: 0,
    }),
    findings: Object.freeze([]),
    projectPath: TEST_PROJECT,
    scannedAt: new Date().toISOString(),
    duration: 0,
    filesScanned: 1,
  });

  const reportService = createReportService({
    events: { emit: () => undefined, on: () => () => undefined } as never,
    getProjectPath: () => TEST_PROJECT,
    getLastScanResult: () => stubScanResult as never,
    getVersion: () => '0.10.0-test',
  });

  return { reportService };
}
