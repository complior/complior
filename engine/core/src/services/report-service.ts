import { resolve, dirname } from 'node:path';
import type { ScanResult, Role } from '../types/common.types.js';
import type { EventBusPort } from '../ports/events.port.js';
import type { EvidenceChainSummary } from '../domain/scanner/evidence-store.js';
import type { ComplianceReport } from '../domain/reporter/types.js';
import type { PassportData } from '../domain/reporter/passport-status.js';
import type { ObligationRecord } from '../domain/reporter/obligation-coverage.js';
import { ValidationError } from '../types/errors.js';
import { buildAuditReportData } from '../domain/reporter/audit-report.js';
import { renderPdfToBuffer } from '../domain/reporter/pdf-renderer.js';
import { generateComplianceMd } from '../domain/reporter/compliance-md.js';
import { buildComplianceReport } from '../domain/reporter/report-builder.js';

export interface ReportServiceDeps {
  readonly events: EventBusPort;
  readonly getProjectPath: () => string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly getVersion: () => string;
  readonly getEvalScore?: () => Promise<number | null>;
  readonly getPassports?: () => Promise<readonly PassportData[]>;
  readonly getObligations?: () => readonly ObligationRecord[];
  readonly getEvidenceSummary?: () => Promise<EvidenceChainSummary | null>;
  readonly getProjectRole?: () => Promise<Role>;
  readonly getScanModeScores?: () => Promise<Partial<Record<string, { score: number; zone: string; scannedAt: string }>>>;
}

export const createReportService = (deps: ReportServiceDeps) => {
  const { events, getProjectPath, getLastScanResult, getVersion } = deps;

  const generatePdf = async (options?: {
    readonly organization?: string;
    readonly jurisdiction?: string;
    readonly outputPath?: string;
    readonly isFree?: boolean;
  }): Promise<{ path: string; pages: number }> => {
    const scanResult = getLastScanResult();
    if (!scanResult) {
      throw new ValidationError('No scan result available. Run a scan first.');
    }

    const data = buildAuditReportData(scanResult, {
      organization: options?.organization,
      jurisdiction: options?.jurisdiction,
      version: getVersion(),
    });

    const outputPath = options?.outputPath ?? resolve(
      getProjectPath(), '.complior', 'reports', `audit-report-${Date.now()}.pdf`,
    );

    const buffer = await renderPdfToBuffer(data, { isFree: options?.isFree });
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, buffer);

    events.emit('report.generated', { path: outputPath, format: 'pdf' });

    // Approximate page count from findings
    const pages = Math.max(4, Math.ceil(data.findings.length / 8) + 3);
    return { path: outputPath, pages };
  };

  const generateMarkdown = async (options?: {
    readonly outputPath?: string;
  }): Promise<{ path: string; content: string }> => {
    const scanResult = getLastScanResult();
    if (!scanResult) {
      throw new ValidationError('No scan result available. Run a scan first.');
    }

    const content = generateComplianceMd(scanResult, getVersion());
    const outputPath = options?.outputPath ?? resolve(getProjectPath(), 'COMPLIANCE.md');

    const { writeFile, mkdir } = await import('node:fs/promises');
    const { dirname } = await import('node:path');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content);

    events.emit('report.generated', { path: outputPath, format: 'markdown' });

    return { path: outputPath, content };
  };

  const generateReport = async (): Promise<ComplianceReport> => {
    const scanResult = getLastScanResult();
    const evalScore = (await deps.getEvalScore?.()) ?? null;
    const passports = (await deps.getPassports?.()) ?? [];
    const obligations = deps.getObligations?.() ?? [];
    const evidenceSummary = (await deps.getEvidenceSummary?.()) ?? null;
    const projectRole = (await deps.getProjectRole?.()) ?? 'both';
    const scanModeScores = (await deps.getScanModeScores?.()) ?? {};

    return buildComplianceReport({
      scanResult,
      evalScore,
      passports,
      obligations,
      evidenceSummary,
      version: getVersion(),
      projectRole,
      scanModeScores,
    });
  };

  const generateOfflineHtml = async (options?: {
    readonly outputPath?: string;
  }): Promise<{ path: string }> => {
    const report = await generateReport();

    const { generateReportHtml } = await import('../domain/reporter/html-renderer.js');
    const html = generateReportHtml(report);

    const outputPath = options?.outputPath ?? resolve(
      getProjectPath(), '.complior', 'reports', `compliance-report-${Date.now()}.html`,
    );

    const { writeFile, mkdir } = await import('node:fs/promises');
    const { dirname } = await import('node:path');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html);

    events.emit('report.generated', { path: outputPath, format: 'html' });
    return { path: outputPath };
  };

  return Object.freeze({ generatePdf, generateMarkdown, generateReport, generateOfflineHtml });
};

export type ReportService = ReturnType<typeof createReportService>;
