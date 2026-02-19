import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScanResult } from '../types/common.types.js';
import { loadRegulationData } from '../infra/regulation-loader.js';
import { createLogger } from '../infra/logger.js';
import { createEventBus } from '../infra/event-bus.js';
import { createScanner } from '../domain/scanner/create-scanner.js';
import { collectFiles } from '../domain/scanner/file-collector.js';
import { createFixer } from '../domain/fixer/create-fixer.js';
import { createScanService } from '../services/scan-service.js';
import { createFixService } from '../services/fix-service.js';
import { createMcpHandlers } from './handlers.js';
import { createMcpServer } from './server.js';

const main = async (): Promise<void> => {
  const regulationData = await loadRegulationData();
  const projectPath = process.env['COMPLIOR_PROJECT_PATH'] ?? process.cwd();
  const version = '0.1.0';

  let lastScanResult: ScanResult | null = null;

  const events = createEventBus();
  const scanner = createScanner(regulationData.scoring?.scoring);

  const fixer = createFixer({
    getFramework: () => {
      if (!lastScanResult) return 'generic';
      const text = lastScanResult.findings.map((f) => f.message).join(' ');
      if (text.includes('Next.js') || text.includes('next')) return 'Next.js';
      if (text.includes('Express')) return 'Express';
      if (text.includes('React')) return 'React';
      return 'generic';
    },
    getProjectPath: () => projectPath,
    getExistingFiles: () =>
      lastScanResult?.findings.filter((f): f is typeof f & { file: string } => typeof f.file === 'string').map((f) => f.file) ?? [],
  });

  const scanService = createScanService({
    scanner,
    collectFiles,
    events,
    getLastScanResult: () => lastScanResult,
    setLastScanResult: (result) => { lastScanResult = result; },
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
    getLastScanResult: () => lastScanResult,
    loadTemplate,
  });

  const handlers = createMcpHandlers({
    scanService,
    fixService,
    getProjectPath: () => projectPath,
    getLastScanResult: () => lastScanResult,
    getRegulationData: () => regulationData,
    version,
  });

  const mcpServer = createMcpServer({ handlers, version });
  await mcpServer.start();
};

const log = createLogger('mcp');
main().catch((err: unknown) => {
  log.error('Complior MCP Server failed to start:', err);
  process.exit(1);
});
