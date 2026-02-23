'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { setupTestDb, cleanupTestDb, closeTestDb } = require('../helpers/test-db.js');
const { buildFullSandbox } = require('../helpers/test-sandbox.js');
const {
  initRequestId, initErrorHandler, registerSandboxRoutes,
} = require('../../server/src/http.js');

describe('E2E: Sprint 3 — Compliance Score, Requirements, Dashboard, Classification History, Catalog Alternatives (real DB)', () => {
  let pool;
  let server;

  const OWNER_WOS = 'wos-sprint3-owner';
  const MEMBER_WOS = 'wos-sprint3-member';

  let ownerUserId;
  let ownerOrgId;
  let memberUserId;
  let toolId;
  let toolRiskLevel;
  let totalRequirementsCreated;
  let requirementId;
  let secondRequirementId;
  let allRequirementIds;
  let inviteToken;

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

    // Unlock plan limits for testing
    await pool.query(
      'UPDATE "Plan" SET "maxUsers" = 10, "maxTools" = 50 WHERE "name" = \'free\'',
    );

    const { api, application } = await buildFullSandbox(pool);

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

    // ── Create owner user + org ──
    const regResult = await application.iam.syncUserFromWorkOS.syncUser({
      id: OWNER_WOS,
      email: 'sprint3@e2e.test',
      firstName: 'Sprint3',
      lastName: 'Owner',
    });
    ownerUserId = regResult.user.id;
    ownerOrgId = regResult.user.organizationId;

    // ── Invite + create member user ──
    const invRes = await inject('POST', '/api/team/invite', {
      workosId: OWNER_WOS,
      payload: { email: 'member-sprint3@e2e.test', role: 'member' },
    });
    const invId = json(invRes).id;
    const tokenRow = await pool.query(
      'SELECT "token" FROM "Invitation" WHERE "invitationId" = $1', [invId],
    );
    inviteToken = tokenRow.rows[0].token;

    const memRegResult = await application.iam.syncUserFromWorkOS.syncUser({
      id: MEMBER_WOS,
      email: 'member-sprint3@e2e.test',
      firstName: 'Member',
      lastName: 'User',
    });
    memberUserId = memRegResult.user.id;

    // Accept invitation
    await inject('POST', '/api/team/accept-invite', {
      workosId: MEMBER_WOS,
      payload: { token: inviteToken },
    });

    // ── Register tool ──
    const toolRes = await inject('POST', '/api/tools', {
      workosId: OWNER_WOS,
      payload: { name: 'Sprint3 TestBot', vendorName: 'TestCorp' },
    });
    toolId = Number(json(toolRes).id);

    // ── Complete wizard (steps 2-4): employment domain → high risk ──
    await inject('PATCH', `/api/tools/${toolId}`, {
      workosId: OWNER_WOS,
      payload: { step: 2, purpose: 'HR screening chatbot', domain: 'employment' },
    });

    await inject('PATCH', `/api/tools/${toolId}`, {
      workosId: OWNER_WOS,
      payload: {
        step: 3,
        dataTypes: ['personal', 'biometric'],
        affectedPersons: ['applicants'],
        vulnerableGroups: false,
      },
    });

    await inject('PATCH', `/api/tools/${toolId}`, {
      workosId: OWNER_WOS,
      payload: {
        step: 4,
        autonomyLevel: 'semi_autonomous',
        humanOversight: true,
        affectsNaturalPersons: true,
      },
    });

    // ── Classify tool → creates requirements + classification ──
    const classRes = await inject('POST', `/api/tools/${toolId}/classify`, {
      workosId: OWNER_WOS,
    });
    const classBody = json(classRes);
    assert(classBody.riskLevel, 'Classification should return riskLevel');
    assert(classBody.requirementsCreated > 0, 'Should create requirements');
    toolRiskLevel = classBody.riskLevel;
    totalRequirementsCreated = classBody.requirementsCreated;
  });

  after(async () => {
    if (server) await server.close();
    await cleanupTestDb();
    await closeTestDb();
  });

  // ════════════════════════════════════════════════════════════════════
  //  US-025: ComplianceScoreCalculator (domain — real DB integration)
  // ════════════════════════════════════════════════════════════════════

  describe('US-025: ComplianceScoreCalculator', () => {
    it('newly classified tool has complianceScore = 0 (all requirements pending)', async () => {
      const res = await inject('GET', `/api/tools/${toolId}/requirements`, {
        workosId: OWNER_WOS,
      });
      const body = json(res);
      assert.strictEqual(body.complianceScore, 0,
        'All requirements start as pending → score must be 0');
    });

    it('completing one requirement increases score proportionally', async () => {
      // Get all requirements
      const reqRes = await inject('GET', `/api/tools/${toolId}/requirements`, {
        workosId: OWNER_WOS,
      });
      const reqBody = json(reqRes);
      allRequirementIds = [];
      for (const group of reqBody.groups) {
        for (const req of group.requirements) {
          allRequirementIds.push(req.toolRequirementId);
        }
      }
      requirementId = allRequirementIds[0];
      secondRequirementId = allRequirementIds.length > 1 ? allRequirementIds[1] : null;

      // Complete the first requirement
      const patchRes = await inject('PATCH', `/api/tools/${toolId}/requirements/${requirementId}`, {
        workosId: OWNER_WOS,
        payload: { status: 'completed' },
      });
      const patchBody = json(patchRes);

      // Score should be 100 / totalRequirements (rounded)
      const applicableCount = allRequirementIds.length;
      const expectedScore = Math.round((100 / (applicableCount * 100)) * 100);
      assert.strictEqual(patchBody.complianceScore, expectedScore,
        `1 of ${applicableCount} completed → score = ${expectedScore}`);
    });

    it('in_progress with 50% adds partial score', async () => {
      if (!secondRequirementId) return;

      const patchRes = await inject('PATCH', `/api/tools/${toolId}/requirements/${secondRequirementId}`, {
        workosId: OWNER_WOS,
        payload: { status: 'in_progress', progress: 50 },
      });
      const body = json(patchRes);

      // Score: (100 + 50) / (N * 100) * 100
      const applicableCount = allRequirementIds.length;
      const expectedScore = Math.round((150 / (applicableCount * 100)) * 100);
      assert.strictEqual(body.complianceScore, expectedScore,
        `1 completed + 1 at 50% of ${applicableCount} → score = ${expectedScore}`);
    });

    it('completing ALL requirements yields score 100', async () => {
      // Complete all remaining requirements
      for (const reqId of allRequirementIds) {
        await inject('PATCH', `/api/tools/${toolId}/requirements/${reqId}`, {
          workosId: OWNER_WOS,
          payload: { status: 'completed' },
        });
      }

      const res = await inject('GET', `/api/tools/${toolId}/requirements`, {
        workosId: OWNER_WOS,
      });
      const body = json(res);
      assert.strictEqual(body.complianceScore, 100, 'All completed → score must be 100');

      // Verify AITool.complianceStatus = 'compliant' in DB
      const row = await pool.query(
        'SELECT "complianceScore", "complianceStatus" FROM "AITool" WHERE "aIToolId" = $1',
        [toolId],
      );
      assert.strictEqual(row.rows[0].complianceScore, 100);
      assert.strictEqual(row.rows[0].complianceStatus, 'compliant');
    });

    it('un-completing drops score and reverts complianceStatus to in_progress', async () => {
      // Un-complete the first requirement
      await inject('PATCH', `/api/tools/${toolId}/requirements/${requirementId}`, {
        workosId: OWNER_WOS,
        payload: { status: 'pending' },
      });

      const row = await pool.query(
        'SELECT "complianceScore", "complianceStatus" FROM "AITool" WHERE "aIToolId" = $1',
        [toolId],
      );
      assert(row.rows[0].complianceScore < 100, 'Score should drop below 100');
      assert.strictEqual(row.rows[0].complianceStatus, 'in_progress',
        'Status should revert to in_progress');
    });

    it('not_applicable requirements are excluded from denominator', async () => {
      // Mark first requirement as not_applicable
      await inject('PATCH', `/api/tools/${toolId}/requirements/${requirementId}`, {
        workosId: OWNER_WOS,
        payload: { status: 'not_applicable' },
      });

      const res = await inject('GET', `/api/tools/${toolId}/requirements`, {
        workosId: OWNER_WOS,
      });
      const body = json(res);

      // All others are completed, one is not_applicable → score should be 100
      assert.strictEqual(body.complianceScore, 100,
        'Excluded not_applicable → all remaining completed → 100');

      // Reset back to pending for further tests
      await inject('PATCH', `/api/tools/${toolId}/requirements/${requirementId}`, {
        workosId: OWNER_WOS,
        payload: { status: 'pending' },
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  US-026: GET /api/tools/:id/requirements
  // ════════════════════════════════════════════════════════════════════

  describe('US-026: GET /api/tools/:id/requirements', () => {
    it('200 — returns requirements grouped by article with correct structure', async () => {
      const res = await inject('GET', `/api/tools/${toolId}/requirements`, {
        workosId: OWNER_WOS,
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);

      assert.strictEqual(body.toolId, toolId);
      assert.strictEqual(body.toolName, 'Sprint3 TestBot');
      assert.strictEqual(body.riskLevel, toolRiskLevel);
      assert(body.totalRequirements > 0, 'Should have requirements');
      assert(body.totalRequirements === totalRequirementsCreated,
        `totalRequirements (${body.totalRequirements}) should match created (${totalRequirementsCreated})`);
      assert(typeof body.complianceScore === 'number');
    });

    it('200 — each group has articleReference + requirements array', async () => {
      const res = await inject('GET', `/api/tools/${toolId}/requirements`, {
        workosId: OWNER_WOS,
      });
      const body = json(res);

      for (const group of body.groups) {
        assert(group.articleReference, 'Group must have articleReference');
        assert(group.articleReference.startsWith('Art.'),
          `articleReference should start with "Art.", got: ${group.articleReference}`);
        assert(Array.isArray(group.requirements), 'Group must have requirements array');
        assert(group.requirements.length > 0, 'Group must have at least one requirement');
        assert(typeof group.total === 'number', 'Group must have total count');
        assert(typeof group.completed === 'number', 'Group must have completed count');
      }
    });

    it('200 — each requirement has deployer-specific fields', async () => {
      const res = await inject('GET', `/api/tools/${toolId}/requirements`, {
        workosId: OWNER_WOS,
      });
      const body = json(res);
      const firstReq = body.groups[0].requirements[0];

      assert(firstReq.toolRequirementId, 'Should have toolRequirementId');
      assert(firstReq.code, 'Should have code');
      assert(firstReq.name, 'Should have name');
      assert(firstReq.articleReference || firstReq.reqRiskLevel,
        'Should have article or risk level');
      assert(typeof firstReq.estimatedEffortHours === 'number',
        'Should have estimatedEffortHours as number');
      assert(firstReq.guidance, 'Should have guidance text');
      assert(firstReq.status, 'Should have status');
    });

    it('200 — sum of all group requirements equals totalRequirements', async () => {
      const res = await inject('GET', `/api/tools/${toolId}/requirements`, {
        workosId: OWNER_WOS,
      });
      const body = json(res);
      let sum = 0;
      for (const group of body.groups) {
        sum += group.requirements.length;
      }
      assert.strictEqual(sum, body.totalRequirements,
        'Sum of group requirements must equal totalRequirements');
    });

    it('404 — non-existent tool', async () => {
      const res = await inject('GET', '/api/tools/99999/requirements', {
        workosId: OWNER_WOS,
      });
      assert.strictEqual(res.statusCode, 404);
    });

    it('401 — without session', async () => {
      const res = await inject('GET', `/api/tools/${toolId}/requirements`);
      assert.strictEqual(res.statusCode, 401);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  US-027: PATCH /api/tools/:id/requirements/:requirementId
  // ════════════════════════════════════════════════════════════════════

  describe('US-027: PATCH /api/tools/:id/requirements/:requirementId', () => {
    it('200 — updates status to in_progress with progress', async () => {
      const res = await inject('PATCH', `/api/tools/${toolId}/requirements/${requirementId}`, {
        workosId: OWNER_WOS,
        payload: { status: 'in_progress', progress: 50 },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert.strictEqual(body.requirement.status, 'in_progress');
      assert.strictEqual(body.requirement.progress, 50);
      assert(typeof body.complianceScore === 'number', 'Should return recalculated score');
    });

    it('200 — status=completed auto-sets progress=100 + completedAt', async () => {
      const res = await inject('PATCH', `/api/tools/${toolId}/requirements/${requirementId}`, {
        workosId: OWNER_WOS,
        payload: { status: 'completed' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert.strictEqual(body.requirement.status, 'completed');
      assert(body.requirement.completedAt, 'completedAt should be set to ISO string');
      assert(body.requirement.completedAt.includes('T'),
        'completedAt should be ISO format');

      // Verify progress auto-set to 100
      const row = await pool.query(
        'SELECT "progress" FROM "ToolRequirement" WHERE "toolRequirementId" = $1',
        [requirementId],
      );
      assert.strictEqual(row.rows[0].progress, 100, 'progress auto-set to 100');
    });

    it('200 — un-completing clears completedAt', async () => {
      const res = await inject('PATCH', `/api/tools/${toolId}/requirements/${requirementId}`, {
        workosId: OWNER_WOS,
        payload: { status: 'in_progress', progress: 75 },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert.strictEqual(body.requirement.completedAt, null, 'completedAt should be cleared');
    });

    it('200 — updates notes field', async () => {
      const res = await inject('PATCH', `/api/tools/${toolId}/requirements/${requirementId}`, {
        workosId: OWNER_WOS,
        payload: { notes: 'Reviewed by legal team on 2026-02-12' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert.strictEqual(body.requirement.notes, 'Reviewed by legal team on 2026-02-12');
    });

    it('400 — empty body rejected by Zod refine', async () => {
      const res = await inject('PATCH', `/api/tools/${toolId}/requirements/${requirementId}`, {
        workosId: OWNER_WOS,
        payload: {},
      });
      assert.strictEqual(res.statusCode, 400);
    });

    it('400 — invalid status value', async () => {
      const res = await inject('PATCH', `/api/tools/${toolId}/requirements/${requirementId}`, {
        workosId: OWNER_WOS,
        payload: { status: 'invalid_status' },
      });
      assert.strictEqual(res.statusCode, 400);
    });

    it('400 — progress out of range (101)', async () => {
      const res = await inject('PATCH', `/api/tools/${toolId}/requirements/${requirementId}`, {
        workosId: OWNER_WOS,
        payload: { progress: 101 },
      });
      assert.strictEqual(res.statusCode, 400);
    });

    it('404 — non-existent tool', async () => {
      const res = await inject('PATCH', `/api/tools/99999/requirements/${requirementId}`, {
        workosId: OWNER_WOS,
        payload: { status: 'completed' },
      });
      assert.strictEqual(res.statusCode, 404);
    });

    it('404 — non-existent requirement', async () => {
      const res = await inject('PATCH', `/api/tools/${toolId}/requirements/99999`, {
        workosId: OWNER_WOS,
        payload: { status: 'completed' },
      });
      assert.strictEqual(res.statusCode, 404);
    });

    it('401 — without session', async () => {
      const res = await inject('PATCH', `/api/tools/${toolId}/requirements/${requirementId}`, {
        payload: { status: 'completed' },
      });
      assert.strictEqual(res.statusCode, 401);
    });

    it('creates audit log entry with correct resource + action', async () => {
      const row = await pool.query(
        `SELECT * FROM "AuditLog"
         WHERE "resource" = 'ToolRequirement' AND "action" = 'update'
         AND "organizationId" = $1
         ORDER BY "auditLogId" DESC LIMIT 1`,
        [ownerOrgId],
      );
      assert(row.rows.length > 0, 'Should have audit entry for requirement update');
      assert.strictEqual(row.rows[0].action, 'update');
      assert.strictEqual(row.rows[0].resource, 'ToolRequirement');
      assert.strictEqual(row.rows[0].userId, ownerUserId);
    });

    it('recalculates complianceScore on AITool in DB after each update', async () => {
      // Complete one more requirement
      if (secondRequirementId) {
        await inject('PATCH', `/api/tools/${toolId}/requirements/${secondRequirementId}`, {
          workosId: OWNER_WOS,
          payload: { status: 'completed' },
        });
      }
      const row = await pool.query(
        'SELECT "complianceScore" FROM "AITool" WHERE "aIToolId" = $1',
        [toolId],
      );
      assert(row.rows[0].complianceScore > 0, 'complianceScore should be > 0 after completing reqs');
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  US-028: GET /api/tools/:id/classification-history
  // ════════════════════════════════════════════════════════════════════

  describe('US-028: GET /api/tools/:id/classification-history', () => {
    it('200 — returns current classification with correct fields', async () => {
      const res = await inject('GET', `/api/tools/${toolId}/classification-history`, {
        workosId: OWNER_WOS,
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);

      assert.strictEqual(body.toolId, toolId);
      assert.strictEqual(body.toolName, 'Sprint3 TestBot');
      assert(body.current, 'Should have current classification');
      assert.strictEqual(body.current.riskLevel, toolRiskLevel);
      assert.strictEqual(body.current.isCurrent, true);
      assert(body.current.confidence > 0, 'confidence should be > 0');
      assert(body.current.method, 'Should have method (rule_only)');
      assert(body.current.version >= 1, 'version should be >= 1');
      assert(body.current.classifiedByEmail, 'Should have classifiedByEmail');
    });

    it('200 — after re-classify: 2 versions, history sorted DESC', async () => {
      // Re-classify to create history
      await inject('POST', `/api/tools/${toolId}/classify`, { workosId: OWNER_WOS });

      const res = await inject('GET', `/api/tools/${toolId}/classification-history`, {
        workosId: OWNER_WOS,
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);

      assert.strictEqual(body.totalVersions, 2);
      assert.strictEqual(body.current.isCurrent, true);
      assert.strictEqual(body.current.version, 2);
      assert.strictEqual(body.history.length, 1);
      assert.strictEqual(body.history[0].isCurrent, false);
      assert.strictEqual(body.history[0].version, 1);
      assert(body.history[0].version < body.current.version,
        'History should be older than current');
    });

    it('200 — after 3rd re-classify: 3 versions, history sorted by version DESC', async () => {
      await inject('POST', `/api/tools/${toolId}/classify`, { workosId: OWNER_WOS });

      const res = await inject('GET', `/api/tools/${toolId}/classification-history`, {
        workosId: OWNER_WOS,
      });
      const body = json(res);

      assert.strictEqual(body.totalVersions, 3);
      assert.strictEqual(body.current.version, 3);
      assert.strictEqual(body.history.length, 2);
      // History sorted by version DESC
      assert(body.history[0].version > body.history[1].version,
        'History must be sorted by version DESC');
    });

    it('200 — unclassified tool returns null current', async () => {
      // Register a new tool without classifying
      const draftRes = await inject('POST', '/api/tools', {
        workosId: OWNER_WOS,
        payload: { name: 'Unclassified Tool', vendorName: 'V' },
      });
      const draftId = Number(json(draftRes).id);

      const res = await inject('GET', `/api/tools/${draftId}/classification-history`, {
        workosId: OWNER_WOS,
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);

      assert.strictEqual(body.current, null, 'No classifications → null current');
      assert.strictEqual(body.history.length, 0, 'No history');
      assert.strictEqual(body.totalVersions, 0);
    });

    it('404 — non-existent tool', async () => {
      const res = await inject('GET', '/api/tools/99999/classification-history', {
        workosId: OWNER_WOS,
      });
      assert.strictEqual(res.statusCode, 404);
    });

    it('401 — without session', async () => {
      const res = await inject('GET', `/api/tools/${toolId}/classification-history`);
      assert.strictEqual(res.statusCode, 401);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  US-029: GET /api/dashboard/summary
  // ════════════════════════════════════════════════════════════════════

  describe('US-029: GET /api/dashboard/summary', () => {
    it('200 — tool counts match real DB state', async () => {
      const res = await inject('GET', '/api/dashboard/summary', { workosId: OWNER_WOS });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);

      // We created 2 tools: Sprint3 TestBot (classified) + Unclassified Tool
      assert(body.tools.total >= 2, `Should have >= 2 tools, got ${body.tools.total}`);
      assert(body.tools.classified >= 1, 'At least 1 classified tool');
      assert(body.tools.unclassified >= 1, 'At least 1 unclassified tool');
      assert.strictEqual(body.tools.total, body.tools.classified + body.tools.unclassified,
        'total = classified + unclassified');
    });

    it('200 — riskDistribution matches classified tools', async () => {
      const res = await inject('GET', '/api/dashboard/summary', { workosId: OWNER_WOS });
      const body = json(res);

      // Our tool is high risk (employment + biometric + applicants)
      const rd = body.riskDistribution;
      assert(typeof rd.prohibited === 'number');
      assert(typeof rd.high === 'number');
      assert(typeof rd.gpai === 'number');
      assert(typeof rd.limited === 'number');
      assert(typeof rd.minimal === 'number');

      // Sum of risk distribution should equal classified tools
      const rdSum = rd.prohibited + rd.high + rd.gpai + rd.limited + rd.minimal;
      assert.strictEqual(rdSum, body.tools.classified,
        `Risk distribution sum (${rdSum}) should equal classified tools (${body.tools.classified})`);

      // Our employment tool should be in high-risk bucket
      assert(rd.high >= 1, 'Should have at least 1 high-risk tool (employment domain)');
    });

    it('200 — complianceScore is calculated from real tools', async () => {
      const res = await inject('GET', '/api/dashboard/summary', { workosId: OWNER_WOS });
      const body = json(res);

      assert(typeof body.complianceScore === 'number');
      assert(body.complianceScore >= 0 && body.complianceScore <= 100,
        `complianceScore should be 0-100, got ${body.complianceScore}`);
    });

    it('200 — requiresAttention flags high-risk tool with complianceScore 0', async () => {
      // Reset ALL requirements to pending so complianceScore drops to 0
      // (business logic only flags tools with score === 0)
      for (const reqId of allRequirementIds) {
        await inject('PATCH', `/api/tools/${toolId}/requirements/${reqId}`, {
          workosId: OWNER_WOS,
          payload: { status: 'pending' },
        });
      }

      // Verify score is now 0
      const toolRow = await pool.query(
        'SELECT "complianceScore" FROM "AITool" WHERE "aIToolId" = $1', [toolId],
      );
      assert.strictEqual(toolRow.rows[0].complianceScore, 0, 'Score should be 0 after resetting all');

      const res = await inject('GET', '/api/dashboard/summary', { workosId: OWNER_WOS });
      const body = json(res);

      assert(Array.isArray(body.requiresAttention));
      const highAttention = body.requiresAttention.filter((a) => a.severity === 'high');
      assert(highAttention.length >= 1,
        'Should flag high-risk tool with no compliance progress');
      assert(highAttention[0].toolName, 'Should include tool name');
      assert(highAttention[0].reason, 'Should include reason');
    });

    it('200 — AI Literacy stub returns zeros with future message', async () => {
      const res = await inject('GET', '/api/dashboard/summary', { workosId: OWNER_WOS });
      const body = json(res);

      assert.strictEqual(body.aiLiteracy.totalEmployees, 0);
      assert.strictEqual(body.aiLiteracy.trained, 0);
      assert.strictEqual(body.aiLiteracy.completionRate, 0);
      assert(body.aiLiteracy.message.includes('future'),
        'Should mention "future" in stub message');
    });

    it('200 — timeline has 3 AI Act dates with daysUntil', async () => {
      const res = await inject('GET', '/api/dashboard/summary', { workosId: OWNER_WOS });
      const body = json(res);

      assert.strictEqual(body.timeline.length, 3);
      for (const entry of body.timeline) {
        assert(entry.date, 'Timeline entry must have date');
        assert(entry.title, 'Timeline entry must have title');
        assert(entry.description, 'Timeline entry must have description');
        assert(typeof entry.daysUntil === 'number', 'daysUntil must be a number');
      }
      // First deadline (Feb 2025) should be in the past
      assert(body.timeline[0].daysUntil < 0, 'Feb 2025 deadline should be past');
      // Last deadline (Aug 2026) should be in the future
      assert(body.timeline[2].daysUntil > 0, 'Aug 2026 deadline should be future');
    });

    it('200 — recentActivity shows audit log entries', async () => {
      const res = await inject('GET', '/api/dashboard/summary', { workosId: OWNER_WOS });
      const body = json(res);

      assert(Array.isArray(body.recentActivity));
      assert(body.recentActivity.length > 0, 'Should have recent activity from test actions');
      assert(body.recentActivity[0].action, 'Activity should have action');
    });

    it('200 — planLimits shows tools + users limits', async () => {
      const res = await inject('GET', '/api/dashboard/summary', { workosId: OWNER_WOS });
      const body = json(res);

      assert(body.planLimits, 'Should have planLimits');
      assert(body.planLimits.tools, 'Should have tools limits');
      assert(typeof body.planLimits.tools.current === 'number');
      assert(typeof body.planLimits.tools.limit === 'number',
        `tools.limit should be number, got ${typeof body.planLimits.tools.limit}`);
      assert(typeof body.planLimits.tools.allowed === 'boolean');
      assert(body.planLimits.users, 'Should have users limits');
      assert(typeof body.planLimits.users.current === 'number');
      assert(typeof body.planLimits.users.limit === 'number',
        `users.limit should be number, got ${typeof body.planLimits.users.limit}`);
      assert(typeof body.planLimits.users.allowed === 'boolean');
    });

    it('200 — member sees only own tools, not all org tools', async () => {
      // Register a tool as member
      const memberToolRes = await inject('POST', '/api/tools', {
        workosId: MEMBER_WOS,
        payload: { name: 'Member Only Tool', vendorName: 'V' },
      });
      assert.strictEqual(memberToolRes.statusCode, 201);

      // Member dashboard should show fewer tools than owner
      const memberDash = await inject('GET', '/api/dashboard/summary', { workosId: MEMBER_WOS });
      const ownerDash = await inject('GET', '/api/dashboard/summary', { workosId: OWNER_WOS });

      const memberBody = json(memberDash);
      const ownerBody = json(ownerDash);

      assert(memberBody.tools.total < ownerBody.tools.total,
        `Member tools (${memberBody.tools.total}) should be < owner tools (${ownerBody.tools.total})`);
      assert.strictEqual(memberBody.tools.total, 1,
        'Member should only see their 1 tool');
    });

    it('401 — without session', async () => {
      const res = await inject('GET', '/api/dashboard/summary');
      assert.strictEqual(res.statusCode, 401);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  US-030: Catalog Alternatives (domain + maxRisk filters)
  // ════════════════════════════════════════════════════════════════════

  describe('US-030: GET /api/tools/catalog/search — domain + maxRisk filters', () => {
    it('200 — maxRisk=limited excludes high and prohibited tools', async () => {
      const res = await inject('GET', '/api/tools/catalog/search', {
        query: { maxRisk: 'limited' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert(body.data.length > 0, 'Should have results');
      for (const tool of body.data) {
        assert(
          ['limited', 'minimal'].includes(tool.defaultRiskLevel) || tool.defaultRiskLevel === null,
          `Tool ${tool.name} risk=${tool.defaultRiskLevel} should be limited/minimal`,
        );
      }
    });

    it('200 — maxRisk=minimal returns only minimal tools', async () => {
      const res = await inject('GET', '/api/tools/catalog/search', {
        query: { maxRisk: 'minimal' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      for (const tool of body.data) {
        assert(
          tool.defaultRiskLevel === 'minimal' || tool.defaultRiskLevel === null,
          `Tool ${tool.name} should be minimal, got ${tool.defaultRiskLevel}`,
        );
      }
    });

    it('200 — maxRisk=high includes all risk levels', async () => {
      const allRes = await inject('GET', '/api/tools/catalog/search', {
        query: { pageSize: '100' },
      });
      const highRes = await inject('GET', '/api/tools/catalog/search', {
        query: { maxRisk: 'high', pageSize: '100' },
      });
      const allBody = json(allRes);
      const highBody = json(highRes);

      // maxRisk=high allows high+gpai+limited+minimal → should include most tools
      assert(highBody.pagination.total >= allBody.pagination.total * 0.7,
        'maxRisk=high should include most catalog tools');
    });

    it('200 — category=api_platform returns new Sprint 3 catalog entries', async () => {
      const res = await inject('GET', '/api/tools/catalog/search', {
        query: { category: 'api_platform' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert(body.data.length >= 15, `Should have >=15 api_platform tools, got ${body.data.length}`);
      for (const tool of body.data) {
        assert.strictEqual(tool.category, 'api_platform');
      }
      // Verify specific known tools
      const names = body.data.map((t) => t.name);
      assert(names.some((n) => n.includes('OpenAI')), 'Should include OpenAI API');
      assert(names.some((n) => n.includes('Claude') || n.includes('Anthropic')),
        'Should include Anthropic/Claude API');
    });

    it('200 — domain filter works on JSONB domains field', async () => {
      const res = await inject('GET', '/api/tools/catalog/search', {
        query: { domain: 'coding' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      assert(body.data.length > 0, 'Should find tools with coding domain');
      // Verify each result mentions coding in domains
      for (const tool of body.data) {
        const domains = typeof tool.domains === 'string'
          ? JSON.parse(tool.domains) : tool.domains;
        assert(JSON.stringify(domains).includes('coding'),
          `Tool ${tool.name} domains should contain "coding"`);
      }
    });

    it('200 — combined filters: maxRisk + category narrows results', async () => {
      const res = await inject('GET', '/api/tools/catalog/search', {
        query: { maxRisk: 'limited', category: 'chatbot' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = json(res);
      for (const tool of body.data) {
        assert.strictEqual(tool.category, 'chatbot');
        assert(
          ['limited', 'minimal'].includes(tool.defaultRiskLevel) || tool.defaultRiskLevel === null,
          'Should respect maxRisk filter',
        );
      }
    });

    it('200 — pagination works with filters', async () => {
      const page1 = await inject('GET', '/api/tools/catalog/search', {
        query: { maxRisk: 'high', page: '1', pageSize: '5' },
      });
      const body1 = json(page1);
      assert.strictEqual(body1.data.length, 5);
      assert.strictEqual(body1.pagination.page, 1);
      assert.strictEqual(body1.pagination.pageSize, 5);
      assert(body1.pagination.totalPages > 1, 'Should have multiple pages');

      const page2 = await inject('GET', '/api/tools/catalog/search', {
        query: { maxRisk: 'high', page: '2', pageSize: '5' },
      });
      const body2 = json(page2);
      assert.strictEqual(body2.pagination.page, 2);
      // Results should be different from page 1
      assert.notStrictEqual(body1.data[0].name, body2.data[0].name,
        'Page 2 should have different tools than page 1');
    });
  });
});
