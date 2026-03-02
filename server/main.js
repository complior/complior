'use strict';

const fastify = require('fastify');
const pino = require('pino');
const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

const { Logger } = require('./src/logger.js');
const { loadApplication } = require('./src/loader.js');
const {
  initHealth, initRateLimit, initRequestId, initErrorHandler,
  initSessionHook, initSecurityHeaders, registerSandboxRoutes,
  initRawBodyForWebhooks, initApiKeyHook,
} = require('./src/http.js');
const { init: initWs } = require('./src/ws.js');

const validateEnv = require('../app/config/validate.js');
const dbConfig = require('../app/config/database.js');
const { initDatabase } = require('../app/setup.js');
const cheerio = require('cheerio');
const createWorkOSClient = require('./infrastructure/auth/workos-client.js');
const errors = require('./lib/errors.js');
const schemas = require('./lib/schemas.js');
const zod = require('zod');

if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.authorization;
          delete event.request.headers['x-session-token'];
        }
      }
      return event;
    },
  });
}

const PORT = parseInt(process.env.PORT, 10) || 8000;
const HOST = process.env.HOST || '0.0.0.0';

const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
};

if (process.env.NODE_ENV !== 'production') {
  try {
    require.resolve('pino-pretty');
    loggerConfig.transport = {
      target: 'pino-pretty',
      options: { colorize: true },
    };
  } catch {
    // pino-pretty not installed
  }
}

const pinoLogger = pino(loggerConfig);

const APPLICATION_PATH = path.join(__dirname, '..', 'app');

(async () => {
  const { warnings } = validateEnv();
  for (const warn of warnings) {
    pinoLogger.warn(warn);
  }

  const db = new Pool(dbConfig);
  await initDatabase(db);

  const workos = createWorkOSClient();

  // Optional infra clients — lazy-load only when configured
  let brevo = { sendTransactional: async () => ({ messageId: 'noop' }) };
  if (process.env.BREVO_API_KEY) {
    const createBrevoClient = require('./infrastructure/email/brevo-client.js');
    brevo = createBrevoClient();
  }

  let gotenberg = { convertHtmlToPdf: async () => Buffer.alloc(0) };
  if (process.env.GOTENBERG_URL) {
    const createGotenbergClient = require('./infrastructure/pdf/gotenberg-client.js');
    gotenberg = createGotenbergClient();
  }

  let s3 = { upload: async () => ({}), download: async () => null, getSignedUrl: async () => '' };
  if (process.env.S3_ENDPOINT) {
    const createS3Storage = require('./infrastructure/storage/s3-client.js');
    s3 = createS3Storage();
  }

  let stripe = {
    createCheckoutSession: async () => ({}),
    retrieveSession: async () => null,
    constructEvent: () => null,
  };
  if (process.env.STRIPE_SECRET_KEY) {
    const createStripeClient = require('./infrastructure/billing/stripe-client.js');
    stripe = createStripeClient();
  }

  // pg-boss for background jobs (always enabled if DATABASE_URL exists)
  let pgboss = null;
  if (process.env.DATABASE_URL) {
    const createPgBossClient = require('./infrastructure/jobs/pg-boss-client.js');
    pgboss = createPgBossClient();
    await pgboss.start();
    pinoLogger.info('✅ pg-boss background job queue started');
  }

  const server = fastify({ logger: loggerConfig });
  const logger = new Logger(server.log);

  // Register cookie plugin for session management
  await server.register(require('@fastify/cookie'));

  const config = {
    server: require('../app/config/server.js'),
    database: dbConfig,
    workos: require('../app/config/workos.js'),
    brevo: require('../app/config/brevo.js'),
    gotenberg: require('../app/config/gotenberg.js'),
    s3: require('../app/config/s3.js'),
    log: require('../app/config/log.js'),
    stripe: require('../app/config/stripe.js'),
    registry: require('../app/config/registry.js'),
    enrichment: require('../app/config/enrichment.js'),
    llmModels: require('../app/config/llm-models.js'),
  };

  const appSandbox = await loadApplication(APPLICATION_PATH, {
    console: logger, db, config, errors, schemas, zod,
    workos, brevo, gotenberg, s3, stripe, pgboss,
    fetch: globalThis.fetch, cheerio,
  });

  initRawBodyForWebhooks(server);
  initSecurityHeaders(server);
  initRequestId(server);
  await initRateLimit(server);
  initErrorHandler(server);
  initSessionHook(server, workos);
  initApiKeyHook(server, db);

  initHealth(server);
  initWs(server);
  registerSandboxRoutes(server, appSandbox.api);

  // Start background jobs (if pg-boss is enabled)
  if (pgboss) {
    const jobCtx = { pgboss, domain: appSandbox.domain, application: appSandbox.application, console: logger, config, db };

    if (appSandbox.application?.jobs?.['schedule-registry-refresh']) {
      try {
        await appSandbox.application.jobs['schedule-registry-refresh'].init(jobCtx);
        pinoLogger.info('✅ Registry refresh job scheduled (Mondays 03:00 UTC)');
      } catch (error) {
        pinoLogger.error(error, 'Failed to schedule registry refresh job');
      }
    }

    if (appSandbox.application?.jobs?.['schedule-detection-enrichment']) {
      try {
        await appSandbox.application.jobs['schedule-detection-enrichment'].init(jobCtx);
        pinoLogger.info('✅ Detection enrichment job scheduled (Wednesdays 03:00 UTC)');
      } catch (error) {
        pinoLogger.error(error, 'Failed to schedule detection enrichment job');
      }
    }

    if (appSandbox.application?.jobs?.['schedule-data-export']) {
      try {
        const projectRoot = path.join(__dirname, '..');
        const exportCtx = {
          ...jobCtx,
          writeFile: (relativePath, data) => {
            const fullPath = path.join(projectRoot, relativePath);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, data);
            return fullPath;
          },
        };
        await appSandbox.application.jobs['schedule-data-export'].init(exportCtx);
        pinoLogger.info('✅ Data export job scheduled (Mondays 04:00 UTC)');
      } catch (error) {
        pinoLogger.error(error, 'Failed to schedule data export job');
      }
    }
  }

  await server.listen({ port: PORT, host: HOST });
  pinoLogger.info('AI Act Compliance Platform v0.1.0');
  pinoLogger.info(`Server listening on ${HOST}:${PORT}`);

  // Graceful shutdown
  const shutdown = async (signal) => {
    pinoLogger.info(`${signal} received, shutting down gracefully...`);

    try {
      // Stop accepting new connections
      await server.close();
      pinoLogger.info('HTTP server closed');

      // Stop pg-boss
      if (pgboss) {
        await pgboss.stop();
        pinoLogger.info('pg-boss stopped');
      }

      // Close database pool
      await db.end();
      pinoLogger.info('Database connections closed');

      process.exit(0);
    } catch (error) {
      pinoLogger.error(error, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
})().catch((err) => {
  pinoLogger.fatal(err, 'Failed to start server');
  process.exit(1);
});
