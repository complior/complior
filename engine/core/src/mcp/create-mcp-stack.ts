import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScanResult } from '../types/common.types.js';
import type { RegulationData } from '../data/regulation/regulation-loader.js';
import { createEventBus } from '../infra/event-bus.js';
import { createScanner } from '../domain/scanner/create-scanner.js';
import { collectFiles } from '../infra/file-collector.js';
import { createFixer } from '../domain/fixer/create-fixer.js';
import { createScanService } from '../services/scan-service.js';
import { createFixService } from '../services/fix-service.js';
import { createMcpHandlers } from './handlers.js';
import { createMcpServer } from './server.js';

export interface McpStackDeps {
  readonly regulationData: RegulationData;
  readonly projectPath: string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly setLastScanResult: (r: ScanResult | null) => void;
  readonly version: string;
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
  });

  const mcpServer = createMcpServer({ handlers, version });

  return Object.freeze({ mcpServer, scanService, fixService });
};
