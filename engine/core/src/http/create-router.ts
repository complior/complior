import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { AppError } from '../types/errors.js';
import { createLogger } from '../infra/logger.js';
import { createInitialState } from '../domain/onboarding/guided-onboarding.js';
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
import type { PassportService } from '../services/passport-service.js';
import type { LlmPort } from '../ports/llm.port.js';
import type { ScoreBreakdown } from '../types/common.types.js';
import type { ToolExecutorDeps } from '../llm/tool-executors.js';
import type { AgentMode } from '../llm/tools/types.js';
import type { OnboardingWizard } from '../onboarding/wizard.js';
import type { OnboardingProfile } from '../onboarding/profile.js';
import type { EvidenceStore } from '../domain/scanner/evidence-store.js';
import type { AuditStore } from '../domain/audit/audit-trail.js';
import { createScanRoute } from './routes/scan.route.js';
import { createStatusRoute } from './routes/status.route.js';
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
import { createDisclaimerRoute } from './routes/disclaimer.route.js';
import { createOnboardingRoute } from './routes/onboarding.route.js';
import { createWhatIfRoute } from './routes/whatif.route.js';
import { createAgentRoute } from './routes/agent.route.js';
import { createObligationsRoute } from './routes/obligations.route.js';
import { createSyncRoute } from './routes/sync.route.js';
import { createCertRoute } from './routes/cert.route.js';
import { createGuidedOnboardingRoute } from './routes/guided-onboarding.route.js';

export interface RouterDeps {
  readonly scanService: ScanService;
  readonly chatService: ChatService;
  readonly fileService: FileService;
  readonly fixService: FixService;
  readonly undoService: UndoService;
  readonly badgeService: BadgeService;
  readonly shareService: ShareService;
  readonly reportService: ReportService;
  readonly getExternalScanService: () => Promise<ExternalScanService>;
  readonly statusService: StatusService;
  readonly passportService: PassportService;
  readonly llm: LlmPort;
  readonly toolExecutorDeps: ToolExecutorDeps;
  readonly getMode: () => AgentMode;
  readonly setMode: (mode: AgentMode) => void;
  readonly onboardingWizard: OnboardingWizard;
  readonly getVersion: () => string;
  readonly loadProfile: () => Promise<OnboardingProfile | null>;
  readonly getLastScore: () => ScoreBreakdown | null;
  readonly obligations: readonly Record<string, unknown>[];
  readonly getLastScan: () => import('../types/common.types.js').ScanResult | null;
  readonly getProjectPath: () => string;
  readonly callLlm?: (prompt: string, systemPrompt?: string) => Promise<string>;
  readonly evidenceStore?: EvidenceStore;
  readonly auditStore?: AuditStore;
}

const OnboardingStepSchema = z.object({
  step: z.number(),
  name: z.string(),
  label: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
  data: z.record(z.unknown()).optional(),
  completedAt: z.string().optional(),
});

const OnboardingStateSchema = z.object({
  currentStep: z.number(),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  steps: z.array(OnboardingStepSchema),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export const createRouter = (deps: RouterDeps) => {
  const app = new Hono();
  const log = createLogger('http');

  // US-S0201: CORS — allow TUI (localhost) and any local dev origin
  app.use('*', cors({
    origin: (origin) => {
      if (!origin) return null; // same-origin requests pass through
      try {
        const { hostname } = new URL(origin);
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
          return origin;
        }
      } catch {
        // malformed origin — ignore
      }
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-Complior-Version'],
  }));

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
  app.route('/', createScanRoute({ scanService: deps.scanService, getLastScan: deps.getLastScan }));
  app.route('/', createChatRoute({ chatService: deps.chatService, llm: deps.llm, toolExecutorDeps: deps.toolExecutorDeps, getMode: deps.getMode, setMode: deps.setMode }));
  app.route('/', createFileRoute(deps.fileService));
  app.route('/', createFixRoute({ fixService: deps.fixService, undoService: deps.undoService }));
  app.route('/', createBadgeRoute(deps.badgeService));
  app.route('/', createShareRoute(deps.shareService));
  app.route('/', createReportRoute(deps.reportService));
  app.route('/', createExternalScanRoute(deps.getExternalScanService));
  app.route('/', createShellRoute());
  app.route('/', createGitRoute());
  app.route('/', createProviderRoute(deps.llm));
  app.route('/', createDisclaimerRoute({ getVersion: deps.getVersion }));
  app.route('/', createOnboardingRoute(deps.onboardingWizard));
  app.route('/', createWhatIfRoute({ loadProfile: deps.loadProfile, getLastScore: deps.getLastScore }));
  app.route('/', createAgentRoute(deps.passportService));
  app.route('/', createCertRoute({
    passportService: deps.passportService,
    callLlm: deps.callLlm,
    evidenceStore: deps.evidenceStore,
    auditStore: deps.auditStore,
    getProjectPath: deps.getProjectPath,
  }));
  app.route('/', createGuidedOnboardingRoute({
    scanService: deps.scanService,
    passportService: deps.passportService,
    getProjectPath: deps.getProjectPath,
    getLastScan: deps.getLastScan,
    loadOnboardingState: async (projectPath: string) => {
      try {
        const raw = await readFile(join(projectPath, '.complior', 'onboarding-progress.json'), 'utf-8');
        const parsed = OnboardingStateSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : createInitialState();
      } catch {
        return createInitialState();
      }
    },
    saveOnboardingState: async (projectPath: string, state) => {
      const dir = join(projectPath, '.complior');
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'onboarding-progress.json'), JSON.stringify(state, null, 2));
    },
  }));
  app.route('/', createObligationsRoute({ obligations: deps.obligations, getLastScan: deps.getLastScan }));
  app.route('/', createSyncRoute({
    getProjectPath: deps.getProjectPath,
    getLastScan: deps.getLastScan,
    passportService: deps.passportService,
    getAuditEntries: (filter) => deps.passportService.getAuditTrail(filter),
  }));

  // Health check
  app.get('/health', (c) => c.json({ ok: true }));

  return app;
};
