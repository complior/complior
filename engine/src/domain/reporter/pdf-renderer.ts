import type { AuditReportData } from './audit-report.js';

interface PdfDoc {
  fontSize(size: number): PdfDoc;
  font(name: string): PdfDoc;
  fillColor(color: string): PdfDoc;
  text(text: string, options?: Record<string, unknown>): PdfDoc;
  text(text: string, x: number, y: number, options?: Record<string, unknown>): PdfDoc;
  moveDown(lines?: number): PdfDoc;
  addPage(): PdfDoc;
  rect(x: number, y: number, w: number, h: number): PdfDoc;
  fill(color: string): PdfDoc;
  stroke(): PdfDoc;
  strokeColor(color: string): PdfDoc;
  lineWidth(width: number): PdfDoc;
  moveTo(x: number, y: number): PdfDoc;
  lineTo(x: number, y: number): PdfDoc;
  end(): void;
  pipe(stream: NodeJS.WritableStream): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  y: number;
  page: { width: number; height: number };
}

const COLORS = {
  brand: '#1a73e8',
  red: '#e05d44',
  yellow: '#dfb317',
  green: '#97ca00',
  dark: '#333333',
  medium: '#666666',
  light: '#999999',
  bg: '#f5f5f5',
  white: '#ffffff',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#d32f2f',
  high: '#e05d44',
  medium: '#dfb317',
  low: '#97ca00',
  info: '#999999',
};

const ZONE_COLORS: Record<string, string> = {
  'Good Compliance': COLORS.green,
  'Partial Compliance': COLORS.yellow,
  'Critical Non-Compliance': COLORS.red,
};

const ensureSpace = (doc: PdfDoc, needed: number) => {
  if (doc.y + needed > doc.page.height - 60) {
    doc.addPage();
  }
};

const renderHeader = (doc: PdfDoc, data: AuditReportData) => {
  doc.rect(0, 0, doc.page.width, 100).fill(COLORS.brand);

  doc.fillColor(COLORS.white).fontSize(22).font('Helvetica-Bold');
  doc.text(data.title, 50, 25, { width: doc.page.width - 100 });

  doc.fontSize(10).font('Helvetica');
  doc.text(`${data.organization} | ${data.date} | ${data.jurisdiction} | Complior v${data.version}`, 50, 60, { width: doc.page.width - 100 });

  doc.fillColor(COLORS.dark);
  doc.y = 120;
};

const renderExecutiveSummary = (doc: PdfDoc, data: AuditReportData) => {
  ensureSpace(doc, 200);

  doc.fontSize(16).font('Helvetica-Bold').fillColor(COLORS.brand);
  doc.text('1. Executive Summary');
  doc.moveDown(0.5);

  doc.fontSize(11).font('Helvetica').fillColor(COLORS.dark);

  const zoneColor = ZONE_COLORS[data.zone] ?? COLORS.medium;
  doc.font('Helvetica-Bold').fillColor(zoneColor);
  doc.text(`Score: ${data.score}/100 — ${data.zone}`);
  doc.moveDown(0.3);

  doc.font('Helvetica').fillColor(COLORS.dark);
  const es = data.executiveSummary;
  doc.text(`Critical issues: ${es.criticalIssues}`);
  doc.text(`High issues: ${es.highIssues}`);
  doc.text(`Medium issues: ${es.mediumIssues}`);
  doc.text(`Low issues: ${es.lowIssues}`);
  doc.text(`Total recommended actions: ${es.recommendedActions}`);
  doc.moveDown(0.5);

  if (es.topRecommendations.length > 0) {
    doc.font('Helvetica-Bold').text('Top Recommendations:');
    doc.font('Helvetica');
    for (const rec of es.topRecommendations) {
      doc.text(`  • ${rec}`, { indent: 10 });
    }
  }
  doc.moveDown(1);
};

const renderScoreOverview = (doc: PdfDoc, data: AuditReportData) => {
  ensureSpace(doc, 200);

  doc.fontSize(16).font('Helvetica-Bold').fillColor(COLORS.brand);
  doc.text('2. Score Overview');
  doc.moveDown(0.5);

  doc.fontSize(11).font('Helvetica').fillColor(COLORS.dark);
  doc.text(`Total Checks: ${data.totalChecks}  |  Passed: ${data.passedChecks}  |  Failed: ${data.failedChecks}`);
  doc.moveDown(0.5);

  if (data.categoryBreakdown.length > 0) {
    doc.font('Helvetica-Bold').text('Category Breakdown:');
    doc.moveDown(0.3);
    doc.font('Helvetica');
    for (const cat of data.categoryBreakdown) {
      const pct = cat.obligationCount > 0
        ? Math.round((cat.passedCount / cat.obligationCount) * 100)
        : 0;
      doc.text(`  ${cat.category}: ${pct}% (${cat.passedCount}/${cat.obligationCount}, weight: ${Math.round(cat.weight * 100)}%)`);
    }
  }
  doc.moveDown(1);
};

