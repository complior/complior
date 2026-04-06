import { Hono } from 'hono';
import { z } from 'zod';
import type { ReportService } from '../../services/report-service.js';

const PdfReportSchema = z.object({
  organization: z.string().optional(),
  jurisdiction: z.string().optional(),
  isFree: z.boolean().optional(),
});

const HtmlReportSchema = z.object({
  outputPath: z.string().optional(),
});

export const createReportRoute = (reportService: ReportService) => {
  const app = new Hono();

  // Existing: generate audit PDF
  app.post('/report/status/pdf', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = PdfReportSchema.safeParse(body);
    const options = parsed.success ? parsed.data : {};

    const result = await reportService.generatePdf(options);
    return c.json({ path: result.path, pages: result.pages, format: 'pdf' });
  });

  // Existing: generate compliance markdown
  app.post('/report/status/markdown', async (c) => {
    const result = await reportService.generateMarkdown();
    return c.json({ path: result.path, format: 'markdown' });
  });

  // New: full compliance report (JSON)
  app.get('/report/status', async (c) => {
    const report = await reportService.generateReport();
    return c.json(report);
  });

  // New: generate offline HTML report (--share)
  app.post('/report/share', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = HtmlReportSchema.safeParse(body);
    const options = parsed.success ? parsed.data : {};

    const result = await reportService.generateOfflineHtml(options);
    return c.json({ path: result.path, format: 'html' });
  });

  return app;
};
