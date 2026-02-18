import { serve } from '@hono/node-server';
import { loadApplication } from './composition-root.js';

// Also initialize old context for backward compatibility during migration
import { initEngineContext } from './context.js';

const PORT = Number(process.env['PORT'] ?? 3099);

const start = async (): Promise<void> => {
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

start().catch((err) => {
  console.error('Failed to start engine:', err);
  process.exit(1);
});
