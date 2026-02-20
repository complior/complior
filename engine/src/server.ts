import { serve } from '@hono/node-server';
import { loadApplication } from './composition-root.js';
import { createLogger } from './infra/logger.js';
import { ENGINE_VERSION } from './version.js';

const log = createLogger('server');
const PORT = Number(process.env['PORT'] ?? 3099);
const isMcpMode = process.argv.includes('mcp-server');

const startHttp = async (): Promise<void> => {
  log.info('Loading regulation data...');
  const { app } = await loadApplication();

  const server = serve({ fetch: app.fetch, port: PORT }, () => {
    log.info(`Complior Engine v${ENGINE_VERSION} running on http://127.0.0.1:${PORT}`);
  });

  const shutdown = (): void => {
    log.info('Graceful shutdown...');
    server.close(() => {
      log.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

const startMcp = async (): Promise<void> => {
  const { state } = await loadApplication();

  const { createMcpHandlers } = await import('./mcp/handlers.js');
  const { createMcpServer } = await import('./mcp/server.js');
  const { createScanService } = await import('./services/scan-service.js');
  const { createScanner } = await import('./domain/scanner/create-scanner.js');
  const { collectFiles } = await import('./domain/scanner/file-collector.js');
  const { createEventBus } = await import('./infra/event-bus.js');
  const { createFixer } = await import('./domain/fixer/create-fixer.js');
  const { createFixService } = await import('./services/fix-service.js');
  const { readFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  const events = createEventBus();
  const scanner = createScanner(state.regulationData.scoring?.scoring);
  const scanService = createScanService({
    scanner,
    collectFiles,
    events,
    getLastScanResult: () => state.lastScanResult,
    setLastScanResult: (r) => { state.lastScanResult = r; },
  });

  const fixer = createFixer({
    getFramework: () => 'generic',
    getProjectPath: () => state.projectPath,
    getExistingFiles: () => [],
  });

  const templatesDir = resolve(
    fileURLToPath(import.meta.url), '..', '..', 'data', 'templates', 'eu-ai-act',
  );

  const fixService = createFixService({
    fixer,
    scanService,
    events,
    getProjectPath: () => state.projectPath,
    getLastScanResult: () => state.lastScanResult,
    loadTemplate: (f) => readFile(resolve(templatesDir, f), 'utf-8'),
  });

  const handlers = createMcpHandlers({
    scanService,
    fixService,
    getProjectPath: () => state.projectPath,
    getLastScanResult: () => state.lastScanResult,
    getRegulationData: () => state.regulationData,
    version: state.version,
  });

  const mcp = createMcpServer({ handlers, version: state.version });
  await mcp.start();
};

const main = isMcpMode ? startMcp : startHttp;
main().catch((err: unknown) => {
  log.error(`Failed to start engine${isMcpMode ? ' (MCP mode)' : ''}:`, err);
  process.exit(1);
});
