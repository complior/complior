import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CoreMessage } from 'ai';
import type { ScanResult, ProjectMemory } from './types/common.types.js';
import type { AgentMode } from './llm/tools/types.js';
import type { RegulationData } from './data/regulation-loader.js';
import { loadRegulationData } from './infra/regulation-loader.js';
import { createEventBus } from './infra/event-bus.js';
import { createLogger } from './infra/logger.js';
import { createLlmAdapter } from './infra/llm-adapter.js';
import { createScanner } from './domain/scanner/create-scanner.js';
import { collectFiles } from './domain/scanner/file-collector.js';
import { createFixer } from './domain/fixer/create-fixer.js';
import { createScanService } from './services/scan-service.js';
import { createChatService } from './services/chat-service.js';
import { createFileService } from './services/file-service.js';
import { createFixService } from './services/fix-service.js';
import { createUndoService } from './services/undo-service.js';
import { createBadgeService } from './services/badge-service.js';
import { createShareService } from './services/share-service.js';
import { createReportService } from './services/report-service.js';
import { createExternalScanService } from './services/external-scan-service.js';
import { createHeadlessBrowser } from './infra/headless-browser.js';
import { createStatusService } from './services/status-service.js';
import { createRouter } from './http/create-router.js';
import { createOnboardingWizard } from './onboarding/wizard.js';
import { ENGINE_VERSION } from './version.js';

export interface ApplicationState {
  readonly regulationData: RegulationData;
  readonly projectPath: string;
  readonly startedAt: number;
  readonly version: string;
  /** Mutable fields — modified via event handlers and service callbacks */
  lastScanResult: ScanResult | null;
  projectMemory: ProjectMemory | null;
  conversationHistory: CoreMessage[];
  currentMode: AgentMode;
}

export interface Application {
  readonly app: ReturnType<typeof createRouter>;
  readonly state: ApplicationState;
  readonly shutdown: () => void;
}

export const loadApplication = async (): Promise<Application> => {
  const log = createLogger('app');

  // 1. Load regulation data
  const regulationData = await loadRegulationData();
  log.info(`Loaded ${regulationData.obligations.obligations.length} obligations`);

  // 2. Create mutable application state
  const projectPath = process.env['COMPLIOR_PROJECT_PATH'] ?? process.cwd();
  const state: ApplicationState = {
    regulationData,
    projectPath,
    startedAt: Date.now(),
    version: ENGINE_VERSION,
    lastScanResult: null,
    projectMemory: null,
    conversationHistory: [],
    currentMode: 'build',
  };

  // 3. Create infrastructure
  const events = createEventBus();
  const llm = createLlmAdapter();

  // 4. Create domain
  const scanner = createScanner(regulationData.scoring?.scoring);

  const fixer = createFixer({
    getFramework: () => {
      // Simple framework detection from last scan
      const scan = state.lastScanResult;
      if (!scan) return 'generic';
      const findings = scan.findings.map((f) => f.message).join(' ');
      if (findings.includes('Next.js') || findings.includes('next')) return 'Next.js';
      if (findings.includes('Express')) return 'Express';
      if (findings.includes('React')) return 'React';
      return 'generic';
    },
    getProjectPath: () => state.projectPath,
    getExistingFiles: () => {
      const scan = state.lastScanResult;
      return scan?.findings
        .filter((f): f is typeof f & { file: string } => typeof f.file === 'string')
        .map((f) => f.file) ?? [];
    },
  });

  // 5. Create services
  const scanService = createScanService({
    scanner,
    collectFiles,
    events,
    getLastScanResult: () => state.lastScanResult,
    setLastScanResult: (result) => { state.lastScanResult = result; },
  });

  // Template loader for fixer
  const templatesDir = resolve(
    fileURLToPath(import.meta.url), '..', '..', 'data', 'templates', 'eu-ai-act',
  );
  const loadTemplate = async (templateFile: string): Promise<string> => {
    return readFile(resolve(templatesDir, templateFile), 'utf-8');
  };

  const undoService = createUndoService({
    events,
    scanService,
    getProjectPath: () => state.projectPath,
    getHistoryPath: () => resolve(state.projectPath, '.complior', 'history.json'),
    getLastScanResult: () => state.lastScanResult,
  });

  const fixService = createFixService({
    fixer,
    scanService,
    events,
    getProjectPath: () => state.projectPath,
    getLastScanResult: () => state.lastScanResult,
    loadTemplate,
    undoService,
  });

  const chatService = createChatService({
    getConversationHistory: () => state.conversationHistory,
    appendConversationHistory: (msg) => { state.conversationHistory.push(msg); },
    getProjectPath: () => state.projectPath,
    getVersion: () => state.version,
    getLastScanResult: () => state.lastScanResult,
    getRegulationData: () => state.regulationData,
  });

  const fileService = createFileService({ events });

  const badgeService = createBadgeService({
    events,
    getProjectPath: () => state.projectPath,
    getLastScanResult: () => state.lastScanResult,
    getVersion: () => state.version,
  });

  const shareService = createShareService({
    events,
    getProjectPath: () => state.projectPath,
    getLastScanResult: () => state.lastScanResult,
    getVersion: () => state.version,
  });

  const reportService = createReportService({
    events,
    getProjectPath: () => state.projectPath,
    getLastScanResult: () => state.lastScanResult,
    getVersion: () => state.version,
  });

  const browser = createHeadlessBrowser();
  const externalScanService = createExternalScanService({
    browser,
    events,
    getProjectPath: () => state.projectPath,
  });

  const statusService = createStatusService({
    getVersion: () => state.version,
    getMode: () => state.currentMode,
    getStartedAt: () => state.startedAt,
    getLastScanResult: () => state.lastScanResult,
  });

  // 5b. Create onboarding wizard
  const onboardingWizard = createOnboardingWizard({
    getProjectPath: () => state.projectPath,
  });

  // 6. Create router
  const app = createRouter({
    scanService,
    chatService,
    fileService,
    fixService,
    undoService,
    badgeService,
    shareService,
    reportService,
    externalScanService,
    statusService,
    llm,
    getProjectMemory: () => state.projectMemory,
    getMode: () => state.currentMode,
    setMode: (mode) => { state.currentMode = mode; },
    toolExecutorDeps: {
      getScoringData: () => state.regulationData.scoring?.scoring,
      setLastScanResult: (result) => { state.lastScanResult = result; },
    },
    onboardingWizard,
    getVersion: () => state.version,
    loadProfile: () => onboardingWizard.loadProfile(),
    getLastScore: () => state.lastScanResult?.score ?? null,
  });

  // 7. Wire Compliance Gate: file.changed → background re-scan
  events.on('file.changed', () => {
    scanService.scan(state.projectPath).then(
      (result) => events.emit('scan.completed', { result }),
      (err: unknown) => log.error('Background re-scan failed:', err),
    );
  });

  const shutdown = (): void => {
    externalScanService.close().catch(() => {});
    log.info('Application shutdown');
  };

  return { app, state, shutdown };
};
