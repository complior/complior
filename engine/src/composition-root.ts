import type { CoreMessage } from 'ai';
import type { ScanResult, ProjectMemory } from './types/common.types.js';
import type { RegulationData } from './data/regulation-loader.js';
import { loadRegulationData } from './infra/regulation-loader.js';
import { createEventBus } from './infra/event-bus.js';
import { createLlmAdapter } from './infra/llm-adapter.js';
import { createScanner } from './domain/scanner/create-scanner.js';
import { collectFiles } from './domain/scanner/file-collector.js';
import { createScanService } from './services/scan-service.js';
import { createChatService } from './services/chat-service.js';
import { createFileService } from './services/file-service.js';
import { createStatusService } from './services/status-service.js';
import { createRouter } from './http/create-router.js';

export interface ApplicationState {
  readonly regulationData: RegulationData;
  readonly projectPath: string;
  readonly startedAt: number;
  readonly version: string;
  lastScanResult: ScanResult | null;
  projectMemory: ProjectMemory | null;
  conversationHistory: CoreMessage[];
}

export interface Application {
  readonly app: ReturnType<typeof createRouter>;
  readonly state: ApplicationState;
  readonly shutdown: () => void;
}

export const loadApplication = async (): Promise<Application> => {
  // 1. Load regulation data
  const regulationData = await loadRegulationData();
  console.log(`Loaded ${regulationData.obligations.obligations.length} obligations`);

  // 2. Create mutable application state
  const projectPath = process.env['COMPLIOR_PROJECT_PATH'] ?? process.cwd();
  const state: ApplicationState = {
    regulationData,
    projectPath,
    startedAt: Date.now(),
    version: '0.1.0',
    lastScanResult: null,
    projectMemory: null,
    conversationHistory: [],
  };

  // 3. Create infrastructure
  const events = createEventBus();
  const llm = createLlmAdapter();

  // 4. Create domain
  const scanner = createScanner(regulationData.scoring?.scoring);

  // 5. Create services
  const scanService = createScanService({
    scanner,
    collectFiles,
    events,
    getLastScanResult: () => state.lastScanResult,
    setLastScanResult: (result) => { state.lastScanResult = result; },
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

  const statusService = createStatusService({
    getVersion: () => state.version,
    getStartedAt: () => state.startedAt,
    getLastScanResult: () => state.lastScanResult,
  });

  // 6. Create router
  const app = createRouter({
    scanService,
    chatService,
    fileService,
    statusService,
    llm,
    getProjectMemory: () => state.projectMemory,
  });

  const shutdown = (): void => {
    console.log('Application shutdown');
  };

  return { app, state, shutdown };
};
