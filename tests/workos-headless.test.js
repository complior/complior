'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { initRequestId, initErrorHandler, registerSandboxRoutes } = require('../server/src/http.js');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const createMockDb = () => {
  const mockClient = {
    query: async (sql) => {
      if (sql.includes('FROM "User" WHERE "workosUserId"')) return { rows: [] };
      if (sql.includes('FROM "Invitation"')) return { rows: [] };
      if (sql.includes('INSERT INTO "Organization"')) return { rows: [{ id: 1 }] };
      if (sql.includes('INSERT INTO "User"')) return { rows: [{ id: 1 }] };
      if (sql.includes('FROM "Role" WHERE "name"')) return { rows: [{ roleId: 1 }] };
      if (sql.includes('INSERT INTO "UserRole"')) return { rows: [{ userRoleId: 1 }] };
      if (sql.includes('FROM "Plan" WHERE "name"')) return { rows: [{ planId: 1 }] };
      if (sql.includes('INSERT INTO "Subscription"')) return { rows: [{ id: 1 }] };
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      return { rows: [] };
    },
    release: () => {},
  };

  return {
    query: async (sql) => {
      if (sql.includes('FROM "User" WHERE "workosUserId"')) return { rows: [] };
      return { rows: [] };
    },
    connect: async () => mockClient,
  };
};

