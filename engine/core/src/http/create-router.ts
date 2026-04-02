import { Hono } from 'hono';
import { cors } from 'hono/cors';
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
import type { PassportService } from '../services/passport-service.js';
import type { CostService } from '../services/cost-service.js';
import type { DebtService } from '../services/debt-service.js';
import type { LlmPort } from '../ports/llm.port.js';
import type { ScoreBreakdown } from '../types/common.types.js';
import type { ToolExecutorDeps } from '../llm/tool-executors.js';
import type { AgentMode } from '../llm/tools/types.js';
import type { OnboardingWizard } from '../onboarding/wizard.js';
import type { OnboardingProfile } from '../onboarding/profile.js';
import type { FrameworkService } from '../services/framework-service.js';
import type { EvidenceStore } from '../domain/scanner/evidence-store.js';
import type { AuditStore } from '../domain/audit/audit-trail.js';
import type { EventBusPort } from '../ports/events.port.js';
import type { WhatIfRequest, WhatIfResult } from '../domain/whatif/scenario-engine.js';
import type { GeneratedConfig } from '../domain/whatif/config-fixer.js';
import type { SimulationInput, SimulationResult } from '../domain/whatif/simulate-actions.js';
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
import { createSupplyChainRoute } from './routes/supply-chain.route.js';
import { createEventsRoute } from './routes/events.route.js';
import { createCostRoute } from './routes/cost.route.js';
import { createDebtRoute } from './routes/debt.route.js';
import { createFrameworksRoute } from './routes/frameworks.route.js';
import { createJurisdictionRoute } from './routes/jurisdiction.route.js';
import { createProxyRoute } from './routes/proxy.route.js';
import { createImportRoute } from './routes/import.route.js';
import { createRedteamRoute } from './routes/redteam.route.js';
import { createToolsRoute } from './routes/tools.route.js';
import { createEvalRoute } from './routes/eval.route.js';
import { createAuditRoute } from './routes/audit.route.js';
import type { ToolManager } from '../infra/tool-manager.js';
import type { ProxyService } from '../services/proxy-service.js';
import type { EvalService } from '../services/eval-service.js';

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
  readonly costService?: CostService;
  readonly debtService?: DebtService;
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
  readonly events?: EventBusPort;
  readonly analyzeScenario?: (request: WhatIfRequest) => WhatIfResult;
  readonly generateAllConfigs?: (profile: OnboardingProfile) => readonly GeneratedConfig[];
  readonly simulateActions?: (input: SimulationInput) => SimulationResult;
  readonly onboardingService?: import('../services/onboarding-service.js').OnboardingService;
  readonly frameworkService?: FrameworkService;
  readonly proxyService?: ProxyService;
  readonly maxRequestsPerHour?: number;
  readonly importDeps?: { readonly evidenceStore?: EvidenceStore; readonly getProjectPath: () => string };
  readonly redteamDeps?: { readonly callLlm: (prompt: string, systemPrompt?: string) => Promise<string>; readonly evidenceStore?: EvidenceStore; readonly auditStore?: AuditStore; readonly getProjectPath: () => string };
  readonly toolManager?: ToolManager;
  readonly evalService?: EvalService;
}

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
  app.route('/', createStatusRoute({ statusService: deps.statusService, llm: deps.llm }));
  app.route('/', createScanRoute({ scanService: deps.scanService, getLastScan: deps.getLastScan }));
  app.route('/', createChatRoute({ chatService: deps.chatService, llm: deps.llm, toolExecutorDeps: deps.toolExecutorDeps, getMode: deps.getMode, setMode: deps.setMode, maxRequestsPerHour: deps.maxRequestsPerHour }));
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
  app.route('/', createWhatIfRoute({
    loadProfile: deps.loadProfile,
    getLastScore: deps.getLastScore,
    getLastScan: deps.getLastScan,
    analyzeScenario: deps.analyzeScenario!,
    generateAllConfigs: deps.generateAllConfigs!,
    simulateActions: deps.simulateActions!,
  }));
  app.route('/', createAgentRoute(deps.passportService));
  app.route('/', createCertRoute({
    passportService: deps.passportService,
    callLlm: deps.callLlm,
    evidenceStore: deps.evidenceStore,
    auditStore: deps.auditStore,
    getProjectPath: deps.getProjectPath,
  }));
  app.route('/', createGuidedOnboardingRoute({
    onboardingService: deps.onboardingService!,
  }));
  app.route('/', createObligationsRoute({ obligations: deps.obligations, getLastScan: deps.getLastScan }));
  app.route('/', createSupplyChainRoute({
    evidenceStore: deps.evidenceStore,
    auditStore: deps.auditStore,
  }));
  app.route('/', createSyncRoute({
    getProjectPath: deps.getProjectPath,
    getLastScan: deps.getLastScan,
    passportService: deps.passportService,
    getAuditEntries: (filter) => deps.passportService.getAuditTrail(filter),
  }));

  // US-S05-27: Cost estimation endpoint
  if (deps.costService) {
    app.route('/', createCostRoute({ costService: deps.costService }));
  }

  // US-S05-22: Compliance debt score endpoint
  if (deps.debtService) {
    app.route('/', createDebtRoute({ debtService: deps.debtService }));
  }

  // E-105/E-106/E-107: Multi-framework scoring
  if (deps.frameworkService) {
    app.route('/', createFrameworksRoute({ frameworkService: deps.frameworkService }));
  }

  // US-S06-01: MCP Compliance Proxy + US-S06-02: Policy Engine
  if (deps.proxyService) {
    app.route('/', createProxyRoute({
      proxyService: deps.proxyService,
      getProjectPath: deps.getProjectPath,
    }));
  }

  // US-S06-14: Multi-jurisdiction data
  app.route('/', createJurisdictionRoute());

  // US-S05-26: SSE events endpoint
  if (deps.events) {
    app.route('/', createEventsRoute({ events: deps.events }));
  }

  // US-S10-05: Promptfoo import endpoint
  if (deps.importDeps) {
    app.route('/', createImportRoute(deps.importDeps));
  }

  // US-S10-04: Red-team endpoint
  if (deps.redteamDeps) {
    app.route('/', createRedteamRoute(deps.redteamDeps));
  }

  // E-115: External tools management
  if (deps.toolManager) {
    app.route('/', createToolsRoute({ toolManager: deps.toolManager }));
  }

  // US-EVAL-29: Eval endpoint
  if (deps.evalService) {
    app.route('/', createEvalRoute({
      evalService: deps.evalService,
    }));
    app.route('/', createAuditRoute({
      evalService: deps.evalService,
      scanService: deps.scanService,
      getProjectPath: deps.getProjectPath,
    }));
  }

  // Health check
  app.get('/health', (c) => c.json({ ok: true }));

  return app;
};
