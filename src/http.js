'use strict';

const crypto = require('node:crypto');
const pkg = require('../package.json');
const { AppError } = require('./lib/errors.js');

const checkDatabase = async (checks) => {
  try {
    const { Pool } = require('pg');
    const connStr = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString: connStr });
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 5000);
    });
    await Promise.race([pool.query('SELECT 1'), timeout]);
    checks.database = 'ok';
    await pool.end();
  } catch {
    checks.database = 'error';
  }
};

const checkService = async (checks, name, envVar, path) => {
  try {
    const url = process.env[envVar];
    if (!url) {
      checks[name] = 'not_configured';
      return;
    }
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(
      `${url}${path}`,
      { signal: ctrl.signal },
    );
    checks[name] = res.ok ? 'ok' : 'error';
  } catch {
    checks[name] = 'error';
  }
};

const initHealth = (server) => {
  server.get('/health', async () => {
    const checks = {};
    await Promise.all([
      checkDatabase(checks),
      checkService(
        checks, 'ory',
        'ORY_SDK_URL', '/health/alive',
      ),
      checkService(
        checks, 'gotenberg',
        'GOTENBERG_URL', '/health',
      ),
    ]);
    const allOk = Object.values(checks).every(
      (v) => v === 'ok' || v === 'not_configured',
    );
    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: pkg.version,
      services: checks,
    };
  });
};

const initRateLimit = async (server) => {
  await server.register(require('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
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

    request.log.error(
      { err: error, requestId }, 'Unhandled error',
    );
    if (process.env.SENTRY_DSN) {
      try {
        require('@sentry/node').captureException(error);
      } catch (sentryErr) {
        request.log.warn({ err: sentryErr }, 'Sentry capture failed');
      }
    }
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development'
          ? error.message
          : 'Internal server error',
      },
    });
  });
};

const initSessionHook = (server, oryClient) => {
  server.addHook('onRequest', async (request) => {
    request.session = null;
    request.user = null;

    const { url } = request;
    if (!url.startsWith('/api/')) return;
    if (url.startsWith('/api/auth/webhook')) return;
    if (url === '/health') return;

    const cookie = request.headers.cookie || '';
    const token = request.headers['x-session-token'] || '';
    if (!cookie && !token) return;

    try {
      const session = await oryClient.verifySession(token, cookie);
      request.session = session;
    } catch {
      // Session invalid — leave null, handlers decide if auth required
    }
  });
};

const initRoutes = (server, routeDefs) => {
  for (const def of routeDefs) {
    const { method, path, handler } = def;
    const httpMethod = (method || 'POST').toLowerCase();
    server[httpMethod](path, async (request, reply) => {
      const result = await handler(request, reply);
      if (result !== undefined) return result;
    });
  }
};

module.exports = {
  initRoutes, initHealth, initRateLimit,
  initRequestId, initErrorHandler, initSessionHook,
};
