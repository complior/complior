import { resolve } from 'node:path';
import type { ScanResult } from '../types/common.types.js';
import type { EventBusPort } from '../ports/events.port.js';
import { buildAuditReportData } from '../domain/reporter/audit-report.js';
import { renderPdfReport } from '../domain/reporter/pdf-renderer.js';
import { generateComplianceMd } from '../domain/reporter/compliance-md.js';

export interface ReportServiceDeps {
  readonly events: EventBusPort;
  readonly getProjectPath: () => string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly getVersion: () => string;
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
      throw new Error('No scan result available. Run a scan first.');
    }

    const data = buildAuditReportData(scanResult, {
      organization: options?.organization,
      jurisdiction: options?.jurisdiction,
      version: getVersion(),
    });

    const outputPath = options?.outputPath ?? resolve(
      getProjectPath(), '.complior', 'reports', `audit-report-${Date.now()}.pdf`,
    );

    await renderPdfReport(data, outputPath, { isFree: options?.isFree });

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
      throw new Error('No scan result available. Run a scan first.');
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

  return Object.freeze({ generatePdf, generateMarkdown });
};

export type ReportService = ReturnType<typeof createReportService>;
