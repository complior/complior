import { Hono } from 'hono';
import { AppError } from '../types/errors.js';
import { createLogger } from '../infra/logger.js';
import type { ScanService } from '../services/scan-service.js';
import type { ChatService } from '../services/chat-service.js';
import type { FileService } from '../services/file-service.js';
import type { FixService } from '../services/fix-service.js';
import type { UndoService } from '../services/undo-service.js';
import type { BadgeService } from '../services/badge-service.js';
import type { ShareService } from '../services/share-service.js';
import type { ReportService } from '../services/report-service.js';
import type { ExternalScanService } from '../services/external-scan-service.js';
import type { StatusService } from '../services/status-service.js';
import type { LlmPort } from '../ports/llm.port.js';
import type { ProjectMemory } from '../types/common.types.js';
import { createScanRoute } from './routes/scan.route.js';
import { createStatusRoute } from './routes/status.route.js';
import { createMemoryRoute } from './routes/memory.route.js';
import { createChatRoute } from './routes/chat.route.js';
import { createFileRoute } from './routes/file.route.js';
import { createFixRoute } from './routes/fix.route.js';
import { createBadgeRoute } from './routes/badge.route.js';
import { createShareRoute } from './routes/share.route.js';
import { createReportRoute } from './routes/report.route.js';
import { createExternalScanRoute } from './routes/external-scan.route.js';
import { createShellRoute } from './routes/shell.route.js';
import { createGitRoute } from './routes/git.route.js';
import { createProviderRoute } from './routes/provider.route.js';

export interface RouterDeps {
  readonly scanService: ScanService;
  readonly chatService: ChatService;
  readonly fileService: FileService;
  readonly fixService: FixService;
  readonly undoService: UndoService;
  readonly badgeService: BadgeService;
  readonly shareService: ShareService;
  readonly reportService: ReportService;
  readonly externalScanService: ExternalScanService;
  readonly statusService: StatusService;
  readonly llm: LlmPort;
  readonly getProjectMemory: () => ProjectMemory | null;
}

export const createRouter = (deps: RouterDeps) => {
  const app = new Hono();
  const log = createLogger('http');

  // Global error handler
  app.onError((err, c) => {
    if (err instanceof AppError) {
      const status = err.statusCode === 400 ? 400
        : err.statusCode === 404 ? 404
        : err.statusCode === 502 ? 502
        : 500;
      return c.json(
        { error: err.code, message: err.message },
        status,
      );
    }
    log.error('Unexpected error:', err);
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
  app.route('/', createFixRoute({ fixService: deps.fixService, undoService: deps.undoService }));
  app.route('/', createBadgeRoute(deps.badgeService));
  app.route('/', createShareRoute(deps.shareService));
  app.route('/', createReportRoute(deps.reportService));
  app.route('/', createExternalScanRoute(deps.externalScanService));
  app.route('/', createShellRoute());
  app.route('/', createGitRoute());
  app.route('/', createProviderRoute(deps.llm));

  // Health check
  app.get('/health', (c) => c.json({ ok: true }));

  return app;
};