describe('Headless Auth Endpoints', () => {
  let server;

  before(async () => {
    const mockDb = createMockDb();
    const mockWorkos = {
      getAuthorizationUrl: (screenHint, state, provider) => {
        if (provider === 'google') return 'https://accounts.google.com/o/oauth2/auth?test=1';
        if (provider === 'github') return 'https://github.com/login/oauth/authorize?test=1';
        return 'https://authkit.workos.com/test';
      },
      authenticateWithCode: async () => ({
        user: { id: 'user_01', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
        sealedSession: 'sealed-session-data',
      }),
      authenticateWithPassword: async (email, password) => {
        if (password === 'wrong-password') throw new Error('Invalid credentials');
        return {
          user: { id: 'user_01', email, firstName: 'Test', lastName: 'User' },
          sealedSession: 'sealed-pw-session',
        };
      },
      createUser: async (email, password, firstName, lastName) => {
        if (email === 'existing@example.com') {
          const err = new Error('User already exists');
          throw err;
        }
        return { id: 'user_new', email, firstName, lastName };
      },
      sendMagicAuth: async () => ({ id: 'magic_01' }),
      authenticateWithMagicAuth: async (code) => {
        if (code === '000000') throw new Error('Invalid code');
        return {
          user: { id: 'user_01', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
          sealedSession: 'sealed-magic-session',
        };
      },
      sendPasswordReset: async () => ({ id: 'reset_01' }),
      resetPassword: async (token) => {
        if (token === 'invalid-token') throw new Error('Invalid token');
        return { user: { id: 'user_01' } };
      },
      authenticateWithEmailVerification: async (code) => {
        if (code === '000000') throw new Error('Invalid verification code');
        return {
          user: { id: 'user_01', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
          sealedSession: 'sealed-email-verify-session',
        };
      },
      verifySessionCookie: async () => ({ authenticated: true, user: { id: 'user_01' } }),
      deleteUser: async () => {},
    };

    const { api } = await buildFullSandbox(mockDb, { workos: mockWorkos });

    server = fastify({ logger: false });
    await server.register(require('@fastify/cookie'));
    initRequestId(server);
    initErrorHandler(server);
    registerSandboxRoutes(server, {
      auth: {
        loginPassword: api.auth.loginPassword,
        loginMagic: api.auth.loginMagic,
        loginMagicVerify: api.auth.loginMagicVerify,
        registerPassword: api.auth.registerPassword,
        forgotPassword: api.auth.forgotPassword,
        resetPassword: api.auth.resetPassword,
        verifyEmail: api.auth.verifyEmail,
        login: api.auth.login,
      },
    });
    await server.ready();
  });

  after(async () => {
    await server.close();
  });

  // 1. loginPassword — success
  it('POST /api/auth/login/password — success returns sealed session cookie', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/login/password',
      payload: { email: 'test@example.com', password: 'correct-password' },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.email, 'test@example.com');
    const cookies = res.cookies;
    const sessionCookie = cookies.find(c => c.name === 'wos-session');
    assert.ok(sessionCookie, 'wos-session cookie should be set');
    assert.strictEqual(sessionCookie.value, 'sealed-pw-session');
  });

  // 2. loginPassword — wrong password
  it('POST /api/auth/login/password — wrong password returns 401', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/login/password',
      payload: { email: 'test@example.com', password: 'wrong-password' },
    });
    assert.strictEqual(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.error.code, 'AUTH_ERROR');
  });

  // 3. loginMagic — sends magic auth request
  it('POST /api/auth/login/magic — returns success', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/login/magic',
      payload: { email: 'test@example.com' },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.success, true);
  });

  // 4. loginMagicVerify — valid code
  it('POST /api/auth/login/magic/verify — valid code returns session cookie', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/login/magic/verify',
      payload: { email: 'test@example.com', code: '123456' },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.success, true);
    const cookies = res.cookies;
    const sessionCookie = cookies.find(c => c.name === 'wos-session');
    assert.ok(sessionCookie, 'wos-session cookie should be set');
  });

  // 5. loginMagicVerify — invalid code
  it('POST /api/auth/login/magic/verify — invalid code returns 401', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/login/magic/verify',
      payload: { email: 'test@example.com', code: '000000' },
    });
    assert.strictEqual(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.error.code, 'AUTH_ERROR');
  });

  // 6. registerPassword — creates user + session
  it('POST /api/auth/register/password — creates user and returns session', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/register/password',
      payload: {
        email: 'new@example.com',
        password: 'StrongPass1!',
        firstName: 'New',
        lastName: 'User',
      },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.created, true);
    const cookies = res.cookies;
    const sessionCookie = cookies.find(c => c.name === 'wos-session');
    assert.ok(sessionCookie, 'wos-session cookie should be set');
  });

  // 7. registerPassword — duplicate email
  it('POST /api/auth/register/password — duplicate email returns 409', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/register/password',
      payload: {
        email: 'existing@example.com',
        password: 'StrongPass1!',
        firstName: 'Existing',
        lastName: 'User',
      },
    });
    assert.strictEqual(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.error.code, 'CONFLICT');
  });

  // 8. forgotPassword — always returns success
  it('POST /api/auth/forgot-password — always returns success', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'anyone@example.com' },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.success, true);
  });

  // 9. resetPassword — valid token
  it('POST /api/auth/reset-password — valid token resets password', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'valid-token', newPassword: 'NewSecurePass1!' },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.success, true);
  });

  // 10. resetPassword — invalid token
  it('POST /api/auth/reset-password — invalid token returns 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'invalid-token', newPassword: 'NewSecurePass1!' },
    });
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
  });

  // 11. social login redirect — Google
  it('GET /api/auth/login?provider=google — redirects to Google OAuth', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/auth/login?provider=google',
    });
    assert.strictEqual(res.statusCode, 302);
    assert.ok(res.headers.location.includes('google'), 'Should redirect to Google');
  });

  // 12. social login redirect — GitHub
  it('GET /api/auth/login?provider=github — redirects to GitHub OAuth', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/auth/login?provider=github',
    });
    assert.strictEqual(res.statusCode, 302);
    assert.ok(res.headers.location.includes('github'), 'Should redirect to GitHub');
  });

  // 13. verifyEmail — valid code returns session cookie
  it('POST /api/auth/verify-email — valid code returns session cookie', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/verify-email',
      payload: { code: '123456', pendingAuthenticationToken: 'valid-token' },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.success, true);
    const cookies = res.cookies;
    const sessionCookie = cookies.find(c => c.name === 'wos-session');
    assert.ok(sessionCookie, 'wos-session cookie should be set');
    assert.strictEqual(sessionCookie.value, 'sealed-email-verify-session');
  });

  // 14. verifyEmail — invalid code returns 401
  it('POST /api/auth/verify-email — invalid code returns 401', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/verify-email',
      payload: { code: '000000', pendingAuthenticationToken: 'some-token' },
    });
    assert.strictEqual(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.error.code, 'AUTH_ERROR');
  });
});
