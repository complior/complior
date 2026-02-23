'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { setupTestDb, cleanupTestDb, closeTestDb } = require('../helpers/test-db.js');
const { buildFullSandbox } = require('../helpers/test-sandbox.js');
const {
  initRequestId, initErrorHandler, registerSandboxRoutes,
} = require('../../server/src/http.js');

describe('E2E: Full HTTP Stack — Sprints 1, 2, 2.5 (real DB)', () => {
  let pool;
  let server;
  let application;

  // Shared state across tests (populated as we go)
  const OWNER_WOS = 'wos-e2e-owner';
  const MEMBER_WOS = 'wos-e2e-member';
  const OTHER_WOS = 'wos-e2e-other-org';

  let ownerUserId;
  let ownerOrgId;
  let toolId;
  let classifiedToolId;
  let invitationId;
  let inviteToken;
  let memberUserId;

  // ── Helpers ──────────────────────────────────────────────────────────

  const inject = (method, url, opts = {}) => {
    const headers = {};
    if (opts.workosId) headers['x-test-workos-id'] = opts.workosId;
    const config = { method, url, headers };
    if (opts.payload) config.payload = opts.payload;
    if (opts.query) {
      const qs = new URLSearchParams(opts.query).toString();
      config.url = `${url}?${qs}`;
    }
    return server.inject(config);
  };

  const json = (res) => JSON.parse(res.payload);

  // ── Setup / Teardown ────────────────────────────────────────────────

  before(async () => {
    pool = await setupTestDb();

    // Reset free plan to seed defaults
    await pool.query(
      'UPDATE "Plan" SET "maxUsers" = 1, "maxTools" = 5 WHERE "name" = \'free\'',
    );

    const { api, application: app } = await buildFullSandbox(pool);
    application = app;

    server = fastify({ logger: false });
    initRequestId(server);
    initErrorHandler(server);

    // Mock session: x-test-workos-id → request.session.user.id
    server.addHook('onRequest', (req, _reply, done) => {
      req.session = null;
      const workosId = req.headers['x-test-workos-id'];
      if (workosId) {
        req.session = {
          user: { id: workosId },
        };
      }
      done();
    });

    registerSandboxRoutes(server, api);
    await server.ready();
  });

  after(async () => {
    if (server) await server.close();
    await cleanupTestDb();
    await closeTestDb();
  });

  // ════════════════════════════════════════════════════════════════════
  //  SPRINT 1: IAM + Catalog + Audit
  // ════════════════════════════════════════════════════════════════════

  describe('Sprint 1: User Sync via WorkOS', () => {
    it('creates new user + org + role + subscription', async () => {
      const result = await application.iam.syncUserFromWorkOS.syncUser({
        id: OWNER_WOS, email: 'owner@e2e.test', firstName: 'Owner', lastName: 'User',
      });
      assert.strictEqual(result.created, true);
      assert(result.user.id, 'Should return userId');
      assert(result.user.organizationId, 'Should return organizationId');

      ownerUserId = result.user.id;
      ownerOrgId = result.user.organizationId;
    });

    it('idempotent for same workosUserId', async () => {
      const result = await application.iam.syncUserFromWorkOS.syncUser({
        id: OWNER_WOS, email: 'owner@e2e.test', firstName: 'Owner', lastName: 'User',
      });
      assert.strictEqual(result.created, false);
    });
  });

  describe('Sprint 1: GET /api/auth/me', () => {
    it('200 — returns user profile', async () => {
      const res = await inject('GET', '/api/auth/me', { workosId: OWNER_WOS });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert.strictEqual(body.email, 'owner@e2e.test');
      assert.strictEqual(body.fullName, 'Owner User');
      assert.strictEqual(body.organizationId, ownerOrgId);
      assert(body.roles.includes('owner'), 'Should have owner role');
    });

    it('401 — without session', async () => {
      const res = await inject('GET', '/api/auth/me');
      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('Sprint 1: GET /api/tools/catalog/*', () => {
    it('200 — search returns paginated results', async () => {
      const res = await inject('GET', '/api/tools/catalog/search');
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert(body.data.length > 0, 'Should have catalog tools');
      assert(body.pagination, 'Should have pagination');
      assert(body.pagination.total >= 225);
    });

    it('200 — search q=ChatGPT finds result', async () => {
      const res = await inject('GET', '/api/tools/catalog/search', {
        query: { q: 'ChatGPT' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      const chatgpt = body.data.find((t) => t.name === 'ChatGPT');
      assert(chatgpt, 'Should find ChatGPT');
      assert.strictEqual(chatgpt.vendor, 'OpenAI');
    });

    it('200 — search by category filters', async () => {
      const res = await inject('GET', '/api/tools/catalog/search', {
        query: { category: 'recruitment' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      for (const tool of body.data) {
        assert.strictEqual(tool.category, 'recruitment');
      }
    });

    it('200 — catalog/:id returns detail', async () => {
      const res = await inject('GET', '/api/tools/catalog/1');
      assert.strictEqual(res.statusCode, 200);
      assert(json(res).name, 'Should have name');
    });

    it('404 — catalog/:id unknown', async () => {
      const res = await inject('GET', '/api/tools/catalog/99999');
      assert.strictEqual(res.statusCode, 404);
    });
  });

  describe('Sprint 1: PATCH /api/organizations/:id', () => {
    it('200 — owner updates org name', async () => {
      const res = await inject('PATCH', `/api/organizations/${ownerOrgId}`, {
        workosId: OWNER_WOS,
        payload: { name: 'E2E Corp' },
      });
      assert.strictEqual(res.statusCode, 200);

      // Verify in DB
      const row = await pool.query(
        'SELECT "name" FROM "Organization" WHERE "id" = $1',
        [ownerOrgId],
      );
      assert.strictEqual(row.rows[0].name, 'E2E Corp');
    });

    it('401 — without session', async () => {
      const res = await inject('PATCH', `/api/organizations/${ownerOrgId}`, {
        payload: { name: 'Nope' },
      });
      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('Sprint 1: GET /api/auth/audit', () => {
    it('200 — returns audit entries', async () => {
      const res = await inject('GET', '/api/auth/audit', { workosId: OWNER_WOS });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert(body.data, 'Should have data array');
      assert(body.pagination, 'Should have pagination');
    });

    it('401 — without session', async () => {
      const res = await inject('GET', '/api/auth/audit');
      assert.strictEqual(res.statusCode, 401);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  SPRINT 2: AI Tool Inventory + Classification
  // ════════════════════════════════════════════════════════════════════

  describe('Sprint 2: POST /api/tools — Register', () => {
    it('201 — registers new tool', async () => {
      const res = await inject('POST', '/api/tools', {
        workosId: OWNER_WOS,
        payload: { name: 'E2E Bot', vendorName: 'E2E Vendor' },
      });
      assert.strictEqual(res.statusCode, 201);
      const body = json(res);
      assert(body.id, 'Should return tool ID');
      assert.strictEqual(body.name, 'E2E Bot');
      assert.strictEqual(body.wizardStep, 1);
      assert.strictEqual(body.wizardCompleted, false);
      toolId = body.id;
    });

    it('401 — without session', async () => {
      const res = await inject('POST', '/api/tools', {
        payload: { name: 'NoAuth', vendorName: 'V' },
      });
      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('Sprint 2: GET /api/tools — List', () => {
    it('200 — lists tools in org', async () => {
      const res = await inject('GET', '/api/tools', { workosId: OWNER_WOS });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert(body.data.length >= 1, 'Should have at least 1 tool');
      const found = body.data.find((t) => t.name === 'E2E Bot');
      assert(found, 'Should find the registered tool');
    });
  });

  describe('Sprint 2: GET /api/tools/:id — Detail', () => {
    it('200 — returns tool detail', async () => {
      const res = await inject('GET', `/api/tools/${toolId}`, { workosId: OWNER_WOS });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert.strictEqual(body.tool.name, 'E2E Bot');
      assert.strictEqual(body.classification, null);
      assert(Array.isArray(body.requirements));
    });

    it('404 — unknown tool', async () => {
      const res = await inject('GET', '/api/tools/99999', { workosId: OWNER_WOS });
      assert.strictEqual(res.statusCode, 404);
    });
  });

  describe('Sprint 2: PATCH /api/tools/:id — Wizard Steps', () => {
    it('200 — step 2 (purpose + domain)', async () => {
      const res = await inject('PATCH', `/api/tools/${toolId}`, {
        workosId: OWNER_WOS,
        payload: { step: 2, purpose: 'Customer chatbot', domain: 'customer_service' },
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(json(res).wizardStep, 3);
    });

    it('200 — step 3 (dataTypes + affectedPersons)', async () => {
      const res = await inject('PATCH', `/api/tools/${toolId}`, {
        workosId: OWNER_WOS,
        payload: {
          step: 3,
          dataTypes: ['personal'],
          affectedPersons: ['customers'],
          vulnerableGroups: false,
        },
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(json(res).wizardStep, 4);
    });

    it('200 — step 4 → wizardCompleted=true', async () => {
      const res = await inject('PATCH', `/api/tools/${toolId}`, {
        workosId: OWNER_WOS,
        payload: {
          step: 4,
          autonomyLevel: 'advisory',
          humanOversight: true,
          affectsNaturalPersons: false,
        },
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(json(res).wizardCompleted, true);
    });

    it('400 — invalid step data', async () => {
      const res = await inject('PATCH', `/api/tools/${toolId}`, {
        workosId: OWNER_WOS,
        payload: { step: 2, purpose: '', domain: 'invalid_domain' },
      });
      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('Sprint 2: POST /api/tools/:id/classify', () => {
    it('200 — classifies completed tool', async () => {
      const res = await inject('POST', `/api/tools/${toolId}/classify`, {
        workosId: OWNER_WOS,
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert(body.riskLevel, 'Should have riskLevel');
      assert(body.confidence > 0, 'Confidence should be positive');
      assert(body.matchedRules.length > 0, 'Should match rules');
      classifiedToolId = toolId;
    });

    it('400 — cannot classify incomplete wizard', async () => {
      // Register a draft tool (step 1 only)
      const draft = await inject('POST', '/api/tools', {
        workosId: OWNER_WOS,
        payload: { name: 'Draft Bot', vendorName: 'V' },
      });
      const draftId = json(draft).id;

      const res = await inject('POST', `/api/tools/${draftId}/classify`, {
        workosId: OWNER_WOS,
      });
      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('Sprint 2: DELETE /api/tools/:id', () => {
    it('200 — hard-deletes draft tool', async () => {
      const draft = await inject('POST', '/api/tools', {
        workosId: OWNER_WOS,
        payload: { name: 'Deletable', vendorName: 'V' },
      });
      const draftId = json(draft).id;

      const res = await inject('DELETE', `/api/tools/${draftId}`, { workosId: OWNER_WOS });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(json(res).success, true);

      // Verify deleted from DB
      const row = await pool.query(
        'SELECT * FROM "AITool" WHERE "aIToolId" = $1',
        [draftId],
      );
      assert.strictEqual(row.rows.length, 0, 'Draft should be hard-deleted');
    });

    it('200 — soft-deletes classified tool', async () => {
      const res = await inject('DELETE', `/api/tools/${classifiedToolId}`, {
        workosId: OWNER_WOS,
      });
      assert.strictEqual(res.statusCode, 200);

      const row = await pool.query(
        'SELECT "complianceStatus" FROM "AITool" WHERE "aIToolId" = $1',
        [classifiedToolId],
      );
      assert.strictEqual(row.rows[0].complianceStatus, 'non_compliant',
        'Classified tool should be soft-deleted → non_compliant');
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  SPRINT 2.5: Team Management + Invite Flow
  // ════════════════════════════════════════════════════════════════════

  describe('Sprint 2.5: POST /api/team/invite', () => {
    before(async () => {
      // Upgrade plan to allow invites (free maxUsers=1 blocks immediately)
      await pool.query(
        'UPDATE "Plan" SET "maxUsers" = 10 WHERE "name" = \'free\'',
      );
    });

    it('201 — creates invitation', async () => {
      const res = await inject('POST', '/api/team/invite', {
        workosId: OWNER_WOS,
        payload: { email: 'invited@e2e.test', role: 'member' },
      });
      assert.strictEqual(res.statusCode, 201);
      const body = json(res);
      assert(body.id, 'Should return invitation ID');
      invitationId = body.id;

      // Get token from DB
      const row = await pool.query(
        'SELECT "token" FROM "Invitation" WHERE "invitationId" = $1',
        [invitationId],
      );
      inviteToken = row.rows[0].token;
    });

    it('409 — duplicate pending invitation', async () => {
      const res = await inject('POST', '/api/team/invite', {
        workosId: OWNER_WOS,
        payload: { email: 'invited@e2e.test', role: 'member' },
      });
      assert.strictEqual(res.statusCode, 409);
    });

    it('403 — plan limit exceeded', async () => {
      await pool.query(
        'UPDATE "Plan" SET "maxUsers" = 1 WHERE "name" = \'free\'',
      );
      const res = await inject('POST', '/api/team/invite', {
        workosId: OWNER_WOS,
        payload: { email: 'blocked@e2e.test', role: 'member' },
      });
      assert.strictEqual(res.statusCode, 403);

      // Restore
      await pool.query(
        'UPDATE "Plan" SET "maxUsers" = 10 WHERE "name" = \'free\'',
      );
    });

    it('401 — without session', async () => {
      const res = await inject('POST', '/api/team/invite', {
        payload: { email: 'x@x.com', role: 'member' },
      });
      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('Sprint 2.5: GET /api/team/invite/verify', () => {
    it('200 valid=true for pending token', async () => {
      const res = await inject('GET', '/api/team/invite/verify', {
        query: { token: inviteToken },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert.strictEqual(body.valid, true);
      assert.strictEqual(body.role, 'member');
      assert.strictEqual(body.email, 'invited@e2e.test');
      assert.strictEqual(body.organizationName, 'E2E Corp');
    });

    it('200 valid=false for unknown token', async () => {
      const res = await inject('GET', '/api/team/invite/verify', {
        query: { token: '00000000-0000-0000-0000-000000000000' },
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(json(res).valid, false);
    });
  });

  describe('Sprint 2.5: New user + Accept Invitation', () => {
    it('new user registers with pending invite → joins existing org', async () => {
      const result = await application.iam.syncUserFromWorkOS.syncUser({
        id: MEMBER_WOS, email: 'invited@e2e.test', firstName: 'Invited', lastName: 'Member',
      });
      assert.strictEqual(result.created, true);
      assert.strictEqual(result.user.organizationId, ownerOrgId,
        'New user should join inviter org');
      memberUserId = result.user.id;
    });

    it('invitation now marked as accepted', async () => {
      const row = await pool.query(
        'SELECT "status" FROM "Invitation" WHERE "invitationId" = $1',
        [invitationId],
      );
      assert.strictEqual(row.rows[0].status, 'accepted');
    });

    it('existing user accepts invitation → org transfer', async () => {
      // 1. Create another user in their own org
      await application.iam.syncUserFromWorkOS.syncUser({
        id: 'wos-e2e-xfer', email: 'xfer@e2e.test', firstName: 'Transfer', lastName: 'User',
      });

      // 2. Create invitation for xfer user's email
      const inv = await inject('POST', '/api/team/invite', {
        workosId: OWNER_WOS,
        payload: { email: 'xfer@e2e.test', role: 'admin' },
      });
      assert.strictEqual(inv.statusCode, 201);

      // 3. Get token
      const tokenRow = await pool.query(
        'SELECT "token" FROM "Invitation" WHERE "invitationId" = $1',
        [json(inv).id],
      );

      // 4. Accept (authenticated as the xfer user)
      const res = await inject('POST', '/api/team/invite/accept', {
        workosId: 'wos-e2e-xfer',
        payload: { token: tokenRow.rows[0].token },
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(json(res).organizationId, ownerOrgId);
      assert.strictEqual(json(res).role, 'admin');
    });

    it('403 — email mismatch on accept', async () => {
      const inv = await inject('POST', '/api/team/invite', {
        workosId: OWNER_WOS,
        payload: { email: 'mismatch@e2e.test', role: 'member' },
      });
      const tokenRow = await pool.query(
        'SELECT "token" FROM "Invitation" WHERE "invitationId" = $1',
        [json(inv).id],
      );

      // Owner tries to accept — email mismatch (owner is owner@e2e.test)
      const res = await inject('POST', '/api/team/invite/accept', {
        workosId: OWNER_WOS,
        payload: { token: tokenRow.rows[0].token },
      });
      assert.strictEqual(res.statusCode, 403);
    });
  });

  describe('Sprint 2.5: GET /api/team/members', () => {
    it('200 — returns members + invitations + limits', async () => {
      const res = await inject('GET', '/api/team/members', { workosId: OWNER_WOS });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert(body.members.length >= 2, 'Should have owner + invited member');
      assert.strictEqual(body.members[0].role, 'owner', 'Owner first');
      assert(body.invitations, 'Should have invitations');
      assert(body.limits, 'Should have limits');
      assert(typeof body.limits.current === 'number');
      assert(typeof body.limits.max === 'number');
    });

    it('401 — without session', async () => {
      const res = await inject('GET', '/api/team/members');
      assert.strictEqual(res.statusCode, 401);
    });
  });

  describe('Sprint 2.5: PATCH /api/team/members/:userId — Change Role', () => {
    it('200 — owner changes member to admin', async () => {
      const res = await inject('PATCH', `/api/team/members/${memberUserId}`, {
        workosId: OWNER_WOS,
        payload: { role: 'admin' },
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(json(res).success, true);
      assert.strictEqual(json(res).role, 'admin');

      // Verify in DB
      const roleRow = await pool.query(
        `SELECT r."name" FROM "UserRole" ur
         JOIN "Role" r ON r."roleId" = ur."roleId"
         WHERE ur."userId" = $1`,
        [memberUserId],
      );
      assert.strictEqual(roleRow.rows[0].name, 'admin');
    });

    it('403 — cannot change own role', async () => {
      const res = await inject('PATCH', `/api/team/members/${ownerUserId}`, {
        workosId: OWNER_WOS,
        payload: { role: 'member' },
      });
      assert.strictEqual(res.statusCode, 403);
    });

    it('403 — admin cannot change owner role', async () => {
      const res = await inject('PATCH', `/api/team/members/${ownerUserId}`, {
        workosId: MEMBER_WOS,
        payload: { role: 'member' },
      });
      assert.strictEqual(res.statusCode, 403);
    });
  });

  describe('Sprint 2.5: DELETE /api/team/members/:userId — Remove', () => {
    it('403 — cannot remove owner', async () => {
      const res = await inject('DELETE', `/api/team/members/${ownerUserId}`, {
        workosId: MEMBER_WOS,
      });
      assert.strictEqual(res.statusCode, 403);
    });

    it('200 — owner removes member (soft delete)', async () => {
      // Change member back to member role first
      await inject('PATCH', `/api/team/members/${memberUserId}`, {
        workosId: OWNER_WOS,
        payload: { role: 'member' },
      });

      const res = await inject('DELETE', `/api/team/members/${memberUserId}`, {
        workosId: OWNER_WOS,
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(json(res).success, true);

      const row = await pool.query(
        'SELECT "active" FROM "User" WHERE "id" = $1',
        [memberUserId],
      );
      assert.strictEqual(row.rows[0].active, false);
    });
  });

  describe('Sprint 2.5: DELETE /api/team/invitations/:id — Revoke', () => {
    let revokeInvId;

    before(async () => {
      const inv = await inject('POST', '/api/team/invite', {
        workosId: OWNER_WOS,
        payload: { email: 'revokeme@e2e.test', role: 'viewer' },
      });
      revokeInvId = json(inv).id;
    });

    it('200 — revokes pending invitation', async () => {
      const res = await inject('DELETE', `/api/team/invitations/${revokeInvId}`, {
        workosId: OWNER_WOS,
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(json(res).success, true);

      const row = await pool.query(
        'SELECT "status" FROM "Invitation" WHERE "invitationId" = $1',
        [revokeInvId],
      );
      assert.strictEqual(row.rows[0].status, 'revoked');
    });

    it('400 — cannot revoke already-revoked', async () => {
      const res = await inject('DELETE', `/api/team/invitations/${revokeInvId}`, {
        workosId: OWNER_WOS,
      });
      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('Sprint 2.5: POST /api/team/invitations/:id/resend', () => {
    let resendInvId;

    before(async () => {
      const inv = await inject('POST', '/api/team/invite', {
        workosId: OWNER_WOS,
        payload: { email: 'resend@e2e.test', role: 'member' },
      });
      resendInvId = json(inv).id;
    });

    it('200 — resends pending invitation email', async () => {
      const res = await inject('POST', `/api/team/invitations/${resendInvId}/resend`, {
        workosId: OWNER_WOS,
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(json(res).success, true);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  SPRINT 2.5: maxTools Enforcement
  // ════════════════════════════════════════════════════════════════════

  describe('Sprint 2.5: maxTools enforcement via POST /api/tools', () => {
    it('403 — blocked when at maxTools limit', async () => {
      const count = await pool.query(
        'SELECT COUNT(*)::int AS total FROM "AITool" WHERE "organizationId" = $1',
        [ownerOrgId],
      );
      await pool.query(
        'UPDATE "Plan" SET "maxTools" = $1 WHERE "name" = \'free\'',
        [count.rows[0].total],
      );

      const res = await inject('POST', '/api/tools', {
        workosId: OWNER_WOS,
        payload: { name: 'Blocked', vendorName: 'V' },
      });
      assert.strictEqual(res.statusCode, 403);

      // Restore
      await pool.query(
        'UPDATE "Plan" SET "maxTools" = 100 WHERE "name" = \'free\'',
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  Multi-tenancy Isolation
  // ════════════════════════════════════════════════════════════════════

  describe('Multi-tenancy: cross-org isolation', () => {
    before(async () => {
      // Create user in a separate org
      await application.iam.syncUserFromWorkOS.syncUser({
        id: OTHER_WOS, email: 'other@other-org.test', firstName: 'Other', lastName: 'Org',
      });
    });

    it('other org sees zero tools', async () => {
      const res = await inject('GET', '/api/tools', { workosId: OTHER_WOS });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(json(res).data.length, 0);
    });

    it('other org sees only own members', async () => {
      const res = await inject('GET', '/api/team/members', { workosId: OTHER_WOS });
      assert.strictEqual(res.statusCode, 200);
      const emails = json(res).members.map((m) => m.email);
      assert(!emails.includes('owner@e2e.test'), 'Should not see owner org');
      assert(emails.includes('other@other-org.test'), 'Should see self');
    });

    it('other org sees only own audit', async () => {
      const res = await inject('GET', '/api/auth/audit', { workosId: OTHER_WOS });
      assert.strictEqual(res.statusCode, 200);
      // Should have 0 or only own entries (not owner org entries)
      const body = json(res);
      for (const entry of body.data) {
        assert.notStrictEqual(entry.userId, ownerUserId,
          'Should not see owner org audit entries');
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  RBAC: Viewer cannot create/manage
  // ════════════════════════════════════════════════════════════════════

  describe('RBAC: viewer permissions', () => {
    const VIEWER_WOS = 'wos-e2e-viewer';

    before(async () => {
      // Create a viewer user in owner org via invite+register
      const inv = await inject('POST', '/api/team/invite', {
        workosId: OWNER_WOS,
        payload: { email: 'viewer@e2e.test', role: 'viewer' },
      });
      assert.strictEqual(inv.statusCode, 201);

      await application.iam.syncUserFromWorkOS.syncUser({
        id: VIEWER_WOS, email: 'viewer@e2e.test', firstName: 'View', lastName: 'Only',
      });
    });

    it('viewer can GET /api/tools (read)', async () => {
      const res = await inject('GET', '/api/tools', { workosId: VIEWER_WOS });
      assert.strictEqual(res.statusCode, 200);
    });

    it('viewer cannot POST /api/tools (create → 403)', async () => {
      const res = await inject('POST', '/api/tools', {
        workosId: VIEWER_WOS,
        payload: { name: 'ViewerTool', vendorName: 'V' },
      });
      assert.strictEqual(res.statusCode, 403);
    });

    it('viewer cannot DELETE /api/tools/:id (manage → 403)', async () => {
      // Use the classified tool from earlier
      const res = await inject('DELETE', `/api/tools/${classifiedToolId}`, {
        workosId: VIEWER_WOS,
      });
      assert.strictEqual(res.statusCode, 403);
    });

    it('viewer cannot POST /api/team/invite (manage User → 403)', async () => {
      const res = await inject('POST', '/api/team/invite', {
        workosId: VIEWER_WOS,
        payload: { email: 'nope@e2e.test', role: 'member' },
      });
      assert.strictEqual(res.statusCode, 403);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  Audit Trail verification
  // ════════════════════════════════════════════════════════════════════

  describe('Audit trail — all actions logged', () => {
    it('audit log has entries for tool CRUD + team management', async () => {
      const res = await inject('GET', '/api/auth/audit', {
        workosId: OWNER_WOS,
        query: { pageSize: '100' },
      });
      assert.strictEqual(res.statusCode, 200);
      const actions = json(res).data.map((e) => e.action);

      assert(actions.includes('create'), 'Should have create action');
      assert(actions.includes('update'), 'Should have update action');
      assert(actions.includes('delete'), 'Should have delete action');
      assert(actions.includes('classify'), 'Should have classify action');
    });
  });
});
