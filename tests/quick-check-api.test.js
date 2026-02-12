'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { initRequestId, initErrorHandler, registerSandboxRoutes } = require('../server/src/http.js');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

describe('POST /api/public/quick-check', () => {
  let server;
  let brevoCallCount;

  const validPayload = {
    answers: {
      deploysAI: true,
      aiAffectsPersons: true,
      domain: 'employment',
      aiMakesDecisions: true,
    },
  };

  before(async () => {
    brevoCallCount = 0;
    const mockDb = {
      query: async () => ({ rows: [] }),
      connect: async () => ({
        query: async () => ({ rows: [] }),
        release: () => {},
      }),
    };
    const mockBrevo = {
      sendTransactional: async () => {
        brevoCallCount++;
        return {};
      },
    };

    const { api } = await buildFullSandbox(mockDb, { brevo: mockBrevo });
    server = fastify({ logger: false });
    initRequestId(server);
    initErrorHandler(server);
    registerSandboxRoutes(server, { public: { quickCheck: api.public.quickCheck } });
    await server.ready();
  });

  after(async () => {
    await server.close();
  });

  it('returns assessment for valid input', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/public/quick-check',
      payload: validPayload,
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.applies, true);
    assert.ok(Array.isArray(body.obligations));
    assert.ok(Array.isArray(body.findings));
    assert.ok(body.obligations.length > 0);
  });

  it('rejects missing answers (400)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/public/quick-check',
      payload: {},
    });
    assert.strictEqual(res.statusCode, 400);
  });

  it('works without email (no Brevo call)', async () => {
    brevoCallCount = 0;
    const res = await server.inject({
      method: 'POST',
      url: '/api/public/quick-check',
      payload: validPayload,
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(brevoCallCount, 0);
  });

  it('calls Brevo when email+consent provided', async () => {
    brevoCallCount = 0;
    const res = await server.inject({
      method: 'POST',
      url: '/api/public/quick-check',
      payload: {
        ...validPayload,
        email: 'lead@example.com',
        consent: true,
      },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(brevoCallCount, 1);
  });

  it('rejects consent=false with email (400)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/public/quick-check',
      payload: {
        ...validPayload,
        email: 'lead@example.com',
        consent: false,
      },
    });
    assert.strictEqual(res.statusCode, 400);
  });

  it('accessible without authentication (public)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/public/quick-check',
      headers: {},
      payload: validPayload,
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.applies, true);
  });
});
