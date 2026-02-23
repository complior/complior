'use strict';

const crypto = require('node:crypto');
const pkg = require('../../package.json');
const { AppError } = require('../lib/errors.js');

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
        checks, 'gotenberg',
        'GOTENBERG_URL', '/health',
      ),
    ]);
    // WorkOS is a managed service — no health endpoint needed
    checks.workos = process.env.WORKOS_CLIENT_ID ? 'configured' : 'not_configured';
    const allOk = Object.values(checks).every(
      (v) => v === 'ok' || v === 'not_configured' || v === 'configured',
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
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: {
        code: 'RATE_LIMIT',
        message: `Too many requests. Retry after ${context.after}.`,
      },
    }),
  });
};

const initSecurityHeaders = (server) => {
  server.addHook('onRequest', (request, reply, done) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
      reply.header(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload',
      );
    }
    done();
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

    if (error.statusCode === 429 || error?.error?.code === 'RATE_LIMIT') {
      request.log.warn({ requestId }, 'Rate limit exceeded');
      const body = error.error
        ? { error: error.error }
        : { error: { code: 'RATE_LIMIT', message: 'Too many requests.' } };
      return reply.status(429).send(body);
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

const initSessionHook = (server, workosClient) => {
  server.addHook('onRequest', async (request) => {
    request.session = null;
    request.user = null;

    const { url } = request;
    if (!url.startsWith('/api/')) return;
    if (url.startsWith('/api/auth/callback')) return;
    if (url.startsWith('/api/auth/login')) return;
    if (url.startsWith('/api/auth/register')) return;
    if (url.startsWith('/api/auth/forgot-password')) return;
    if (url.startsWith('/api/auth/reset-password')) return;
    if (url.startsWith('/api/webhooks/')) return;
    if (url.startsWith('/api/public/')) return;
    if (url === '/health') return;

    const cookieHeader = request.headers.cookie || '';
    if (!cookieHeader) return;

    // Extract wos-session cookie
    const match = cookieHeader.match(/(?:^|;\s*)wos-session=([^;]+)/);
    if (!match) return;

    const sessionData = match[1];
    try {
      const result = await workosClient.verifySessionCookie(sessionData);
      if (result.authenticated) {
        request.session = {
          user: result.user,
          organizationId: result.organizationId,
        };
      }
    } catch {
      // Session invalid — leave null, handlers decide if auth required
    }
  });
};

const initApiKeyHook = (server, pool) => {
  server.addHook('onRequest', async (request) => {
    request.apiKey = null;

    const { url } = request;
    if (!url.startsWith('/v1/')) return;

    const headerKey = request.headers['x-api-key']
      || (request.headers.authorization || '').replace(/^Bearer\s+/i, '') || '';
    if (!headerKey) return;

    const keyHash = crypto.createHash('sha256').update(headerKey).digest('hex');

    try {
      const result = await pool.query(
        `SELECT "apiKeyId", "organizationId", "plan", "rateLimit", "expiresAt"
         FROM "ApiKey" WHERE "keyHash" = $1 AND "active" = true`,
        [keyHash],
      );
      if (result.rows.length === 0) return;

      const key = result.rows[0];
      if (key.expiresAt && new Date(key.expiresAt) < new Date()) return;

      request.apiKey = {
        apiKeyId: key.apiKeyId,
        organizationId: key.organizationId,
        plan: key.plan,
        rateLimit: key.rateLimit,
      };

      // Track usage (upsert daily counter)
      const today = new Date().toISOString().slice(0, 10);
      await pool.query(
        `INSERT INTO "ApiUsage" ("apiKeyId", "usageDate", "requestCount", "bytesTransferred")
         VALUES ($1, $2, 1, 0)
         ON CONFLICT ("apiKeyId", "usageDate")
         DO UPDATE SET "requestCount" = "ApiUsage"."requestCount" + 1`,
        [key.apiKeyId, today],
      );

      // Update lastUsedAt
      await pool.query(
        `UPDATE "ApiKey" SET "lastUsedAt" = NOW() WHERE "apiKeyId" = $1`,
        [key.apiKeyId],
      );

      // Check daily rate limit
      const usageResult = await pool.query(
        `SELECT "requestCount" FROM "ApiUsage"
         WHERE "apiKeyId" = $1 AND "usageDate" = $2`,
        [key.apiKeyId, today],
      );
      const count = usageResult.rows[0]?.requestCount || 0;
      if (count > key.rateLimit) {
        request.apiKeyRateLimited = true;
      }
    } catch {
      // DB error — leave apiKey null, don't block public endpoints
    }
  });
};

const walkApiTree = (node, handlers = []) => {
  if (node && typeof node === 'object' && node.httpMethod && node.method) {
    handlers.push(node);
    return handlers;
  }
  if (node && typeof node === 'object') {
    for (const val of Object.values(node)) {
      if (val && typeof val === 'object') {
        if (Array.isArray(val)) {
          for (const item of val) walkApiTree(item, handlers);
        } else {
          walkApiTree(val, handlers);
        }
      }
    }
  }
  return handlers;
};

const initRawBodyForWebhooks = (server) => {
  server.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (req, body, done) => {
      if (req.url && req.url.startsWith('/api/webhooks/')) {
        req.rawBody = body;
      }
      try {
        done(null, JSON.parse(body));
      } catch (err) {
        done(err);
      }
    },
  );
};

const registerSandboxRoutes = (server, api) => {
  const handlers = walkApiTree(api);
  for (const def of handlers) {
    const httpMethod = def.httpMethod.toLowerCase();
    server[httpMethod](def.path, async (request, reply) => {
      const result = await def.method({
        body: request.body,
        rawBody: request.rawBody,
        query: request.query,
        headers: request.headers,
        params: request.params,
        session: request.session,
      });
      const statusCode = result?._statusCode || 200;

      // Set cookie if returned by handler
      if (result?._cookie) {
        const { name, value, options } = result._cookie;
        reply.setCookie(name, value, options);
      }

      // Set custom headers (ETag, Cache-Control, etc.)
      if (result?._headers) {
        for (const [key, value] of Object.entries(result._headers)) {
          reply.header(key, value);
        }
      }

      // Handle redirects
      if (result?._redirect) {
        const rest = { ...result };
        delete rest._statusCode;
        delete rest._redirect;
        delete rest._cookie;
        delete rest._headers;
        return reply.code(statusCode === 302 ? 302 : statusCode).redirect(result._redirect);
      }

      if (result && result._statusCode !== undefined) {
        const rest = { ...result };
        delete rest._statusCode;
        delete rest._cookie;
        delete rest._headers;
        return reply.code(statusCode).send(rest);
      }
      if (result?._headers) {
        const rest = { ...result };
        delete rest._headers;
        return reply.code(statusCode).send(rest);
      }
      return reply.code(statusCode).send(result);
    });
  }
};

module.exports = {
  registerSandboxRoutes, initHealth, initRateLimit,
  initRequestId, initErrorHandler, initSessionHook,
  initSecurityHeaders, initRawBodyForWebhooks, initApiKeyHook,
};
