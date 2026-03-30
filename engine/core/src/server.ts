import { mkdir, writeFile, unlinkSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { loadApplication } from './composition-root.js';
import { createLogger } from './infra/logger.js';
import { withRetry } from './infra/retry.js';
import { ENGINE_VERSION } from './version.js';

// ── Load .env files (project-level, then engine-level) ──────────
// Node 22 has --env-file but we can't control how engine is spawned,
// so load manually without adding a dotenv dependency.
const loadEnvFile = (filePath: string): void => {
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      // Don't override existing env vars (explicit env takes precedence)
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch {
    // File doesn't exist — expected
  }
};

// Load engine-local .env first, then project .env (project overrides engine for shared keys)
const projectPath = process.env['COMPLIOR_PROJECT_PATH'] ?? process.cwd();
loadEnvFile(resolve(projectPath, '.env'));
loadEnvFile(resolve(import.meta.dirname ?? dirname(import.meta.url.replace('file://', '')), '..', '.env'));

const log = createLogger('server');
const PORT = Number(process.env['PORT'] ?? 3099);
const isMcpMode = process.argv.includes('mcp-server');

const pidFilePath = process.env['COMPLIOR_PID_FILE'] ?? '';
const watchMode = process.env['COMPLIOR_WATCH'] === '1';

const writePidFile = (port: number): void => {
  if (!pidFilePath) return;
  const info = JSON.stringify({
    pid: process.pid,
    port,
    started_at: new Date().toISOString(),
  });
  mkdir(dirname(pidFilePath), { recursive: true }, (mkdirErr) => {
    if (mkdirErr) {
      log.warn(`Failed to create PID dir: ${mkdirErr.message}`);
      return;
    }
    writeFile(pidFilePath, info, (writeErr) => {
      if (writeErr) log.warn(`Failed to write PID file: ${writeErr.message}`);
      else log.info(`PID file written: ${pidFilePath}`);
    });
  });
};

const removePidFile = (): void => {
  if (!pidFilePath) return;
  try {
    unlinkSync(pidFilePath);
    log.info('PID file removed');
  } catch {
    // Already gone or never written — fine
  }
};

const startHttp = async (): Promise<void> => {
  log.info('Loading regulation data...');
  const { app, startWatcher } = await loadApplication();

  const server = serve({ fetch: app.fetch, port: PORT }, () => {
    log.info(`Complior Engine v${ENGINE_VERSION} running on http://127.0.0.1:${PORT}`);

    // Write PID file after server binds (daemon mode)
    writePidFile(PORT);

    // Start file watcher: always in daemon watch mode, or legacy default
    if (watchMode) {
      startWatcher();
      log.info('File watcher started (daemon mode)');
    } else {
      // US-S0202: start file watcher for Compliance Gate (legacy default)
      startWatcher();
    }
  });

  // Background: fetch data bundle from SaaS (5s delay, then every 5min)
  const saasUrl = process.env['PROJECT_API_URL'] ?? '';
  if (saasUrl && process.env['OFFLINE_MODE'] !== '1') {
    const { createBundleFetcher } = await import('./infra/bundle-fetcher.js');
    const cacheDir = process.env['COMPLIOR_CACHE_DIR'] ?? '/tmp/complior-cache';
    const bundleFetcher = createBundleFetcher(saasUrl, cacheDir);
    const fetchBundle = () => withRetry(() => bundleFetcher.fetchIfUpdated()).catch((err: unknown) => { log.warn('Background bundle fetch failed:', err); });
    setTimeout(fetchBundle, 5_000);
    setInterval(fetchBundle, 300_000);
  }

  const shutdown = (): void => {
    log.info('Graceful shutdown...');
    removePidFile();
    server.close(() => {
      log.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

const startMcp = async (): Promise<void> => {
  const application = await loadApplication();
  const { state, setLastScanResult } = application;
  const { createMcpStack } = await import('./mcp/create-mcp-stack.js');

  const { mcpServer } = await createMcpStack({
    regulationData: state.regulationData,
    projectPath: state.projectPath,
    getLastScanResult: () => state.lastScanResult,
    setLastScanResult,
    version: state.version,
  });

  await mcpServer.start();
};

const main = isMcpMode ? startMcp : startHttp;
main().catch((err: unknown) => {
  log.error(`Failed to start engine${isMcpMode ? ' (MCP mode)' : ''}:`, err);
  process.exit(1);
});
