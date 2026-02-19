import { Hono } from 'hono';
import { z } from 'zod';
import type { FileService } from '../../services/file-service.js';
import { ValidationError } from '../../types/errors.js';

const CreateFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

const EditFileSchema = z.object({
  path: z.string().min(1),
  oldContent: z.string(),
  newContent: z.string(),
});

const ReadFileSchema = z.object({
  path: z.string().min(1),
});

export const createFileRoute = (fileService: FileService) => {
  const app = new Hono();

  app.post('/file/create', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = CreateFileSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    await fileService.create(parsed.data.path, parsed.data.content);
    return c.json({ success: true, path: parsed.data.path });
  });

  app.post('/file/edit', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = EditFileSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    await fileService.edit(parsed.data.path, parsed.data.oldContent, parsed.data.newContent);
    return c.json({ success: true, path: parsed.data.path });
  });

  app.post('/file/read', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = ReadFileSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const content = await fileService.read(parsed.data.path);
    return c.json({ content, path: parsed.data.path });
  });

  app.get('/file/list', async (c) => {
    const path = c.req.query('path');
    const pattern = c.req.query('pattern');

    if (!path) {
      throw new ValidationError('Missing path query parameter');
    }

    const files = await fileService.list(path, pattern);
    return c.json({ files, count: files.length });
  });

  return app;
};
