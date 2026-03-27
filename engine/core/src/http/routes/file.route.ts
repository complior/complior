import { Hono } from 'hono';
import { z } from 'zod';
import type { FileService } from '../../services/file-service.js';
import { parseBody, requireQuery } from '../utils/validation.js';

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
    const data = await parseBody(c, CreateFileSchema);

    await fileService.create(data.path, data.content);
    return c.json({ success: true, path: data.path });
  });

  app.post('/file/edit', async (c) => {
    const data = await parseBody(c, EditFileSchema);

    await fileService.edit(data.path, data.oldContent, data.newContent);
    return c.json({ success: true, path: data.path });
  });

  app.post('/file/read', async (c) => {
    const data = await parseBody(c, ReadFileSchema);

    const content = await fileService.read(data.path);
    return c.json({ content, path: data.path });
  });

  app.get('/file/list', async (c) => {
    const path = requireQuery(c, 'path');
    const pattern = c.req.query('pattern');

    const files = await fileService.list(path, pattern);
    return c.json({ files, count: files.length });
  });

  return app;
};
