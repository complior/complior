'use strict';

const fastify = require('fastify');
const pino = require('pino');
const { Pool } = require('pg');
const path = require('node:path');

const { Logger } = require('./src/logger.js');
const { loadApplication } = require('./src/loader.js');
const {
  initHealth, initRateLimit, initRequestId, initErrorHandler,
  initSessionHook, registerSandboxRoutes,
} = require('./src/http.js');
const { init: initWs } = require('./src/ws.js');

const validateEnv = require('../app/config/validate.js');
const dbConfig = require('../app/config/database.js');
const { initDatabase } = require('../app/setup.js');
const createOryClient = require('./infrastructure/auth/ory-client.js');
const errors = require('./lib/errors.js');
const schemas = require('./lib/schemas.js');
const zod = require('zod');

if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
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

  const ory = createOryClient();

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

  const server = fastify({ logger: loggerConfig });
  const logger = new Logger(server.log);

  const config = {
    server: require('../app/config/server.js'),
    database: dbConfig,
    ory: require('../app/config/ory.js'),
    brevo: require('../app/config/brevo.js'),
    gotenberg: require('../app/config/gotenberg.js'),
    s3: require('../app/config/s3.js'),
    log: require('../app/config/log.js'),
  };

  const appSandbox = await loadApplication(APPLICATION_PATH, {
    console: logger, db, config, errors, schemas, zod,
    ory, brevo, gotenberg, s3,
  });

  initRequestId(server);
  await initRateLimit(server);
  initErrorHandler(server);
  initSessionHook(server, ory);

  initHealth(server);
  initWs(server);
  registerSandboxRoutes(server, appSandbox.api);

  await server.listen({ port: PORT, host: HOST });
  pinoLogger.info('AI Act Compliance Platform v0.1.0');
  pinoLogger.info(`Server listening on ${HOST}:${PORT}`);
})().catch((err) => {
  pinoLogger.fatal(err, 'Failed to start server');
  process.exit(1);
});
