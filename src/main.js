'use strict';

const fastify = require('fastify');
const pino = require('pino');

const {
  initHealth, initRateLimit, initRequestId, initErrorHandler,
} = require('./http.js');
const { init: initWs } = require('./ws.js');
const validateEnv = require('./config/validate.js');

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

  const server = fastify({ logger });

  // Middleware
  initRequestId(server);
  await initRateLimit(server);
  initErrorHandler(server);

  // Routes
  initHealth(server);
  initWs(server);

  await server.listen({ port: PORT, host: HOST });
  logger.info('AI Act Compliance Platform v0.1.0');
  logger.info(`Server listening on ${HOST}:${PORT}`);
})().catch((err) => {
  logger.fatal(err, 'Failed to start server');
  process.exit(1);
});
