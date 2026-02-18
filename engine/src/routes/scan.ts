import { Hono } from 'hono';
import { z } from 'zod';
import { getEngineContext } from '../context.js';
import { collectFiles } from '../core/scanner/file-collector.js';
import { createScanner } from '../core/scanner/index.js';
import { ValidationError } from '../types/errors.js';

const ScanRequestSchema = z.object({
  path: z.string().min(1),
});

const app = new Hono();

app.post('/scan', async (c) => {
  const body = await c.req.json().catch(() => {
    throw new ValidationError('Invalid JSON body');
  });
  const parsed = ScanRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(`Invalid request: ${parsed.error.message}`);
  }

  const ctx = getEngineContext();
  const scanContext = await collectFiles(parsed.data.path);
  const scanner = createScanner(ctx.regulationData.scoring.scoring);
  const result = scanner.scan(scanContext);

  ctx.lastScanResult = result;

  return c.json(result);
});

export default app;
