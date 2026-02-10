'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const {
  initHealth, initRateLimit, initRequestId, initErrorHandler,
} = require('../server/src/http.js');
const { ValidationError } = require('../server/lib/errors.js');

describe('HTTP server', () => {
  let server;

  before(async () => {
    server = fastify({ logger: false });
    initRequestId(server);
    await initRateLimit(server);
    initErrorHandler(server);
    initHealth(server);

    server.get('/test-error', async () => {
      throw new ValidationError('bad input', { field: 'test' });
    });

    await server.ready();
  });

  after(async () => {
    await server.close();
  });

  it('GET /health returns 200 with service checks', async () => {
    const res = await server.inject({ method: 'GET', url: '/health' });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert(['ok', 'degraded'].includes(body.status));
    assert(body.timestamp);
    assert(body.version);
    assert(body.services);
  });

  it('error handler returns correct JSON for AppError', async () => {
    const res = await server.inject({ method: 'GET', url: '/test-error' });
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
    assert.deepStrictEqual(body.error.details, { field: 'test' });
  });

  it('adds X-Request-Id header', async () => {
    const res = await server.inject({ method: 'GET', url: '/health' });
    assert(res.headers['x-request-id']);
  });

  it('preserves provided X-Request-Id', async () => {
    const customId = 'test-request-id-123';
    const res = await server.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': customId },
    });
    assert.strictEqual(res.headers['x-request-id'], customId);
  });
});
