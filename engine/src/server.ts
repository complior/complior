import { serve } from '@hono/node-server';
import { loadApplication } from './composition-root.js';

// Also initialize old context for backward compatibility during migration
import { initEngineContext } from './context.js';

const PORT = Number(process.env['PORT'] ?? 3099);
const isMcpMode = process.argv.includes('mcp-server');

const startHttp = async (): Promise<void> => {
  console.log('Loading regulation data...');
  const { app, state } = await loadApplication();

  // Keep old context in sync for any remaining legacy consumers
  initEngineContext(state.regulationData, state.projectPath);

  const server = serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`Complior Engine v0.1.0 running on http://127.0.0.1:${PORT}`);
  });

  const shutdown = (): void => {
    console.log('\nGraceful shutdown...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

const startMcp = async (): Promise<void> => {
  const { state } = await loadApplication();
  initEngineContext(state.regulationData, state.projectPath);

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
main().catch((err) => {
  console.error(`Failed to start engine${isMcpMode ? ' (MCP mode)' : ''}:`, err);
  process.exit(1);
});
