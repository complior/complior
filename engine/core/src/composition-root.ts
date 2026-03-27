import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CoreMessage } from 'ai';
import type { ScanResult } from './types/common.types.js';
import { parseScanResult } from './types/common.schemas.js';
import type { AgentMode } from './llm/tools/types.js';
import type { RegulationData } from './data/regulation/regulation-loader.js';
import { loadRegulationData } from './data/regulation/regulation-loader.js';
import { createEventBus } from './infra/event-bus.js';
import { createLogger } from './infra/logger.js';
import { createLlmAdapter } from './infra/llm-adapter.js';
import { createScanner } from './domain/scanner/create-scanner.js';
import { createLayer5 } from './domain/scanner/layers/layer5-llm.js';
import { collectFiles } from './infra/file-collector.js';
import { createGitHistoryAdapter } from './infra/git-history-adapter.js';
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
import { createCostService } from './services/cost-service.js';
import { createOnboardingService } from './services/onboarding-service.js';
import { createDebtService } from './services/debt-service.js';
import { createFrameworkService } from './services/framework-service.js';
import { createProxyService } from './services/proxy-service.js';
import { createEvalService } from './services/eval-service.js';
import { buildPassportEvalBlock } from './domain/eval/eval-passport.js';
import type { EvalResult } from './domain/eval/types.js';
import { ProxyPolicySchema } from './domain/proxy/policy-engine.js';
import { createFrameworkRegistry, createEuAiActFramework, scoreEuAiAct, createAiuc1Framework, scoreAiuc1, createOwaspLlmFramework, scoreOwaspLlm, createMitreAtlasFramework, scoreMitreAtlas } from './domain/frameworks/index.js';
import { loadProjectConfig, getSelectedFrameworks } from './infra/project-config.js';
import { createEvidenceStore } from './domain/scanner/evidence-store.js';
import { createAuditStore } from './domain/audit/index.js';
import { loadOrCreateKeyPair as loadEvidenceKeyPair, signPassport } from './domain/passport/crypto-signer.js';
import { parsePassport } from './types/passport-schemas.js';
import { sign, verify as cryptoVerify } from 'node:crypto';
import { createRouter } from './http/create-router.js';
import { createToolManager, DEFAULT_TOOLS_DIR, type ProcessRunner } from './infra/tool-manager.js';
import {
  createSemgrepRunner,
  createBanditRunner,
  createModelScanRunner,
  createDetectSecretsRunner,
} from './domain/scanner/external/index.js';
import type { ExternalRunners } from './domain/scanner/external/runner-port.js';
import { createFileWatcher } from './infra/file-watcher.js';
import { createScanCache } from './domain/scanner/scan-cache.js';
import { createFileCacheStorage } from './infra/cache-storage.js';
import { createOnboardingWizard } from './onboarding/wizard.js';
import { ENGINE_VERSION } from './version.js';
import { DEFAULT_INPUT_COST_PER_1K, DEFAULT_OUTPUT_COST_PER_1K } from './domain/shared/compliance-constants.js';
import { analyzeScenario } from './domain/whatif/scenario-engine.js';
import { generateAllConfigs } from './domain/whatif/config-fixer.js';
import { simulateActions } from './domain/whatif/simulate-actions.js';
import { compareSeverity } from './types/common.types.js';
import { autoDetect } from './onboarding/auto-detect.js';
import { createInitialState as createOnboardingInitialState } from './domain/onboarding/guided-onboarding.js';
import { complior } from '@complior/sdk';

export interface ApplicationState {
  readonly regulationData: RegulationData;
  projectPath: string;
  readonly startedAt: number;
  readonly version: string;
  /** Mutable fields — modified via event handlers and service callbacks */
  lastScanResult: ScanResult | null;
  conversationHistory: CoreMessage[];
  currentMode: AgentMode;
  /** Per-agent last-known scores for delta tracking (agent.score.updated events). */
  agentScores: Map<string, number>;
}

export interface Application {
  readonly app: ReturnType<typeof createRouter>;
  readonly state: ApplicationState;
  readonly shutdown: () => void;
  readonly startWatcher: () => void;
  /** Set last scan result (in-memory + persisted to disk). */
  readonly setLastScanResult: (result: ScanResult) => void;
}

