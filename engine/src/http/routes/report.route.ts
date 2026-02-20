import { Hono } from 'hono';
import { z } from 'zod';
import type { ReportService } from '../../services/report-service.js';

const PdfReportSchema = z.object({
  organization: z.string().optional(),
  jurisdiction: z.string().optional(),
  isFree: z.boolean().optional(),
});

export const createReportRoute = (reportService: ReportService) => {
  const app = new Hono();

  app.post('/report/pdf', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = PdfReportSchema.safeParse(body);
    const options = parsed.success ? parsed.data : {};

    const result = await reportService.generatePdf(options);
    return c.json({ path: result.path, pages: result.pages, format: 'pdf' });
  });

  app.post('/report/markdown', async (c) => {
    const result = await reportService.generateMarkdown();
    return c.json({ path: result.path, format: 'markdown' });
  });

  return app;
};
