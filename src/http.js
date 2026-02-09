'use strict';

const crypto = require('node:crypto');
const pkg = require('../package.json');
const { AppError } = require('./lib/errors.js');

const initHealth = (server) => {
  server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: pkg.version,
  }));
};

const initRateLimit = async (server) => {
  await server.register(require('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.headers['x-forwarded-for'] || request.ip;
    },
    errorResponseBuilder: () => ({
      error: {
        code: 'RATE_LIMIT',
        message: 'Too many requests. Please try again later.',
      },
    }),
  });
};

const initRequestId = (server) => {
  server.addHook('onRequest', (request, reply, done) => {
    const requestId = request.headers['x-request-id'] || crypto.randomUUID();
    request.requestId = requestId;
    reply.header('X-Request-Id', requestId);
    done();
  });
};

const initErrorHandler = (server) => {
  server.setErrorHandler((error, request, reply) => {
    const requestId = request.requestId || 'unknown';

    if (error instanceof AppError) {
      request.log.warn({ err: error, requestId }, error.message);
      return reply.status(error.statusCode).send(error.toJSON());
    }

    if (error.validation) {
      request.log.warn({ err: error, requestId }, 'Validation error');
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: error.validation,
        },
      });
    }

    request.log.error({ err: error, requestId }, 'Unhandled error');
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : error.message,
      },
    });
  });
};

const initRoutes = (server, routes) => {
  for (const [iface, methods] of Object.entries(routes)) {
    for (const [method, handler] of Object.entries(methods)) {
      if (typeof handler !== 'function') continue;

      server.post(
        `/api/${iface}/${method}`,
        async (request) => {
          const { query, body, headers } = request;
          const result = await handler({
            ...query,
            ...body,
            headers,
            session: request.session || null,
            requestId: request.requestId,
          });
          return result;
        },
      );
    }
  }
};

module.exports = {
  initRoutes, initHealth, initRateLimit,
  initRequestId, initErrorHandler,
};
