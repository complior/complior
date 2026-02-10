'use strict';

const fastify = require('fastify');
const pino = require('pino');
const { Pool } = require('pg');

const {
  initHealth, initRateLimit, initRequestId, initErrorHandler,
  initSessionHook, initRoutes,
} = require('./http.js');
const { init: initWs } = require('./ws.js');
const validateEnv = require('./config/validate.js');
const dbConfig = require('./config/database.js');
const createOryClient = require('./infrastructure/auth/ory-client.js');

// Application services
const createSessionResolver = require('./application/iam/resolveSession.js');
const createUserSync = require('./application/iam/syncUserFromOry.js');
const createPermissionChecker = require('./lib/permissions.js');
const createAuditLogger = require('./lib/audit.js');
const createCatalogSearch = require('./application/inventory/searchCatalog.js');

// API handlers
const createWebhookHandler = require('./api/auth/webhook.js');
const createMeHandler = require('./api/auth/me.js');
const createUpdateOrganizationHandler = require('./api/auth/updateOrganization.js');
const createAuditHandler = require('./api/auth/audit.js');
const createCatalogHandlers = require('./api/tools/catalog.js');

// Sentry error tracking (only if DSN configured)
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

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

(async () => {
  // Validate environment
  const { warnings } = validateEnv();
  for (const warn of warnings) {
    logger.warn(warn);
  }

  // Database
  const db = new Pool(dbConfig);

  // Infrastructure
  const oryClient = createOryClient();

  // Services
  const sessionResolver = createSessionResolver(db);
  const userSync = createUserSync(db);
  const { checkPermission } = createPermissionChecker(db);
  const auditLogger = createAuditLogger(db);
  const catalogSearch = createCatalogSearch(db);

  const server = fastify({ logger });

  // Middleware
  initRequestId(server);
  await initRateLimit(server);
  initErrorHandler(server);
  initSessionHook(server, oryClient);

  // Routes
  initHealth(server);
  initWs(server);

  const routes = [
    createWebhookHandler(db, oryClient, userSync),
    createMeHandler(db, userSync),
    createUpdateOrganizationHandler(db, sessionResolver, checkPermission),
    createAuditHandler(sessionResolver, checkPermission, auditLogger),
    ...createCatalogHandlers(catalogSearch),
  ];
  initRoutes(server, routes);

  await server.listen({ port: PORT, host: HOST });
  logger.info('AI Act Compliance Platform v0.1.0');
  logger.info(`Server listening on ${HOST}:${PORT}`);
})().catch((err) => {
  logger.fatal(err, 'Failed to start server');
  process.exit(1);
});
