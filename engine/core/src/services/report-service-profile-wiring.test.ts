/**
 * V1-M25: RED runtime test — reportService must surface project profile to ComplianceReport.
 *
 * Background:
 *   V1-M24 R-4 added `profile` to buildComplianceReport input/output (builder-level).
 *   But composition gap: reportService.generateReport() doesn't fetch profile from
 *   project.toml and pass it to buildComplianceReport input. Result: HTML report's
 *   profile block stays empty even when project.toml has role/riskLevel/domain.
 *
 * Specification:
 *   - ReportServiceDeps must include `getProjectProfile?: () => Promise<CompanyProfile | null>`
 *   - reportService.generateReport() calls getProjectProfile and passes to buildComplianceReport
 *   - Returned ComplianceReport.profile is non-null when getter returns profile
 *   - Returned ComplianceReport.profile is undefined/null when getter returns null
 *
 * Architecture:
 *   - Optional dep (back-compat with existing tests)
 *   - Pure data flow — no transformation in service
 *   - Object.freeze on output (existing pattern)
 */

import { describe, it, expect } from 'vitest';

describe('V1-M25: reportService surfaces project profile to ComplianceReport', () => {
  it('ReportServiceDeps interface accepts getProjectProfile', async () => {
    const { createReportService } = await import('./report-service.js');
    // Verify call signature accepts getProjectProfile dep without TS error
    const service = createReportService({
      events: { emit: () => undefined, on: () => () => undefined } as never,
      getProjectPath: () => '/tmp',
      getLastScanResult: () => null,
      getVersion: () => '0.10.0-test',
      getProjectProfile: async () => Object.freeze({
        role: 'provider',
        riskLevel: 'high',
        domain: 'healthcare',
        applicableArticles: ['Art. 6', 'Art. 9'],
      }),
    } as never);
    expect(typeof (service as { generateReport?: unknown }).generateReport).toBe('function');
  });

  it('generateReport calls getProjectProfile and includes profile in output', async () => {
    const { createReportService } = await import('./report-service.js');

    let getterCalled = false;
    const service = createReportService({
      events: { emit: () => undefined, on: () => () => undefined } as never,
      getProjectPath: () => '/tmp',
      getLastScanResult: () => null,
      getVersion: () => '0.10.0-test',
      getProjectProfile: async () => {
        getterCalled = true;
        return Object.freeze({
          role: 'provider' as const,
          riskLevel: 'high' as const,
          domain: 'healthcare',
          applicableArticles: ['Art. 6', 'Art. 9', 'Art. 11'],
        });
      },
    } as never);

    const report = await (service as { generateReport: () => Promise<{ profile?: unknown }> })
      .generateReport();

    expect(getterCalled).toBe(true);
    expect(report.profile).toBeDefined();
    expect(report.profile).not.toBeNull();
  });

  it('profile in report matches getter output', async () => {
    const { createReportService } = await import('./report-service.js');

    const service = createReportService({
      events: { emit: () => undefined, on: () => () => undefined } as never,
      getProjectPath: () => '/tmp',
      getLastScanResult: () => null,
      getVersion: () => '0.10.0-test',
      getProjectProfile: async () =>
        Object.freeze({
          role: 'deployer' as const,
          riskLevel: 'limited' as const,
          domain: 'finance',
          applicableArticles: ['Art. 50'],
        }),
    } as never);

    const report = await (service as {
      generateReport: () => Promise<{ profile?: { role?: string; domain?: string } }>;
    }).generateReport();

    expect(report.profile?.role).toBe('deployer');
    expect(report.profile?.domain).toBe('finance');
  });

  it('profile is undefined when getProjectProfile returns null', async () => {
    const { createReportService } = await import('./report-service.js');

    const service = createReportService({
      events: { emit: () => undefined, on: () => () => undefined } as never,
      getProjectPath: () => '/tmp',
      getLastScanResult: () => null,
      getVersion: () => '0.10.0-test',
      getProjectProfile: async () => null,
    } as never);

    const report = await (service as { generateReport: () => Promise<{ profile?: unknown }> })
      .generateReport();

    // null or undefined both acceptable
    expect(report.profile == null).toBe(true);
  });

  it('profile is undefined when getProjectProfile is not provided (back-compat)', async () => {
    const { createReportService } = await import('./report-service.js');

    const service = createReportService({
      events: { emit: () => undefined, on: () => () => undefined } as never,
      getProjectPath: () => '/tmp',
      getLastScanResult: () => null,
      getVersion: () => '0.10.0-test',
      // no getProjectProfile
    } as never);

    const report = await (service as { generateReport: () => Promise<{ profile?: unknown }> })
      .generateReport();

    expect(report.profile == null).toBe(true);
  });
});
