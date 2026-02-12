'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { initRequestId, initErrorHandler, registerSandboxRoutes } = require('../server/src/http.js');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const createMockDb = () => {
  const updates = [];
  const auditEntries = [];

  const mockClient = {
    query: async (sql, params) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('FROM "Plan" WHERE "name"')) {
        return { rows: [{ planId: 5 }] };
      }
      if (sql.includes('UPDATE "Subscription"')) {
        updates.push({ sql, params });
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    },
    release: () => {},
  };

  return {
    query: async (sql, params) => {
      if (sql.includes('FROM "Subscription"') && sql.includes('stripeSubscriptionId')) {
        return { rows: [{ organizationId: 10 }] };
      }
      if (sql.includes('UPDATE "Subscription"')) {
        updates.push({ sql, params });
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO "AuditLog"')) {
        auditEntries.push({ sql, params });
        return { rows: [{ auditLogId: auditEntries.length }] };
      }
      return { rows: [] };
    },
    connect: async () => mockClient,
    _updates: updates,
    _auditEntries: auditEntries,
  };
};

const createMockStripe = (shouldFail = false) => ({
  createCheckoutSession: async () => ({}),
  retrieveSession: async () => null,
  constructEvent: (payload, signature, secret) => {
    if (shouldFail) throw new Error('Invalid signature');
    return JSON.parse(typeof payload === 'string' ? payload : JSON.stringify(payload));
  },
});

const makeWebhookEvent = (type, data) => ({
  id: 'evt_test_' + Date.now(),
  type,
  data: { object: data },
});

describe('POST /api/webhooks/stripe', () => {
  describe('signature verification', () => {
    let server;

    before(async () => {
      const mockDb = createMockDb();
      const mockStripe = createMockStripe(true);
      const { api } = await buildFullSandbox(mockDb, {
        stripe: mockStripe,
        config: {
          stripe: { secretKey: 'sk_test', webhookSecret: 'whsec_test', prices: {} },
          server: { frontendUrl: 'http://localhost:3001' },
        },
      });

      server = fastify({ logger: false });
      initRequestId(server);
      initErrorHandler(server);
      registerSandboxRoutes(server, { webhooks: api.webhooks });
      await server.ready();
    });

    after(async () => {
      await server.close();
    });

    it('rejects invalid signature', async () => {
      const event = makeWebhookEvent('checkout.session.completed', {});
      const res = await server.inject({
        method: 'POST',
        url: '/api/webhooks/stripe',
        headers: { 'stripe-signature': 'invalid_sig' },
        payload: event,
      });
      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('event handling', () => {
    let server;
    let mockDb;

    before(async () => {
      mockDb = createMockDb();
      const mockStripe = createMockStripe(false);
      const { api } = await buildFullSandbox(mockDb, {
        stripe: mockStripe,
        config: {
          stripe: { secretKey: 'sk_test', webhookSecret: 'whsec_test', prices: {} },
          server: { frontendUrl: 'http://localhost:3001' },
        },
      });

      server = fastify({ logger: false });
      initRequestId(server);
      initErrorHandler(server);
      registerSandboxRoutes(server, { webhooks: api.webhooks });
      await server.ready();
    });

    after(async () => {
      await server.close();
    });

    it('handles checkout.session.completed', async () => {
      const event = makeWebhookEvent('checkout.session.completed', {
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        metadata: { organizationId: '10', userId: '1', planName: 'starter' },
      });
      const res = await server.inject({
        method: 'POST',
        url: '/api/webhooks/stripe',
        headers: { 'stripe-signature': 'valid_sig' },
        payload: event,
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.received, true);
      assert.strictEqual(body.event, 'checkout.session.completed');
    });

    it('handles invoice.paid', async () => {
      const event = makeWebhookEvent('invoice.paid', {
        subscription: 'sub_test_123',
        lines: { data: [{ period: { end: Math.floor(Date.now() / 1000) + 86400 * 30 } }] },
      });
      const res = await server.inject({
        method: 'POST',
        url: '/api/webhooks/stripe',
        headers: { 'stripe-signature': 'valid_sig' },
        payload: event,
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.event, 'invoice.paid');
    });

    it('handles invoice.payment_failed', async () => {
      const event = makeWebhookEvent('invoice.payment_failed', {
        subscription: 'sub_test_123',
      });
      const res = await server.inject({
        method: 'POST',
        url: '/api/webhooks/stripe',
        headers: { 'stripe-signature': 'valid_sig' },
        payload: event,
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.event, 'invoice.payment_failed');
    });

    it('handles customer.subscription.deleted', async () => {
      const event = makeWebhookEvent('customer.subscription.deleted', {
        id: 'sub_test_123',
      });
      const res = await server.inject({
        method: 'POST',
        url: '/api/webhooks/stripe',
        headers: { 'stripe-signature': 'valid_sig' },
        payload: event,
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.event, 'customer.subscription.deleted');
    });

    it('creates audit log entry on subscription change', async () => {
      const beforeCount = mockDb._auditEntries.length;
      const event = makeWebhookEvent('invoice.paid', {
        subscription: 'sub_test_123',
        lines: { data: [{ period: { end: Math.floor(Date.now() / 1000) + 86400 * 30 } }] },
      });
      await server.inject({
        method: 'POST',
        url: '/api/webhooks/stripe',
        headers: { 'stripe-signature': 'valid_sig' },
        payload: event,
      });
      assert(mockDb._auditEntries.length > beforeCount, 'Should create audit entry');
    });

    it('ignores unknown event types gracefully', async () => {
      const event = makeWebhookEvent('some.unknown.event', { id: 'obj_123' });
      const res = await server.inject({
        method: 'POST',
        url: '/api/webhooks/stripe',
        headers: { 'stripe-signature': 'valid_sig' },
        payload: event,
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.received, true);
      assert.strictEqual(body.status, 'ignored');
    });

    it('is idempotent: duplicate event does not fail', async () => {
      const event = makeWebhookEvent('checkout.session.completed', {
        customer: 'cus_test_456',
        subscription: 'sub_test_456',
        metadata: { organizationId: '10', userId: '1', planName: 'growth' },
      });
      const res1 = await server.inject({
        method: 'POST',
        url: '/api/webhooks/stripe',
        headers: { 'stripe-signature': 'valid_sig' },
        payload: event,
      });
      assert.strictEqual(res1.statusCode, 200);

      const res2 = await server.inject({
        method: 'POST',
        url: '/api/webhooks/stripe',
        headers: { 'stripe-signature': 'valid_sig' },
        payload: event,
      });
      assert.strictEqual(res2.statusCode, 200);
    });
  });
});