const renderFindings = (doc: PdfDoc, data: AuditReportData) => {
  const failures = data.findings.filter((f) => f.type === 'fail');
  if (failures.length === 0) return;

  ensureSpace(doc, 100);
  doc.fontSize(16).font('Helvetica-Bold').fillColor(COLORS.brand);
  doc.text('3. Findings');
  doc.moveDown(0.5);

  const grouped: Record<string, typeof failures> = {};
  for (const f of failures) {
    const key = f.severity;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  }

  const order = ['critical', 'high', 'medium', 'low', 'info'];
  for (const sev of order) {
    const group = grouped[sev];
    if (!group || group.length === 0) continue;

    ensureSpace(doc, 60);
    const color = SEVERITY_COLORS[sev] ?? COLORS.medium;
    doc.fontSize(13).font('Helvetica-Bold').fillColor(color);
    doc.text(`${sev.toUpperCase()} (${group.length})`);
    doc.moveDown(0.3);

    doc.fontSize(10).font('Helvetica').fillColor(COLORS.dark);
    for (const f of group) {
      ensureSpace(doc, 40);
      const obl = f.obligationId ? `${f.obligationId}: ` : '';
      const art = f.articleReference ? ` [${f.articleReference}]` : '';
      doc.text(`  • ${obl}${f.message}${art}`);
      if (f.file) {
        doc.fillColor(COLORS.light).text(`    File: ${f.file}${f.line ? `:${f.line}` : ''}`);
        doc.fillColor(COLORS.dark);
      }
    }
    doc.moveDown(0.5);
  }
  doc.moveDown(0.5);
};

const renderRemediationPlan = (doc: PdfDoc, data: AuditReportData) => {
  if (data.remediationPlan.length === 0) return;

  ensureSpace(doc, 100);
  doc.fontSize(16).font('Helvetica-Bold').fillColor(COLORS.brand);
  doc.text('4. Remediation Plan');
  doc.moveDown(0.5);

  doc.fontSize(10).font('Helvetica').fillColor(COLORS.dark);
  for (const item of data.remediationPlan) {
    ensureSpace(doc, 50);
    doc.font('Helvetica-Bold');
    doc.text(`#${item.priority}. ${item.obligationId} ${item.article ? `[${item.article}]` : ''}`);
    doc.font('Helvetica');
    doc.text(`  Action: ${item.description}`);
    doc.text(`  Effort: ${item.effort}  |  Impact: ${item.impact}`);
    doc.moveDown(0.3);
  }
  doc.moveDown(0.5);
};

const renderAppendix = (doc: PdfDoc) => {
  doc.addPage();

  doc.fontSize(16).font('Helvetica-Bold').fillColor(COLORS.brand);
  doc.text('5. Appendix');
  doc.moveDown(0.5);

  doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.dark);
  doc.text('Methodology');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('This report was generated by Complior — an automated EU AI Act compliance scanner.', { width: doc.page.width - 100 });
  doc.text('Scoring uses weighted category analysis across 8 compliance areas.', { width: doc.page.width - 100 });
  doc.text('Critical findings apply a score cap of 40%.', { width: doc.page.width - 100 });
  doc.moveDown(0.5);

  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('EU AI Act Timeline');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  const milestones = [
    '2024-08-01: AI Act enters into force',
    '2025-02-02: Prohibited practices ban',
    '2025-08-02: GPAI obligations apply',
    '2026-08-02: Full enforcement for high-risk AI',
    '2027-08-02: Existing high-risk AI systems transition',
    '2030-08-02: Public sector legacy systems deadline',
  ];
  for (const m of milestones) {
    doc.text(`  • ${m}`);
  }
  doc.moveDown(1);

  doc.fontSize(8).fillColor(COLORS.light);
  doc.text('DISCLAIMER: This report is generated by automated compliance scanning software.', { width: doc.page.width - 100 });
  doc.text('It does not constitute legal advice. Consult qualified legal counsel for compliance decisions.', { width: doc.page.width - 100 });
};

const renderWatermark = (doc: PdfDoc, isFree: boolean) => {
  if (!isFree) return;

  doc.fontSize(8).fillColor('#cccccc').font('Helvetica');
  doc.text(
    'Generated by Complior — Free Tier',
    50,
    doc.page.height - 30,
    { width: doc.page.width - 100, align: 'center' },
  );
};

export const renderPdfReport = async (
  data: AuditReportData,
  outputPath: string,
  options?: { readonly isFree?: boolean },
): Promise<string> => {
  const { default: PDFDocument } = await import('pdfkit');
  const { createWriteStream } = await import('node:fs');
  const { mkdir } = await import('node:fs/promises');
  const { dirname } = await import('node:path');

  await mkdir(dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: data.title,
        Author: 'Complior',
        Subject: `Compliance Report — ${data.organization}`,
        Creator: `Complior v${data.version}`,
      },
    }) as unknown as PdfDoc;

    const stream = createWriteStream(outputPath);
    doc.pipe(stream);

    renderHeader(doc, data);
    renderExecutiveSummary(doc, data);
    renderScoreOverview(doc, data);
    renderFindings(doc, data);
    renderRemediationPlan(doc, data);
    renderAppendix(doc);
    renderWatermark(doc, options?.isFree !== false);

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
};
