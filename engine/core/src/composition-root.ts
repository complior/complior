import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CoreMessage } from 'ai';
import type { ScanResult } from './types/common.types.js';
import type { AgentMode } from './llm/tools/types.js';
import type { RegulationData } from './data/regulation-loader.js';
import { loadRegulationData } from './data/regulation-loader.js';
import { createEventBus } from './infra/event-bus.js';
import { createLogger } from './infra/logger.js';
import { createLlmAdapter } from './infra/llm-adapter.js';
import { createScanner } from './domain/scanner/create-scanner.js';
import { createLayer5 } from './domain/scanner/layers/layer5-llm.js';
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
import type { ExternalScanService } from './services/external-scan-service.js';
import { createStatusService } from './services/status-service.js';
import { createPassportService } from './services/passport-service.js';
import { createEvidenceStore } from './domain/scanner/evidence-store.js';
import { loadOrCreateKeyPair as loadEvidenceKeyPair } from './domain/passport/crypto-signer.js';
import { sign, verify as cryptoVerify } from 'node:crypto';
import { createRouter } from './http/create-router.js';
import { createFileWatcher } from './infra/file-watcher.js';
import { createOnboardingWizard } from './onboarding/wizard.js';
import { ENGINE_VERSION } from './version.js';

export interface ApplicationState {
  readonly regulationData: RegulationData;
  readonly projectPath: string;
  readonly startedAt: number;
  readonly version: string;
  /** Mutable fields — modified via event handlers and service callbacks */
  lastScanResult: ScanResult | null;
  conversationHistory: CoreMessage[];
  currentMode: AgentMode;
}

export interface Application {
  readonly app: ReturnType<typeof createRouter>;
  readonly state: ApplicationState;
  readonly shutdown: () => void;
  readonly startWatcher: () => void;
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
    conversationHistory: [],
    currentMode: 'build',
  };

  // 3. Create infrastructure
  const events = createEventBus();
  const llm = createLlmAdapter();

  // 4. Create domain
  const layer5 = createLayer5({
    callLlm: async (prompt: string) => {
      // Use Vercel AI SDK's generateText with routed model
      try {
        const { generateText } = await import('ai');
        const routing = llm.routeModel('classify');
        const model = await llm.getModel(routing.provider, routing.modelId);
        const result = await generateText({ model, prompt });
        return {
          text: result.text,
          inputTokens: (result.usage as Record<string, number>)?.promptTokens ?? 0,
          outputTokens: (result.usage as Record<string, number>)?.completionTokens ?? 0,
        };
      } catch {
        return { text: '{"verdict":"uncertain","confidence":50,"reasoning":"LLM unavailable","evidence":[]}', inputTokens: 0, outputTokens: 0 };
      }
    },
    readFile: async (path: string) => {
      return readFile(path, 'utf-8');
    },
    calculateCost: (_model: string, inputTokens: number, outputTokens: number) =>
      (inputTokens * 0.003 + outputTokens * 0.015) / 1000,
  });
  const scanner = createScanner(regulationData.scoring?.scoring, layer5);

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

  // 5. Create evidence store (C.R20)
  const evidenceKeyPair = await loadEvidenceKeyPair();
  const evidenceStorePath = resolve(state.projectPath, '.complior', 'evidence', 'chain.json');
  const evidenceStore = createEvidenceStore(
    evidenceStorePath,
    (hash: string) => {
      const sig = sign(null, Buffer.from(hash), evidenceKeyPair.privateKey);
      return Buffer.from(sig).toString('base64');
    },
    (hash: string, signature: string) => {
      try {
        const sigBytes = Buffer.from(signature, 'base64');
        return cryptoVerify(null, Buffer.from(hash), evidenceKeyPair.publicKey, sigBytes);
      } catch {
        return false;
      }
    },
  );

  // 5a. Create services
  const scanService = createScanService({
    scanner,
    collectFiles,
    events,
    getLastScanResult: () => state.lastScanResult,
    setLastScanResult: (result) => { state.lastScanResult = result; },
    evidenceStore,
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
    evidenceStore,
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

  let _externalScan: ExternalScanService | null = null;
  const getExternalScanService = async (): Promise<ExternalScanService> => {
    if (!_externalScan) {
      const { createHeadlessBrowser } = await import('./infra/headless-browser.js');
      _externalScan = createExternalScanService({
        browser: createHeadlessBrowser(),
        events,
        getProjectPath: () => state.projectPath,
      });
    }
    return _externalScan;
  };

  const statusService = createStatusService({
    getVersion: () => state.version,
    getMode: () => state.currentMode,
    getStartedAt: () => state.startedAt,
    getLastScanResult: () => state.lastScanResult,
  });

  const passportService = createPassportService({
    collectFiles,
    scanner,
    events,
    getProjectPath: () => state.projectPath,
    getLastScanResult: () => state.lastScanResult,
    loadTemplate,
    evidenceStore,
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
    getExternalScanService,
    statusService,
    passportService,
    llm,
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
    obligations: regulationData.obligations.obligations as readonly Record<string, unknown>[],
    getLastScan: () => state.lastScanResult,
  });

  // 7. Wire Compliance Gate: file.changed → background re-scan
  events.on('file.changed', () => {
    scanService.scan(state.projectPath).then(
      (result) => events.emit('scan.completed', { result }),
      (err: unknown) => log.error('Background re-scan failed:', err),
    );
  });

  // 8. File watcher (US-S0202): start on demand via startWatcher()
  const fileWatcher = createFileWatcher(state.projectPath, events);

  const shutdown = (): void => {
    fileWatcher.stop().catch(() => {});
    if (_externalScan) {
      _externalScan.close().catch(() => {});
    }
    log.info('Application shutdown');
  };

  return { app, state, shutdown, startWatcher: fileWatcher.start };
};