export const loadApplication = async (): Promise<Application> => {
  const log = createLogger('app');

  // 1. Load regulation data
  const regulationData = await loadRegulationData();
  log.info(`Loaded ${regulationData.obligations.obligations.length} obligations`);

  // 2. Create mutable application state
  const projectPath = process.env['COMPLIOR_PROJECT_PATH'] ?? process.cwd();
  const lastScanPath = resolve(projectPath, '.complior', 'last-scan.json');

  // Load persisted scan result from previous session
  let persistedScan: ScanResult | null = null;
  try {
    const raw = await readFile(lastScanPath, 'utf-8');
    persistedScan = parseScanResult(raw);
    log.info('Loaded persisted scan result from disk');
  } catch { /* no previous scan — expected on first run */ }

  const state: ApplicationState = {
    regulationData,
    projectPath,
    startedAt: Date.now(),
    version: ENGINE_VERSION,
    lastScanResult: persistedScan,
    conversationHistory: [],
    currentMode: 'build',
    agentScores: new Map<string, number>(),
  };

  /** Persist scan result to disk (fire-and-forget). */
  const persistScanResult = (result: ScanResult): void => {
    const dir = resolve(state.projectPath, '.complior');
    const scanPath = resolve(state.projectPath, '.complior', 'last-scan.json');
    mkdir(dir, { recursive: true })
      .then(() => writeFile(scanPath, JSON.stringify(result), 'utf-8'))
      .catch((err: unknown) => { log.warn('Failed to persist scan result:', err); });
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
        const result = await complior(generateText)({ model, prompt });
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
      (inputTokens * DEFAULT_INPUT_COST_PER_1K + outputTokens * DEFAULT_OUTPUT_COST_PER_1K) / 1000,
  });
  const gitHistory = createGitHistoryAdapter();

  // E-115: External tool manager (uv-based, for Tier 2 scans)
  const toolManager = createToolManager();
  const externalRunners: ExternalRunners = {
    semgrep: createSemgrepRunner(),
    bandit: createBanditRunner(),
    modelscan: createModelScanRunner(),
    detectSecrets: createDetectSecretsRunner(),
  };

  // Process runner for Tier 2: wraps commands via `uv tool run` so
  // uv-installed tools (semgrep, bandit, etc.) are found correctly.
  const { execFile: nodeExecFile } = await import('node:child_process');
  const uvAvailable = await toolManager.isUvAvailable();
  const tier2RunProcess: ProcessRunner = (cmd, args, options) => {
    const actualCmd = uvAvailable ? 'uv' : cmd;
    const actualArgs = uvAvailable ? ['tool', 'run', cmd, ...args] : [...args];
    return new Promise((resolve) => {
      nodeExecFile(actualCmd, actualArgs, {
        timeout: options?.timeout ?? 60_000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, UV_TOOL_DIR: DEFAULT_TOOLS_DIR },
        cwd: options?.cwd,
      }, (error, stdout, stderr) => {
        resolve({
          stdout: stdout ?? '',
          stderr: stderr ?? '',
          exitCode: error ? (error as NodeJS.ErrnoException).code === 'ENOENT' ? 127 : 1 : 0,
        });
      });
    });
  };

  // E-11: Incremental scan cache (per-file SHA-256 + mtime, persisted to .complior/cache/)
  const cacheStorage = createFileCacheStorage(projectPath);
  const scanCache = createScanCache(cacheStorage);

  const scanner = createScanner(regulationData.scoring?.scoring, layer5, gitHistory, externalRunners, tier2RunProcess);

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

  // 5. Create evidence + audit stores (shared key pair)
  const evidenceKeyPair = await loadEvidenceKeyPair();
  const signHash = (hash: string): string => {
    const sig = sign(null, Buffer.from(hash), evidenceKeyPair.privateKey);
    return Buffer.from(sig).toString('base64');
  };
  const verifyHash = (hash: string, signature: string): boolean => {
    try {
      const sigBytes = Buffer.from(signature, 'base64');
      return cryptoVerify(null, Buffer.from(hash), evidenceKeyPair.publicKey, sigBytes);
    } catch {
      return false;
    }
  };

  const evidenceStorePath = resolve(state.projectPath, '.complior', 'evidence', 'chain.json');
  const evidenceStore = createEvidenceStore(evidenceStorePath, signHash, verifyHash);

  const auditTrailPath = resolve(state.projectPath, '.complior', 'audit', 'trail.jsonl');
  const auditStore = createAuditStore(auditTrailPath, signHash, (line, err) => {
    log.warn(`Malformed audit trail line: ${String(err)} — ${line.slice(0, 80)}`);
  });

  // 5a. Create services
  // Lazy passport service ref for scan enrichment (passportService created later)
  const lazyScanPassport = {
    listPassports: (path?: string) => passportService.listPassports(path),
  };

  // Lazy role loader — reads profile.json at scan time (wizard created later)
  let lazyWizard: import('./onboarding/wizard.js').OnboardingWizard | null = null;
  const getProjectRole = async (_projectPath: string): Promise<import('./types/common.types.js').Role> => {
    try {
      const profile = await lazyWizard?.loadProfile();
      const role = profile?.organization?.role;
      if (role === 'provider' || role === 'deployer' || role === 'both') return role;
    } catch { /* profile missing or invalid */ }
    return 'both';
  };

  const scanService = createScanService({
    scanner,
    collectFiles,
    events,
    getLastScanResult: () => state.lastScanResult,
    setLastScanResult: (result) => { state.lastScanResult = result; persistScanResult(result); },
    evidenceStore,
    auditStore,
    scanCache,
    passportService: lazyScanPassport,
    getProjectRole,
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

  // Lazy passport service ref (passportService created later, avoid init-order issue)
  const lazyPassportService = {
    listPassports: (path?: string) => passportService.listPassports(path),
  };

  const fixService = createFixService({
    fixer,
    scanService,
    events,
    getProjectPath: () => state.projectPath,
    getLastScanResult: () => state.lastScanResult,
    loadTemplate,
    undoService,
    evidenceStore,
    passportService: lazyPassportService,
    llm,
  });

  const chatService = createChatService({
    getConversationHistory: () => state.conversationHistory,
    appendConversationHistory: (msg) => { state.conversationHistory.push(msg); },
    getProjectPath: () => state.projectPath,
    getVersion: () => state.version,
    getLastScanResult: () => state.lastScanResult,
    getRegulationData: () => state.regulationData,
    getPassportSummary: async () => {
      try {
        const passports = await passportService.listPassports(projectPath);
        const p = passports[0];
        if (!p) return null;
        const completeness = await passportService.getPassportCompleteness(p.name, projectPath);
        return {
          name: p.name,
          type: p.type,
          riskClass: p.compliance?.eu_ai_act?.risk_class ?? 'unknown',
          autonomyLevel: p.autonomy_level ?? 'unknown',
          completeness: completeness?.score ?? 0,
        };
      } catch {
        return null;
      }
    },
    getChatHistoryPath: () => resolve(projectPath, '.complior', 'chat-history.json'),
  });

  // Restore chat history from disk
  chatService.loadHistory().catch(() => {});

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

  // Policy template loader
  const policyTemplatesDir = resolve(
    fileURLToPath(import.meta.url), '..', '..', 'data', 'templates', 'policies',
  );
  const loadPolicyTemplate = async (templateFile: string): Promise<string> => {
    return readFile(resolve(policyTemplatesDir, templateFile), 'utf-8');
  };

  const passportService = createPassportService({
    collectFiles,
    scanner,
    events,
    getProjectPath: () => state.projectPath,
    getLastScanResult: () => state.lastScanResult,
    loadTemplate,
    loadPolicyTemplate,
    evidenceStore,
    auditStore,
  });

  // Shared helper: passport completeness lookup (used by cost + debt services)
  const getPassportCompletenessData = async (name?: string) => {
    try {
      const passports = await passportService.listPassports(projectPath);
      const passport = name
        ? passports.find((p) => p.name === name)
        : passports[0];
      if (!passport) return { score: 0, friaCompleted: false };
      const completeness = await passportService.getPassportCompleteness(
        passport.name,
        projectPath,
      );
      return {
        score: completeness?.score ?? 0,
        friaCompleted: passport.compliance?.fria_completed ?? false,
      };
    } catch {
      return { score: 0, friaCompleted: false };
    }
  };

  // 5a.2. Create cost service (US-S05-27)
  const costService = createCostService({
    getLastScanResult: () => state.lastScanResult,
    getPassportCompleteness: getPassportCompletenessData,
    getEvidenceValid: async () => {
      try {
        const result = await evidenceStore.verify();
        return result.valid;
      } catch {
        return false;
      }
    },
  });

  // 5a.3. Create debt service (US-S05-22)
  const debtService = createDebtService({
    getLastScanResult: () => state.lastScanResult,
    getPassportCompleteness: async () => (await getPassportCompletenessData()).score,
    getEvidenceFreshness: async () => {
      try {
        const summary = await evidenceStore.getSummary();
        if (summary.totalEntries === 0 || !summary.lastEntry) return 30;
        return Math.max(0, (Date.now() - new Date(summary.lastEntry).getTime()) / (1000 * 60 * 60 * 24));
      } catch {
        return 30;
      }
    },
  });

  // 5a.4. Framework scoring (E-105, E-106, E-107)
  const projectConfig = await loadProjectConfig(projectPath);
  const frameworkRegistry = createFrameworkRegistry();

  frameworkRegistry.register(
    createEuAiActFramework(regulationData.scoring?.scoring),
    scoreEuAiAct,
  );
  frameworkRegistry.register(createAiuc1Framework(), scoreAiuc1);
  frameworkRegistry.register(createOwaspLlmFramework(), scoreOwaspLlm);
  frameworkRegistry.register(createMitreAtlasFramework(), scoreMitreAtlas);

  const frameworkService = createFrameworkService({
    registry: frameworkRegistry,
    getSelectedFrameworks: () => getSelectedFrameworks(projectConfig),
    foundationDeps: {
      getLastScanResult: () => state.lastScanResult,
      getPassport: async () => {
        const passports = await passportService.listPassports(projectPath);
        return passports[0] ?? null;
      },
      getPassportCompleteness: async () => (await getPassportCompletenessData()).score,
      getEvidenceSummary: () => evidenceStore.getSummary(),
      getDocuments: async () => {
        const { friaCompleted } = await getPassportCompletenessData();
        const docs = new Set<string>();
        if (friaCompleted) docs.add('fria');
        return docs;
      },
    },
  });

  // 5a.5. Create MCP compliance proxy service (US-S06-01) + policy engine (US-S06-02)
  const proxyService = createProxyService({
    loadPolicy: async (projectPath: string) => {
      try {
        const policyPath = resolve(projectPath, '.complior', 'proxy-policy.json');
        const raw = await readFile(policyPath, 'utf-8');
        const parsed = ProxyPolicySchema.safeParse(JSON.parse(raw));
        if (parsed.success) return parsed.data;
        return null;
      } catch {
        return null;
      }
    },
  });

  // 5b. Create onboarding wizard
  const onboardingWizard = createOnboardingWizard({
    getProjectPath: () => state.projectPath,
  });
  lazyWizard = onboardingWizard; // Wire lazy ref for scan-service role filtering

  // 5b.2 Create guided onboarding service (US-S05-33)
  const onboardingService = createOnboardingService({
    getProjectPath: () => state.projectPath,
    loadState: async (pp: string) => {
      try {
        const raw = await readFile(resolve(pp, '.complior', 'onboarding-progress.json'), 'utf-8');
        const data = JSON.parse(raw) as Record<string, unknown>;
        // Basic shape validation: must have steps array and status
        if (Array.isArray(data.steps) && typeof data.status === 'string') {
          return data as unknown as import('./domain/onboarding/guided-onboarding.js').GuidedOnboardingState;
        }
        return createOnboardingInitialState();
      } catch {
        return createOnboardingInitialState();
      }
    },
    saveState: async (pp: string, s) => {
      const dir = resolve(pp, '.complior');
      await mkdir(dir, { recursive: true });
      await writeFile(resolve(dir, 'onboarding-progress.json'), JSON.stringify(s, null, 2));
    },
    executeStep: async (stepNum: number, pp: string) => {
      switch (stepNum) {
        case 1: {
          const detection = await autoDetect(pp);
          return { ...detection };
        }
        case 2: {
          const scanResult = await scanService.scan(pp);
          const topFindings = scanResult.findings
            .filter((f) => f.type === 'fail')
            .sort((a, b) => compareSeverity(a.severity, b.severity))
            .slice(0, 5);
          return {
            score: scanResult.score.totalScore,
            filesScanned: scanResult.filesScanned,
            totalFindings: scanResult.findings.filter((f) => f.type === 'fail').length,
            topFindings: topFindings.map((f) => ({
              checkId: f.checkId,
              message: f.message,
              severity: f.severity,
            })),
          };
        }
        case 3: {
          const result = await passportService.initPassport(pp);
          return {
            agentsFound: result.manifests.length,
            agents: result.manifests.map((m) => ({
              name: m.name,
              type: m.type,
              autonomyLevel: m.autonomy_level,
            })),
            savedPaths: result.savedPaths,
            skipped: result.skipped,
          };
        }
        case 4: {
          const scanResult = state.lastScanResult;
          if (!scanResult) {
            return { fixes: [], message: 'No scan result available. Run step 2 first.' };
          }
          const fixSuggestions = scanResult.findings
            .filter((f) => f.type === 'fail' && f.fixDiff)
            .sort((a, b) => compareSeverity(a.severity, b.severity))
            .slice(0, 3)
            .map((f) => ({
              checkId: f.checkId,
              message: f.message,
              severity: f.severity,
              file: f.file,
              fix: f.fix,
            }));
          return {
            fixes: fixSuggestions,
            totalFixable: scanResult.findings.filter((f) => f.type === 'fail' && f.fixDiff).length,
          };
        }
        case 5: {
          const passports = await passportService.listPassports(pp);
          const highRisk = passports.find(
            (p) => p.compliance.eu_ai_act.risk_class === 'high',
          );
          if (highRisk) {
            const fria = await passportService.generateFriaReport(highRisk.name, pp);
            return {
              documentType: 'fria',
              agentName: highRisk.name,
              savedPath: fria?.savedPath ?? null,
            };
          }
          return {
            documentType: 'none',
            message: 'No high-risk agents found. FRIA not required.',
            suggestion: 'You can generate a compliance report with: complior report',
          };
        }
        default:
          return {};
      }
    },
  });

  // 5c. Create callLlm closure for adversarial testing (same pattern as L5)
  const callLlm = async (prompt: string, systemPrompt?: string): Promise<string> => {
    try {
      const { generateText } = await import('ai');
      const routing = llm.routeModel('classify');
      const model = await llm.getModel(routing.provider, routing.modelId);
      const result = await complior(generateText)({ model, prompt, system: systemPrompt });
      return result.text;
    } catch {
      return '[ERROR] LLM unavailable';
    }
  };

  // 5d. Create evalService (US-REM-04: auto-sync eval → passport)
  const updatePassportEval = async (result: EvalResult): Promise<void> => {
    // Skip passport sync if no agent specified
    if (!result.agent) return;

    const block = buildPassportEvalBlock(result);
    const manifestPath = resolve(state.projectPath, '.complior', 'agents', `${result.agent}-manifest.json`);

    try {
      const raw = await readFile(manifestPath, 'utf-8');
      const currentPassport = parsePassport(raw);
      if (!currentPassport) return; // invalid passport — skip

      const compliance = (currentPassport.compliance ?? {}) as Record<string, unknown>;
      const prevEval = compliance.eval as Record<string, unknown> | undefined;

      // Merge strategy: preserve previous security_score if new eval doesn't include one
      const mergedBlock = { ...block } as Record<string, unknown>;
      if (!block.eval_security_score && prevEval?.eval_security_score) {
        mergedBlock.eval_security_score = prevEval.eval_security_score;
        mergedBlock.eval_security_grade = prevEval.eval_security_grade;
      }

      const updated = {
        ...currentPassport,
        compliance: { ...compliance, eval: mergedBlock },
        updated: new Date().toISOString(),
      };

      // Ed25519 re-sign
      const keyPair = await loadEvidenceKeyPair();
      const signature = signPassport(updated as never, keyPair.privateKey);
      const signed = { ...updated, signature };

      await writeFile(manifestPath, JSON.stringify(signed, null, 2));
    } catch { /* non-fatal — passport file may not exist */ }
  };

  const evalService = createEvalService({
    getProjectPath: () => state.projectPath,
    callLlm,
    evidenceStore,
    auditStore,
    updatePassportEval,
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
    costService,
    debtService,
    llm,
    getMode: () => state.currentMode,
    setMode: (mode) => { state.currentMode = mode; },
    toolExecutorDeps: {
      getScoringData: () => state.regulationData.scoring?.scoring,
      setLastScanResult: (result) => { state.lastScanResult = result; persistScanResult(result); },
    },
    onboardingWizard,
    getVersion: () => state.version,
    loadProfile: () => onboardingWizard.loadProfile(),
    getLastScore: () => state.lastScanResult?.score ?? null,
    obligations: regulationData.obligations.obligations as readonly Record<string, unknown>[],
    getLastScan: () => state.lastScanResult,
    getProjectPath: () => state.projectPath,
    callLlm,
    evidenceStore,
    auditStore,
    events,
    analyzeScenario,
    generateAllConfigs,
    simulateActions,
    onboardingService,
    frameworkService,
    proxyService,
    maxRequestsPerHour: projectConfig.llm?.maxRequestsPerHour,
    importDeps: {
      evidenceStore,
      getProjectPath: () => state.projectPath,
    },
    redteamDeps: {
      callLlm,
      evidenceStore,
      auditStore,
      getProjectPath: () => state.projectPath,
    },
    toolManager,
    evalService,
  });

  // 6b. Wire scan.completed → auto-discover new agents + update passport scores
  events.on('scan.completed', ({ result }: { result: ScanResult }) => {
    // 1. Auto-discover new agents (idempotent — skips existing)
    passportService.initPassport()
      .catch(() => ({ manifests: [], savedPaths: [], skipped: [] }))
      .then(({ manifests }) => {
        if (manifests.length > 0) {
          log.info(`Auto-discovered ${manifests.length} new agent(s)`);
        }
        // 2. Update scores on ALL passports (including just-created)
        return passportService.updatePassportsAfterScan(result);
      })
      .catch((err: unknown) => { log.warn('Failed to update passports after scan:', err); });
  });

  // 7. Wire Compliance Gate: file.changed → background re-scan + per-agent events
  const fileChangedHandler = ({ path: changedPath }: { path: string }) => {
    scanService.scan(state.projectPath).then(
      async (result) => {
        events.emit('scan.completed', { result });

        // Delegate file→agent matching to passport service (Clean Architecture)
        const matched = await passportService.findAgentsForFile(changedPath);
        for (const { name } of matched) {
          const beforeScore = state.agentScores.get(name) ?? 0;
          const afterScore = result.score.totalScore;
          state.agentScores.set(name, afterScore);
          events.emit('agent.scan.completed', { agentName: name, result });
          events.emit('agent.score.updated', { agentName: name, before: beforeScore, after: afterScore });
        }
      },
      (err: unknown) => log.error('Background re-scan failed:', err),
    );
  };
  events.on('file.changed', fileChangedHandler);

  // Track scanned project path so fix-service resolves files correctly
  events.on('scan.started', ({ projectPath: scanPath }: { projectPath: string }) => {
    if (scanPath !== state.projectPath) {
      state.projectPath = scanPath;
    }
  });

  // 8. File watcher (US-S0202): start on demand via startWatcher()
  const fileWatcher = createFileWatcher(state.projectPath, events);

  const shutdown = (): void => {
    events.off('file.changed', fileChangedHandler);
    fileWatcher.stop().catch(() => {});
    if (_externalScan) {
      _externalScan.close().catch(() => {});
    }
    log.info('Application shutdown');
  };

  const setScanResult = (result: ScanResult): void => {
    state.lastScanResult = result;
    persistScanResult(result);
  };

  return { app, state, shutdown, startWatcher: fileWatcher.start, setLastScanResult: setScanResult };
};
