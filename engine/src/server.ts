import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { AppError } from './types/errors.js';
import { loadRegulationData } from './data/regulation-loader.js';
import { initEngineContext } from './context.js';
import scanRoutes from './routes/scan.js';
import statusRoutes from './routes/status.js';
import memoryRoutes from './routes/memory.js';
import chatRoutes from './routes/chat.js';
import fileRoutes from './routes/file.js';
import shellRoutes from './routes/shell.js';
import gitRoutes from './routes/git.js';

const PORT = Number(process.env['PORT'] ?? 3001);

const app = new Hono();

// Global error handler
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      { error: err.code, message: err.message },
      err.statusCode as 400 | 404 | 500 | 502,
    );
  }
  console.error('Unexpected error:', err);
  return c.json(
    { error: 'INTERNAL', message: 'Internal server error' },
    500,
  );
});

// Mount routes
app.route('/', statusRoutes);
app.route('/', scanRoutes);
app.route('/', memoryRoutes);
app.route('/', chatRoutes);
app.route('/', fileRoutes);
app.route('/', shellRoutes);
app.route('/', gitRoutes);

// Health check
app.get('/health', (c) => c.json({ ok: true }));

const start = async (): Promise<void> => {
  console.log('Loading regulation data...');
  const regulationData = await loadRegulationData();
  console.log(`Loaded ${regulationData.obligations.obligations.length} obligations`);

  const projectPath = process.env['COMPLIOR_PROJECT_PATH'] ?? process.cwd();
  initEngineContext(regulationData, projectPath);

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
