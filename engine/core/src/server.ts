import { serve } from '@hono/node-server';
import { loadApplication } from './composition-root.js';
import { createLogger } from './infra/logger.js';
import { ENGINE_VERSION } from './version.js';

const log = createLogger('server');
const PORT = Number(process.env['PORT'] ?? 3099);
const isMcpMode = process.argv.includes('mcp-server');

const startHttp = async (): Promise<void> => {
  log.info('Loading regulation data...');
  const { app, startWatcher } = await loadApplication();

  const server = serve({ fetch: app.fetch, port: PORT }, () => {
    log.info(`Complior Engine v${ENGINE_VERSION} running on http://127.0.0.1:${PORT}`);
    // US-S0202: start file watcher for Compliance Gate
    startWatcher();
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
  const { createMcpStack } = await import('./mcp/create-mcp-stack.js');

  const { mcpServer } = await createMcpStack({
    regulationData: state.regulationData,
    projectPath: state.projectPath,
    getLastScanResult: () => state.lastScanResult,
    setLastScanResult: (r) => { state.lastScanResult = r; },
    version: state.version,
  });

  await mcpServer.start();
};

const main = isMcpMode ? startMcp : startHttp;
main().catch((err: unknown) => {
  log.error(`Failed to start engine${isMcpMode ? ' (MCP mode)' : ''}:`, err);
  process.exit(1);
});
