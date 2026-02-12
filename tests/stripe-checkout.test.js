'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { initRequestId, initErrorHandler, registerSandboxRoutes } = require('../server/src/http.js');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const MOCK_USER = {
  id: 1,
  organizationId: 10,
  email: 'owner@example.com',
  fullName: 'Test Owner',
  active: true,
  roles: ['owner'],
  locale: 'en',
};

const MOCK_MEMBER = {
  id: 2,
  organizationId: 10,
  email: 'member@example.com',
  fullName: 'Test Member',
  active: true,
  roles: ['member'],
  locale: 'en',
};

const createMockDb = () => {
  const permissions = [
    { role: 'owner', resource: 'Subscription', action: 'manage' },
    { role: 'owner', resource: 'AITool', action: 'manage' },
    { role: 'member', resource: 'AITool', action: 'create' },
    { role: 'member', resource: 'AITool', action: 'read' },
  ];

  return {
    query: async (sql, params) => {
      if (sql.includes('FROM "Permission"')) {
        return { rows: permissions };
      }
      if (sql.includes('FROM "User"') && sql.includes('oryId')) {
        const oryId = params?.[0];
        if (oryId === 'ory-member') return { rows: [MOCK_MEMBER] };
        return { rows: [MOCK_USER] };
      }
      if (sql.includes('UPDATE "User"')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO "AuditLog"')) {
        return { rows: [{ auditLogId: 1 }] };
      }
      return { rows: [] };
    },
  };
};

const createMockStripe = () => {
  const sessions = {};
  return {
    createCheckoutSession: async (params) => {
      const id = 'cs_test_' + Date.now();
      const session = { id, url: 'https://checkout.stripe.com/' + id, ...params };
      sessions[id] = session;
      return session;
    },
    retrieveSession: async (sessionId) => {
      if (sessionId === 'cs_test_valid') {
        return {
          id: 'cs_test_valid',
          payment_status: 'paid',
          metadata: { organizationId: '10', planName: 'starter' },
        };
      }
      return null;
    },
    constructEvent: () => null,
  };
};

describe('Stripe Checkout API', () => {
  let server;

  describe('POST /api/billing/checkout', () => {
    let authedServer;
    let unauthedServer;

    before(async () => {
      const mockDb = createMockDb();
      const mockStripe = createMockStripe();
      const mockConfig = {
        stripe: {
          secretKey: 'sk_test_123',
          webhookSecret: 'whsec_test_123',
          prices: {
            starter: { monthly: 'price_starter_m', yearly: 'price_starter_y' },
            growth: { monthly: 'price_growth_m', yearly: 'price_growth_y' },
            scale: { monthly: 'price_scale_m', yearly: 'price_scale_y' },
          },
        },
        server: { frontendUrl: 'http://localhost:3001' },
      };

      const { api } = await buildFullSandbox(mockDb, {
        stripe: mockStripe,
        config: mockConfig,
      });

      // Server with auth (owner)
      authedServer = fastify({ logger: false });
      initRequestId(authedServer);
      initErrorHandler(authedServer);
      authedServer.addHook('onRequest', (req, _reply, done) => {
        req.session = {
          identity: { id: 'ory-123', traits: { email: MOCK_USER.email } },
        };
        done();
      });
      registerSandboxRoutes(authedServer, { billing: api.billing });
      await authedServer.ready();

      // Server without auth
      unauthedServer = fastify({ logger: false });
      initRequestId(unauthedServer);
      initErrorHandler(unauthedServer);
      unauthedServer.addHook('onRequest', (req, _reply, done) => {
        req.session = null;
        done();
      });
      registerSandboxRoutes(unauthedServer, { billing: api.billing });
      await unauthedServer.ready();
    });

    after(async () => {
      await authedServer.close();
      await unauthedServer.close();
    });

    it('rejects unauthenticated request', async () => {
      const res = await unauthedServer.inject({
        method: 'POST',
        url: '/api/billing/checkout',
        payload: { planName: 'starter', period: 'monthly' },
      });
      assert.strictEqual(res.statusCode, 401);
    });

    it('rejects non-owner (missing Subscription.manage)', async () => {
      const memberServer = fastify({ logger: false });
      initRequestId(memberServer);
      initErrorHandler(memberServer);
      const mockDb = createMockDb();
      const mockStripe = createMockStripe();
      const { api } = await buildFullSandbox(mockDb, {
        stripe: mockStripe,
        config: {
          stripe: {
            secretKey: 'sk_test_123',
            webhookSecret: 'whsec_test_123',
            prices: {
              starter: { monthly: 'price_starter_m', yearly: 'price_starter_y' },
              growth: { monthly: 'price_growth_m', yearly: 'price_growth_y' },
              scale: { monthly: 'price_scale_m', yearly: 'price_scale_y' },
            },
          },
          server: { frontendUrl: 'http://localhost:3001' },
        },
      });
      memberServer.addHook('onRequest', (req, _reply, done) => {
        req.session = {
          identity: { id: 'ory-member', traits: { email: MOCK_MEMBER.email } },
        };
        done();
      });
      registerSandboxRoutes(memberServer, { billing: api.billing });
      await memberServer.ready();

      const res = await memberServer.inject({
        method: 'POST',
        url: '/api/billing/checkout',
        payload: { planName: 'starter', period: 'monthly' },
      });
      assert.strictEqual(res.statusCode, 403);
      await memberServer.close();
    });

    it('rejects free plan with 400', async () => {
      const res = await authedServer.inject({
        method: 'POST',
        url: '/api/billing/checkout',
        payload: { planName: 'free', period: 'monthly' },
      });
      assert.strictEqual(res.statusCode, 400);
    });

    it('rejects enterprise plan with 400', async () => {
      const res = await authedServer.inject({
        method: 'POST',
        url: '/api/billing/checkout',
        payload: { planName: 'enterprise', period: 'monthly' },
      });
      assert.strictEqual(res.statusCode, 400);
    });

    it('creates checkout session for starter/monthly', async () => {
      const res = await authedServer.inject({
        method: 'POST',
        url: '/api/billing/checkout',
        payload: { planName: 'starter', period: 'monthly' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert(body.checkoutUrl);
      assert(body.sessionId);
    });

    it('creates checkout session for growth/yearly', async () => {
      const res = await authedServer.inject({
        method: 'POST',
        url: '/api/billing/checkout',
        payload: { planName: 'growth', period: 'yearly' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert(body.checkoutUrl);
      assert(body.sessionId);
    });
  });

  describe('GET /api/billing/checkout-status', () => {
    let server;

    before(async () => {
      const mockDb = createMockDb();
      const mockStripe = createMockStripe();
      const { api } = await buildFullSandbox(mockDb, {
        stripe: mockStripe,
        config: {
          stripe: {
            secretKey: 'sk_test_123',
            webhookSecret: 'whsec_test_123',
            prices: {},
          },
          server: { frontendUrl: 'http://localhost:3001' },
        },
      });

      server = fastify({ logger: false });
      initRequestId(server);
      initErrorHandler(server);
      server.addHook('onRequest', (req, _reply, done) => {
        req.session = {
          identity: { id: 'ory-123', traits: { email: MOCK_USER.email } },
        };
        done();
      });
      registerSandboxRoutes(server, { billing: api.billing });
      await server.ready();
    });

    after(async () => {
      await server.close();
    });

    it('returns session status for valid session_id', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/billing/checkout-status?sessionId=cs_test_valid',
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.status, 'paid');
      assert.strictEqual(body.planName, 'starter');
    });
  });
});
