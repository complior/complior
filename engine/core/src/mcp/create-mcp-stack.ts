import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScanResult } from '../types/common.types.js';
import type { RegulationData } from '../data/regulation/regulation-loader.js';
import type { PassportService } from '../services/passport-service.js';
import type { EvalService } from '../services/eval-service.js';
import type { EvidenceStore } from '../domain/scanner/evidence-store.js';
import { createEventBus } from '../infra/event-bus.js';
import { createScanner } from '../domain/scanner/create-scanner.js';
import { collectFiles } from '../infra/file-collector.js';
import { createFixer } from '../domain/fixer/create-fixer.js';
import { createScanService } from '../services/scan-service.js';
import { createFixService } from '../services/fix-service.js';
import { createMcpHandlers } from './handlers.js';
import { createMcpServer } from './server.js';

/**
 * Dependencies required to build the MCP stack.
 *
 * v1.0 (S05): only scan + fix services were wired through here (the other tools were
 * pure functions over `regulationData`). V2-M02 adds builder + analytics tools that
 * delegate to existing services rather than reimplementing logic — so we accept those
 * services as injected dependencies (DI via closure, no global state, no mutation).
 *
 * All optional services are *optional* on purpose — a thin MCP setup (no passport, no
 * eval, no evidence store) still works for the legacy 7 tools; missing services cause
 * the corresponding new tools to return a graceful error rather than throw.
 */
export interface McpStackDeps {
  readonly regulationData: RegulationData;
  readonly projectPath: string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly setLastScanResult: (r: ScanResult) => void;
  readonly version: string;
  /** V2-M02: passport_init + doc_generate. */
  readonly passportService?: PassportService;
  /** V2-M02: redteam. */
  readonly evalService?: EvalService;
  /** V2-M02: evidence_verify. */
  readonly evidenceStore?: EvidenceStore;
  /** V2-M02: drift_detect — returns the previous scan result (one step back). */
  readonly getPreviousScanResult?: () => ScanResult | null;
}

export const createMcpStack = async (deps: McpStackDeps) => {
  const { regulationData, projectPath, version } = deps;

  const events = createEventBus();
  const scanner = createScanner(regulationData.scoring?.scoring);

  const fixer = createFixer({
    getFramework: () => {
      const lastScan = deps.getLastScanResult();
      if (!lastScan) return 'generic';
      const text = lastScan.findings.map((f) => f.message).join(' ');
      if (text.includes('Next.js') || text.includes('next')) return 'Next.js';
      if (text.includes('Express')) return 'Express';
      if (text.includes('React')) return 'React';
      return 'generic';
    },
    getProjectPath: () => projectPath,
    getExistingFiles: () =>
      deps.getLastScanResult()?.findings
        .filter((f): f is typeof f & { file: string } => typeof f.file === 'string')
        .map((f) => f.file) ?? [],
  });

  const scanService = createScanService({
    scanner,
    collectFiles,
    events,
    getLastScanResult: deps.getLastScanResult,
    setLastScanResult: deps.setLastScanResult,
  });

  const templatesDir = resolve(
    fileURLToPath(import.meta.url), '..', '..', '..', 'data', 'templates', 'eu-ai-act',
  );
  const loadTemplate = async (templateFile: string): Promise<string> => {
    return readFile(resolve(templatesDir, templateFile), 'utf-8');
  };

  const fixService = createFixService({
    fixer,
    scanService,
    events,
    getProjectPath: () => projectPath,
    getLastScanResult: deps.getLastScanResult,
    loadTemplate,
  });

  const handlers = createMcpHandlers({
    scanService,
    fixService,
    getProjectPath: () => projectPath,
    getLastScanResult: deps.getLastScanResult,
    getRegulationData: () => regulationData,
    version,
    passportService: deps.passportService,
    evalService: deps.evalService,
    evidenceStore: deps.evidenceStore,
    getPreviousScanResult: deps.getPreviousScanResult,
  });

  const mcpServer = createMcpServer({ handlers, version });

  return Object.freeze({ mcpServer, scanService, fixService });
};
