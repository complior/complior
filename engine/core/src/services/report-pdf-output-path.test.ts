/**
 * V1-M24 / R-2: RED runtime test — PDF endpoint must honor outputPath.
 *
 * Background:
 *   V1-M23 W-2 fixed --output for md and html, but PDF was missed:
 *     $ complior report --format pdf --output /tmp/test.pdf
 *     Report saved to: /home/.../.complior/reports/audit-report-1777075942208.pdf
 *     Warning: requested /tmp/test.pdf but engine reports /home/.../audit-report-{ts}.pdf
 *     $ ls /tmp/test.pdf
 *     ls: cannot access '/tmp/test.pdf': No such file
 *
 *   reportService.generatePdf({ outputPath }) signature exists but the engine
 *   route POST /report/status/pdf doesn't pass it through, OR generatePdf
 *   doesn't honor it.
 *
 * Specification:
 *   - reportService.generatePdf({ outputPath: '/tmp/x.pdf' }) writes EXACTLY to /tmp/x.pdf
 *   - File must NOT be written to .complior/reports/ when outputPath provided
 *   - Behavior matches generateMarkdown (which V1-M23 fixed correctly)
 *
 * Architecture:
 *   - Mirror generateMarkdown pattern in generatePdf
 *   - Single source of path resolution
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m24-pdf-${process.pid}`);
const OUTPUT_DIR = resolve(tmpdir(), `complior-m24-pdf-out-${process.pid}`);

describe('V1-M24 / R-2: report service generatePdf honors --output path', () => {
  beforeEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    rmSync(OUTPUT_DIR, { recursive: true, force: true });
    mkdirSync(TEST_PROJECT, { recursive: true });
    mkdirSync(OUTPUT_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    rmSync(OUTPUT_DIR, { recursive: true, force: true });
  });

  it('generatePdf writes to outputPath when provided', async () => {
    const { reportService } = await buildReportServiceForTest();
    const target = resolve(OUTPUT_DIR, 'custom.pdf');

    const result = await reportService.generatePdf({ outputPath: target });

    expect(result.path).toBe(target);
    expect(existsSync(target)).toBe(true);
  });

  it('generatePdf does NOT fall back to .complior/reports/ when outputPath provided', async () => {
    const { reportService } = await buildReportServiceForTest();
    const target = resolve(OUTPUT_DIR, 'explicit.pdf');

    await reportService.generatePdf({ outputPath: target });

    // Project's .complior/reports/ should remain empty (no fallback write)
    const projectReportsDir = resolve(TEST_PROJECT, '.complior/reports');
    expect(existsSync(projectReportsDir)).toBe(false);
  });

  it('generatePdf creates parent directory if missing', async () => {
    const { reportService } = await buildReportServiceForTest();
    const deepTarget = resolve(OUTPUT_DIR, 'nested/deep/report.pdf');

    const result = await reportService.generatePdf({ outputPath: deepTarget });

    expect(result.path).toBe(deepTarget);
    expect(existsSync(deepTarget)).toBe(true);
  });
});

describe('V1-M24 / R-2 (route): PdfReportSchema must accept outputPath', () => {
  it('POST /report/status/pdf with outputPath body writes to that path', async () => {
    const { createReportRoute } = await import('../http/routes/report.route.js');
    const { reportService } = await buildReportServiceForTest();
    const target = resolve(OUTPUT_DIR, 'route-pdf.pdf');

    const app = createReportRoute(reportService);
    const res = await app.request('/report/status/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputPath: target }),
    });

    expect(res.status).toBe(200);
    expect(existsSync(target)).toBe(true);

    const body = (await res.json()) as { path?: string };
    expect(body.path).toBe(target);
  });
});

// ── Helpers ────────────────────────────────────────────────────────

async function buildReportServiceForTest() {
  const { createReportService } = await import('./report-service.js');

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
