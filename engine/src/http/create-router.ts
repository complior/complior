import { Hono } from 'hono';
import { AppError } from '../types/errors.js';
import type { ScanService } from '../services/scan-service.js';
import type { ChatService } from '../services/chat-service.js';
import type { FileService } from '../services/file-service.js';
import type { StatusService } from '../services/status-service.js';
import type { LlmPort } from '../ports/llm.port.js';
import type { ProjectMemory } from '../types/common.types.js';
import { createScanRoute } from './routes/scan.route.js';
import { createStatusRoute } from './routes/status.route.js';
import { createMemoryRoute } from './routes/memory.route.js';
import { createChatRoute } from './routes/chat.route.js';
import { createFileRoute } from './routes/file.route.js';
import { createShellRoute } from './routes/shell.route.js';
import { createGitRoute } from './routes/git.route.js';
import { createProviderRoute } from './routes/provider.route.js';

export interface RouterDeps {
  readonly scanService: ScanService;
  readonly chatService: ChatService;
  readonly fileService: FileService;
  readonly statusService: StatusService;
  readonly llm: LlmPort;
  readonly getProjectMemory: () => ProjectMemory | null;
}

export const createRouter = (deps: RouterDeps) => {
  const app = new Hono();

  // Global error handler
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(
        { error: err.code, message: err.message },
        err.statusCode as 400 | 404 | 500 | 502,
      );
    }
    console.error('Unexpected error:', err);
    return c.json(
      { error: 'INTERNAL', message: 'Internal server error' },
      500,
    );
  });

  // Mount routes
  app.route('/', createStatusRoute(deps.statusService));
  app.route('/', createScanRoute(deps.scanService));
  app.route('/', createMemoryRoute({ getProjectMemory: deps.getProjectMemory }));
  app.route('/', createChatRoute({ chatService: deps.chatService, llm: deps.llm }));
  app.route('/', createFileRoute(deps.fileService));
  app.route('/', createShellRoute());
  app.route('/', createGitRoute());
  app.route('/', createProviderRoute(deps.llm));

  // Health check
  app.get('/health', (c) => c.json({ ok: true }));

  return app;
};
