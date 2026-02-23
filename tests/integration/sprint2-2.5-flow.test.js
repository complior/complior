'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { setupTestDb, closeTestDb } = require('../helpers/test-db.js');
const { createTestSandbox, loadAppDeepDir, loadAppModule } = require('../helpers/test-sandbox.js');

describe('Integration: Sprint 2 + 2.5 (real DB)', () => {
  let pool;
  let sandbox;
  let ownerUser;

  before(async () => {
    pool = await setupTestDb();
    sandbox = createTestSandbox(pool);

    const audit = await loadAppModule('lib/audit.js', sandbox);
    const permissions = await loadAppModule('lib/permissions.js', sandbox);
    const tenant = await loadAppModule('lib/tenant.js', sandbox);
    sandbox.lib = { audit, permissions, tenant };

    const domain = await loadAppDeepDir('domain', sandbox);
    sandbox.domain = domain;

    const application = await loadAppDeepDir('application', sandbox);
    sandbox.application = application;

    // Create owner user via webhook (Sprint 1 baseline)
    const result = await sandbox.application.iam.syncUserFromWorkOS.syncUser({
      id: 'wos-s2-owner',
      email: 'owner@sprint2.test',
      firstName: 'Sprint2',
      lastName: 'Owner',
    });
    ownerUser = result.user;
  });

  after(async () => {
    if (pool) {
      const client = await pool.connect();
      try {
        const tables = [
          'AuditLog', 'Notification', 'ChatMessage', 'Conversation',
          'ImpactAssessment', 'FRIASection', 'FRIAAssessment',
          'LiteracyCompletion', 'LiteracyRequirement',
          'ChecklistItem', 'DocumentSection', 'ComplianceDocument',
          'ToolRequirement', 'ClassificationLog', 'RiskClassification',
          'AIToolDiscovery', 'AITool', 'TrainingModule', 'TrainingCourse',
          'Invitation', 'Subscription', 'UserRole', 'Permission', 'Role',
          'User', 'Organization',
        ];
        for (const table of tables) {
          await client.query(`DELETE FROM "${table}"`);
        }
      } finally {
        client.release();
      }
      await closeTestDb();
    }
  });

  // ──────────────────── Sprint 2: US-016+017 ────────────────────

  describe('US-016+017: AI Tool CRUD + Wizard Steps', () => {
    let toolId;

    it('registers a new AI tool (Step 1)', async () => {
      const tool = await sandbox.application.inventory.registerTool.create({
        body: { name: 'TestBot', vendorName: 'TestVendor' },
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });
      toolId = tool.id;
      assert(toolId, 'Tool should have an ID');

      const row = await pool.query(
        'SELECT * FROM "AITool" WHERE "aIToolId" = $1',
        [toolId],
      );
      assert.strictEqual(row.rows.length, 1);
      assert.strictEqual(row.rows[0].name, 'TestBot');
      assert.strictEqual(row.rows[0].wizardStep, 1);
      assert.strictEqual(row.rows[0].wizardCompleted, false);
      assert.strictEqual(row.rows[0].complianceStatus, 'not_started');
      assert.strictEqual(row.rows[0].organizationId, ownerUser.organizationId);
    });

    it('updates step 2 (purpose, domain)', async () => {
      const updated = await sandbox.application.inventory.updateToolStep.update({
        toolId,
        step: 2,
        body: { purpose: 'Customer support chatbot', domain: 'customer_service' },
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });
      assert.strictEqual(updated.wizardStep, 3);
      assert.strictEqual(updated.purpose, 'Customer support chatbot');
    });

    it('updates step 3 (dataTypes, affectedPersons)', async () => {
      const updated = await sandbox.application.inventory.updateToolStep.update({
        toolId,
        step: 3,
        body: {
          dataTypes: ['personal'],
          affectedPersons: ['employees'],
          vulnerableGroups: false,
        },
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });
      assert.strictEqual(updated.wizardStep, 4);
    });

    it('updates step 4 (autonomy, oversight) → wizardCompleted=true', async () => {
      const updated = await sandbox.application.inventory.updateToolStep.update({
        toolId,
        step: 4,
        body: {
          autonomyLevel: 'advisory',
          humanOversight: true,
          affectsNaturalPersons: false,
        },
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });
      assert.strictEqual(updated.wizardCompleted, true);
    });

    it('tool visible in DB with all steps data', async () => {
      const row = await pool.query(
        'SELECT * FROM "AITool" WHERE "aIToolId" = $1',
        [toolId],
      );
      const tool = row.rows[0];
      assert.strictEqual(tool.wizardCompleted, true);
      assert.strictEqual(tool.purpose, 'Customer support chatbot');
      assert.strictEqual(tool.autonomyLevel, 'advisory');
    });
  });

  // ──────────────────── Sprint 2: US-019+020 ────────────────────

  describe('US-019+020: Classification + Requirements', () => {
    let toolId;

    before(async () => {
      // Create and complete a wizard for classification
      const tool = await sandbox.application.inventory.registerTool.create({
        body: { name: 'HR Screener', vendorName: 'HRTech' },
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });
      toolId = tool.id;

      await sandbox.application.inventory.updateToolStep.update({
        toolId, step: 2,
        body: { purpose: 'Screen job applicants', domain: 'employment' },
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });
      await sandbox.application.inventory.updateToolStep.update({
        toolId, step: 3,
        body: {
          dataTypes: ['biometric', 'personal'],
          affectedPersons: ['applicants'],
          vulnerableGroups: false,
        },
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });
      await sandbox.application.inventory.updateToolStep.update({
        toolId, step: 4,
        body: {
          autonomyLevel: 'semi_autonomous',
          humanOversight: true,
          affectsNaturalPersons: true,
        },
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });
    });

    it('classifies a completed tool via RuleEngine', async () => {
      const result = await sandbox.application.classification.classifyTool.classify({
        toolId,
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });
      assert(result.riskLevel, 'Should have a riskLevel');
      assert(result.confidence > 0, 'Confidence should be positive');
      assert(result.matchedRules.length > 0, 'Should match some rules');
    });

    it('RiskClassification record persisted with isCurrent=true', async () => {
      const row = await pool.query(
        'SELECT * FROM "RiskClassification" WHERE "aiToolId" = $1 AND "isCurrent" = true',
        [toolId],
      );
      assert.strictEqual(row.rows.length, 1);
      assert.strictEqual(row.rows[0].method, 'rule_only');
      assert.strictEqual(row.rows[0].version, 1);
    });

    it('AITool updated with riskLevel and complianceStatus=in_progress', async () => {
      const row = await pool.query(
        'SELECT "riskLevel", "complianceStatus" FROM "AITool" WHERE "aIToolId" = $1',
        [toolId],
      );
      assert(row.rows[0].riskLevel !== null);
      assert.strictEqual(row.rows[0].complianceStatus, 'in_progress');
    });

    it('ToolRequirements created based on risk level', async () => {
      const row = await pool.query(
        'SELECT COUNT(*)::int AS total FROM "ToolRequirement" WHERE "aiToolId" = $1',
        [toolId],
      );
      assert(row.rows[0].total > 0, 'Should have requirements mapped');
    });

    it('AuditLog records classification', async () => {
      const row = await pool.query(
        `SELECT * FROM "AuditLog"
         WHERE "resourceId" = $1 AND "action" = 'classify'`,
        [toolId],
      );
      assert.strictEqual(row.rows.length, 1);
    });
  });

  // ──────────────────── Sprint 2.5: US-031 ────────────────────

  describe('US-031: Subscription Limits', () => {
    before(async () => {
      // Reset free plan to seed values (may be dirty from previous runs)
      await pool.query(
        'UPDATE "Plan" SET "maxUsers" = 1, "maxTools" = 5 WHERE "name" = \'free\'',
      );
    });

    it('checkUsers allowed for owner alone (free plan, maxUsers=1)', async () => {
      const result = await sandbox.application.billing.getOrgLimits.checkUsers(
        ownerUser.organizationId,
      );
      // free plan maxUsers=1, owner is the only user, 0 pending invites
      // current = 1 (user count) + 0 (pending) = 1, limit = 1 → NOT allowed
      assert.strictEqual(result.limit, 1);
      assert.strictEqual(typeof result.allowed, 'boolean');
    });

    it('checkTools allowed when under limit', async () => {
      const result = await sandbox.application.billing.getOrgLimits.checkTools(
        ownerUser.organizationId,
      );
      assert.strictEqual(result.limit, 5); // free plan
      assert.strictEqual(result.allowed, true);
    });

    it('getLimits returns both users and tools', async () => {
      const result = await sandbox.application.billing.getOrgLimits.getLimits(
        ownerUser.organizationId,
      );
      assert(result.users, 'Should have users limits');
      assert(result.tools, 'Should have tools limits');
      assert.strictEqual(result.users.limit, 1);
      assert.strictEqual(result.tools.limit, 5);
    });
  });

  // ──────────────────── Sprint 2.5: US-032 ────────────────────

  describe('US-032: Create Invitation', () => {
    it('owner creates invitation — Invitation row in DB', async () => {
      // First upgrade plan to allow invites (free maxUsers=1 blocks immediately)
      await pool.query(
        'UPDATE "Plan" SET "maxUsers" = 10 WHERE "name" = \'free\'',
      );

      const invitation = await sandbox.application.iam.createInvitation.create({
        email: 'invited@sprint2.test',
        role: 'member',
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });

      assert(invitation.id, 'Invitation should have ID');

      const row = await pool.query(
        'SELECT * FROM "Invitation" WHERE "invitationId" = $1',
        [invitation.id],
      );
      assert.strictEqual(row.rows.length, 1);
      assert.strictEqual(row.rows[0].email, 'invited@sprint2.test');
      assert.strictEqual(row.rows[0].role, 'member');
      assert.strictEqual(row.rows[0].status, 'pending');
      assert(row.rows[0].token, 'Should have UUID token');
      assert(row.rows[0].expiresAt, 'Should have expiry');
    });

    it('409 for duplicate pending invitation', async () => {
      await assert.rejects(
        () => sandbox.application.iam.createInvitation.create({
          email: 'invited@sprint2.test',
          role: 'member',
          userId: ownerUser.id,
          organizationId: ownerUser.organizationId,
        }),
        (err) => err.code === 'CONFLICT',
      );
    });

    it('403 PLAN_LIMIT_EXCEEDED when maxUsers exceeded', async () => {
      await pool.query(
        'UPDATE "Plan" SET "maxUsers" = 1 WHERE "name" = \'free\'',
      );

      await assert.rejects(
        () => sandbox.application.iam.createInvitation.create({
          email: 'another@sprint2.test',
          role: 'member',
          userId: ownerUser.id,
          organizationId: ownerUser.organizationId,
        }),
        (err) => err.code === 'PLAN_LIMIT_EXCEEDED',
      );

      // Restore for subsequent tests
      await pool.query(
        'UPDATE "Plan" SET "maxUsers" = 10 WHERE "name" = \'free\'',
      );
    });

    it('AuditLog records invitation creation', async () => {
      const row = await pool.query(
        `SELECT * FROM "AuditLog"
         WHERE "action" = 'create' AND "resource" = 'Invitation'
         AND "organizationId" = $1`,
        [ownerUser.organizationId],
      );
      assert(row.rows.length >= 1);
    });
  });

  // ──────────────────── Sprint 2.5: US-033 ────────────────────

  describe('US-033: Accept Invitation — verify + new user + existing user', () => {
    let inviteToken;

    before(async () => {
      // Get token from the invitation created above
      const row = await pool.query(
        `SELECT "token" FROM "Invitation"
         WHERE "email" = 'invited@sprint2.test' AND "status" = 'pending'`,
      );
      inviteToken = row.rows[0].token;
    });

    it('verify returns valid=true for pending token', async () => {
      const result = await sandbox.application.iam.acceptInvitation.verify(inviteToken);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.role, 'member');
      assert.strictEqual(result.email, 'invited@sprint2.test');
      assert(result.organizationName, 'Should have org name');
    });

    it('verify returns valid=false for unknown token', async () => {
      const result = await sandbox.application.iam.acceptInvitation.verify(
        '00000000-0000-0000-0000-000000000000',
      );
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.reason, 'not_found');
    });

    it('new user registers with pending invite → joins existing org', async () => {
      const result = await sandbox.application.iam.syncUserFromWorkOS.syncUser({
        id: 'wos-invited-user',
        email: 'invited@sprint2.test',
        firstName: 'Invited',
        lastName: 'User',
      });

      assert.strictEqual(result.created, true);
      assert.strictEqual(result.source, 'invitation');
      assert.strictEqual(result.user.organizationId, ownerUser.organizationId,
        'Should join SAME org as inviter');
      assert.strictEqual(result.user.roles[0], 'member',
        'Should have role from invitation, NOT owner');
    });

    it('invitation marked as accepted', async () => {
      const row = await pool.query(
        `SELECT "status", "acceptedAt", "acceptedById" FROM "Invitation"
         WHERE "token" = $1`,
        [inviteToken],
      );
      assert.strictEqual(row.rows[0].status, 'accepted');
      assert(row.rows[0].acceptedAt, 'Should have acceptedAt timestamp');
      assert(row.rows[0].acceptedById, 'Should have acceptedById');
    });

    it('existing user accepts invitation → org transfer', async () => {
      // 1. Create user FIRST (no pending invite → gets own org)
      const otherUser = await sandbox.application.iam.syncUserFromWorkOS.syncUser({
        id: 'wos-transfer-user',
        email: 'transfer@sprint2.test',
        firstName: 'Transfer',
        lastName: 'User',
      });
      assert.notStrictEqual(otherUser.user.organizationId, ownerUser.organizationId,
        'Other user should be in different org initially');

      // 2. Create invitation for that user's email
      const secondInvite = await sandbox.application.iam.createInvitation.create({
        email: 'transfer@sprint2.test',
        role: 'admin',
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });

      // 3. Accept the invitation
      const token = await pool.query(
        'SELECT "token" FROM "Invitation" WHERE "invitationId" = $1',
        [secondInvite.id],
      );
      const result = await sandbox.application.iam.acceptInvitation.accept({
        token: token.rows[0].token,
        userId: otherUser.user.id,
        email: 'transfer@sprint2.test',
      });

      assert.strictEqual(result.organizationId, ownerUser.organizationId);
      assert.strictEqual(result.role, 'admin');

      // Verify in DB
      const userRow = await pool.query(
        'SELECT "organizationId" FROM "User" WHERE "id" = $1',
        [otherUser.user.id],
      );
      assert.strictEqual(userRow.rows[0].organizationId, ownerUser.organizationId,
        'User should now be in inviter org');

      // Verify role in DB
      const roleRow = await pool.query(
        `SELECT r."name" FROM "UserRole" ur
         JOIN "Role" r ON r."roleId" = ur."roleId"
         WHERE ur."userId" = $1`,
        [otherUser.user.id],
      );
      assert.strictEqual(roleRow.rows[0].name, 'admin');
    });

    it('reject accept when email does not match', async () => {
      const invite3 = await sandbox.application.iam.createInvitation.create({
        email: 'mismatch@sprint2.test',
        role: 'member',
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });
      const tokenRow = await pool.query(
        'SELECT "token" FROM "Invitation" WHERE "invitationId" = $1',
        [invite3.id],
      );

      await assert.rejects(
        () => sandbox.application.iam.acceptInvitation.accept({
          token: tokenRow.rows[0].token,
          userId: ownerUser.id,
          email: 'wrong@email.com',
        }),
        (err) => err.code === 'FORBIDDEN',
      );
    });
  });

  // ──────────────────── Sprint 2.5: US-034 ────────────────────

  describe('US-034: List Team Members', () => {
    it('returns members sorted owner first + pending invites + limits', async () => {
      const result = await sandbox.application.iam.listTeamMembers.list({
        organizationId: ownerUser.organizationId,
      });

      assert(result.members.length >= 1, 'Should have at least owner');
      assert.strictEqual(result.members[0].role, 'owner',
        'Owner should be first');

      assert(result.invitations, 'Should have invitations array');
      assert(result.limits, 'Should have limits object');
      assert(typeof result.limits.current === 'number');
      assert(typeof result.limits.max === 'number');
    });
  });

  // ──────────────────── Sprint 2.5: US-035 ────────────────────

  describe('US-035: Change Role + Remove Member', () => {
    let memberUserId;

    before(async () => {
      // Find the invited user (member) in the org
      const row = await pool.query(
        `SELECT "id" FROM "User"
         WHERE "organizationId" = $1 AND "email" = 'invited@sprint2.test'`,
        [ownerUser.organizationId],
      );
      memberUserId = row.rows[0].id;
    });

    it('owner changes member role to admin', async () => {
      const result = await sandbox.application.iam.changeRole.change({
        targetUserId: memberUserId,
        newRole: 'admin',
        actingUser: ownerUser,
        organizationId: ownerUser.organizationId,
      });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.role, 'admin');

      // Verify in DB
      const roleRow = await pool.query(
        `SELECT r."name" FROM "UserRole" ur
         JOIN "Role" r ON r."roleId" = ur."roleId"
         WHERE ur."userId" = $1`,
        [memberUserId],
      );
      assert.strictEqual(roleRow.rows[0].name, 'admin');
    });

    it('cannot change own role', async () => {
      await assert.rejects(
        () => sandbox.application.iam.changeRole.change({
          targetUserId: ownerUser.id,
          newRole: 'member',
          actingUser: ownerUser,
          organizationId: ownerUser.organizationId,
        }),
        (err) => err.code === 'FORBIDDEN',
      );
    });

    it('cannot change owner role', async () => {
      // Create admin user to try changing owner
      const adminUser = {
        id: memberUserId,
        roles: ['admin'],
        organizationId: ownerUser.organizationId,
      };
      await assert.rejects(
        () => sandbox.application.iam.changeRole.change({
          targetUserId: ownerUser.id,
          newRole: 'member',
          actingUser: adminUser,
          organizationId: ownerUser.organizationId,
        }),
        (err) => err.code === 'FORBIDDEN',
      );
    });

    it('remove member sets active=false', async () => {
      const result = await sandbox.application.iam.removeMember.remove({
        targetUserId: memberUserId,
        actingUser: ownerUser,
        organizationId: ownerUser.organizationId,
      });
      assert.strictEqual(result.success, true);

      const row = await pool.query(
        'SELECT "active" FROM "User" WHERE "id" = $1',
        [memberUserId],
      );
      assert.strictEqual(row.rows[0].active, false);
    });

    it('AuditLog records role change and removal', async () => {
      const rows = await pool.query(
        `SELECT "action" FROM "AuditLog"
         WHERE "resourceId" = $1 AND "resource" = 'User'
         ORDER BY "auditLogId" ASC`,
        [memberUserId],
      );
      const actions = rows.rows.map((r) => r.action);
      assert(actions.includes('update'), 'Should have update audit for role change');
      assert(actions.includes('delete'), 'Should have delete audit for removal');
    });
  });

  // ──────────────────── Sprint 2.5: US-035 (invite management) ────────

  describe('US-035: Revoke Invitation', () => {
    let revokeInviteId;

    before(async () => {
      const inv = await sandbox.application.iam.createInvitation.create({
        email: 'torevoke@sprint2.test',
        role: 'viewer',
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });
      revokeInviteId = inv.id;
    });

    it('revokes a pending invitation', async () => {
      const result = await sandbox.application.iam.manageInvitation.revoke({
        invitationId: revokeInviteId,
        actingUser: ownerUser,
      });
      assert.strictEqual(result.success, true);

      const row = await pool.query(
        'SELECT "status" FROM "Invitation" WHERE "invitationId" = $1',
        [revokeInviteId],
      );
      assert.strictEqual(row.rows[0].status, 'revoked');
    });

    it('cannot revoke an already-revoked invitation', async () => {
      await assert.rejects(
        () => sandbox.application.iam.manageInvitation.revoke({
          invitationId: revokeInviteId,
          actingUser: ownerUser,
        }),
        (err) => err.code === 'VALIDATION_ERROR',
      );
    });
  });

  // ──────────────────── Sprint 2.5: US-036 ────────────────────

  describe('US-036: maxTools Enforcement', () => {
    it('blocks tool registration when at limit', async () => {
      // Set maxTools to current count to trigger block
      const toolCount = await pool.query(
        `SELECT COUNT(*)::int AS total FROM "AITool"
         WHERE "organizationId" = $1`,
        [ownerUser.organizationId],
      );
      const currentCount = toolCount.rows[0].total;

      await pool.query(
        'UPDATE "Plan" SET "maxTools" = $1 WHERE "name" = \'free\'',
        [currentCount],
      );

      await assert.rejects(
        () => sandbox.application.inventory.registerTool.create({
          body: { name: 'Blocked Tool', vendorName: 'BlockedVendor' },
          userId: ownerUser.id,
          organizationId: ownerUser.organizationId,
        }),
        (err) => {
          assert.strictEqual(err.code, 'PLAN_LIMIT_EXCEEDED');
          assert.strictEqual(err.limitType, 'maxTools');
          assert.strictEqual(err.current, currentCount);
          assert.strictEqual(err.max, currentCount);
          return true;
        },
      );

      // Restore
      await pool.query(
        'UPDATE "Plan" SET "maxTools" = 5 WHERE "name" = \'free\'',
      );
    });

    it('enterprise plan (-1) allows unlimited tools', async () => {
      await pool.query(
        'UPDATE "Plan" SET "maxTools" = -1 WHERE "name" = \'free\'',
      );

      const tool = await sandbox.application.inventory.registerTool.create({
        body: { name: 'Unlimited Tool', vendorName: 'UnlimitedVendor' },
        userId: ownerUser.id,
        organizationId: ownerUser.organizationId,
      });
      assert(tool.id, 'Tool should be created with unlimited plan');

      // Restore
      await pool.query(
        'UPDATE "Plan" SET "maxTools" = 5 WHERE "name" = \'free\'',
      );
    });
  });

  // ──────────────────── Multi-tenancy on all new endpoints ────────────

  describe('Multi-tenancy isolation', () => {
    let otherOrgId;

    before(async () => {
      const other = await sandbox.application.iam.syncUserFromWorkOS.syncUser({
        id: 'wos-other-org',
        email: 'other@other-org.test',
        firstName: 'Other',
        lastName: 'Org',
      });
      otherOrgId = other.user.organizationId;
    });

    it('other org cannot see owner org invitations', async () => {
      const result = await sandbox.application.iam.listTeamMembers.list({
        organizationId: otherOrgId,
      });
      const emails = result.members.map((m) => m.email);
      assert(!emails.includes('owner@sprint2.test'),
        'Should not see owner org members');
    });

    it('tenant query isolates tools by org', async () => {
      const tq = sandbox.lib.tenant.createTenantQuery(otherOrgId);
      const tools = await tq.findMany('AITool');
      assert.strictEqual(tools.rows.length, 0,
        'Other org should have no tools');
    });
  });
});
