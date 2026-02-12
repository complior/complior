'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const MOCK_TOKEN = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_EXPIRED_TOKEN = '550e8400-e29b-41d4-a716-446655440001';
const MOCK_ACCEPTED_TOKEN = '550e8400-e29b-41d4-a716-446655440002';

const PENDING_INVITATION = {
  invitationId: 100,
  email: 'invited@example.com',
  role: 'member',
  status: 'pending',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  organizationId: 20,
  organizationName: 'Acme Corp',
};

const createMockDb = () => {
  let committed = false;

  return {
    query: async (sql, params) => {
      // Permissions
      if (sql.includes('FROM "Permission"')) {
        return {
          rows: [
            { role: 'owner', resource: 'User', action: 'manage' },
            { role: 'member', resource: 'AITool', action: 'read' },
          ],
        };
      }
      // Verify token — SELECT Invitation JOIN Organization
      if (sql.includes('FROM "Invitation"') && sql.includes('JOIN "Organization"')) {
        if (params[0] === MOCK_TOKEN) {
          return { rows: [PENDING_INVITATION] };
        }
        if (params[0] === MOCK_EXPIRED_TOKEN) {
          return {
            rows: [{
              ...PENDING_INVITATION,
              expiresAt: new Date(Date.now() - 1000).toISOString(),
            }],
          };
        }
        if (params[0] === MOCK_ACCEPTED_TOKEN) {
          return {
            rows: [{ ...PENDING_INVITATION, status: 'accepted' }],
          };
        }
        return { rows: [] };
      }
      // Accept — SELECT Invitation (no join)
      if (sql.includes('FROM "Invitation"') && sql.includes('"token"')) {
        if (params[0] === MOCK_TOKEN) {
          return { rows: [PENDING_INVITATION] };
        }
        return { rows: [] };
      }
      // Check pending invitation for syncFromWebhook
      if (sql.includes('FROM "Invitation"') && sql.includes('"email"') && sql.includes('pending')) {
        if (params[0] === 'invited@example.com') {
          return { rows: [PENDING_INVITATION] };
        }
        return { rows: [] };
      }
      // Existing user check (syncFromWebhook)
      if (sql.includes('FROM "User"') && sql.includes('"oryId"') && !sql.includes('JOIN')) {
        return { rows: [] };
      }
      // Role lookup
      if (sql.includes('FROM "Role"') && sql.includes('"name"')) {
        return { rows: [{ roleId: 5 }] };
      }
      // AuditLog
      if (sql.includes('INSERT INTO "AuditLog"')) {
        return { rows: [{ auditLogId: 1 }] };
      }
      return { rows: [] };
    },
    connect: async () => ({
      query: async (sql, params) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          if (sql === 'COMMIT') committed = true;
          return { rows: [] };
        }
        // Check pending invitation (inside transaction, FOR UPDATE)
        if (sql.includes('FROM "Invitation"') && sql.includes('"email"') && sql.includes('pending')) {
          if (params[0] === 'invited@example.com') {
            return { rows: [PENDING_INVITATION] };
          }
          return { rows: [] };
        }
        // UPDATE User org
        if (sql.includes('UPDATE "User"') && sql.includes('"organizationId"')) {
          return { rows: [], rowCount: 1 };
        }
        // DELETE UserRole
        if (sql.includes('DELETE FROM "UserRole"')) {
          return { rows: [], rowCount: 1 };
        }
        // Role lookup
        if (sql.includes('FROM "Role"')) {
          return { rows: [{ roleId: 5 }] };
        }
        // INSERT UserRole
        if (sql.includes('INSERT INTO "UserRole"')) {
          return { rows: [{ userId: 1, roleId: 5 }] };
        }
        // UPDATE Invitation accepted
        if (sql.includes('UPDATE "Invitation"')) {
          return { rows: [], rowCount: 1 };
        }
        // INSERT Organization
        if (sql.includes('INSERT INTO "Organization"')) {
          return { rows: [{ id: 30 }] };
        }
        // INSERT User
        if (sql.includes('INSERT INTO "User"')) {
          return { rows: [{ id: 50 }] };
        }
        // Plan lookup
        if (sql.includes('FROM "Plan"')) {
          return { rows: [{ planId: 1 }] };
        }
        // INSERT Subscription
        if (sql.includes('INSERT INTO "Subscription"')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
      release: () => {},
    }),
    _wasCommitted: () => committed,
  };
};

describe('acceptInvitation.verify', () => {
  let acceptInvitation;

  before(async () => {
    const mockDb = createMockDb();
    const { application } = await buildFullSandbox(mockDb);
    acceptInvitation = application.iam.acceptInvitation;
  });

  it('returns valid:true for pending non-expired token', async () => {
    const result = await acceptInvitation.verify(MOCK_TOKEN);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.organizationName, 'Acme Corp');
    assert.strictEqual(result.role, 'member');
    assert.strictEqual(result.email, 'invited@example.com');
  });

  it('returns valid:false for expired token', async () => {
    const result = await acceptInvitation.verify(MOCK_EXPIRED_TOKEN);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'expired');
  });

  it('returns valid:false for already accepted token', async () => {
    const result = await acceptInvitation.verify(MOCK_ACCEPTED_TOKEN);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'already_accepted');
  });

  it('returns valid:false for unknown token', async () => {
    const result = await acceptInvitation.verify('00000000-0000-0000-0000-000000000000');
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'not_found');
  });
});

describe('acceptInvitation.accept', () => {
  it('transfers user to invited org and assigns role', async () => {
    const mockDb = createMockDb();
    const { application } = await buildFullSandbox(mockDb);
    const result = await application.iam.acceptInvitation.accept({
      token: MOCK_TOKEN,
      userId: 1,
      email: 'invited@example.com',
    });
    assert.strictEqual(result.organizationId, 20);
    assert.strictEqual(result.role, 'member');
  });

  it('rejects when email does not match invitation', async () => {
    const mockDb = createMockDb();
    const { application } = await buildFullSandbox(mockDb);
    await assert.rejects(
      () => application.iam.acceptInvitation.accept({
        token: MOCK_TOKEN,
        userId: 1,
        email: 'wrong@example.com',
      }),
      (err) => err.code === 'FORBIDDEN',
    );
  });
});

describe('syncUserFromOry — invitation flow', () => {
  it('new user with pending invite joins existing org', async () => {
    const mockDb = createMockDb();
    const { application } = await buildFullSandbox(mockDb);
    const result = await application.iam.syncUserFromOry.syncFromWebhook({
      identity_id: 'ory-new-invite',
      email: 'invited@example.com',
      name: { first: 'Invited', last: 'User' },
      locale: 'en',
    });
    assert.strictEqual(result.created, true);
    assert.strictEqual(result.source, 'invitation');
    assert.strictEqual(result.user.organizationId, 20);
    assert.strictEqual(result.user.roles.length, 1);
    assert.strictEqual(result.user.roles[0], 'member');
  });

  it('new user without invite creates new org', async () => {
    const mockDb = createMockDb();
    const { application } = await buildFullSandbox(mockDb);
    const result = await application.iam.syncUserFromOry.syncFromWebhook({
      identity_id: 'ory-no-invite',
      email: 'noinvite@example.com',
      name: { first: 'No', last: 'Invite' },
      locale: 'en',
    });
    assert.strictEqual(result.created, true);
    assert.strictEqual(result.source, 'registration');
    assert.strictEqual(result.user.roles.length, 1);
    assert.strictEqual(result.user.roles[0], 'owner');
  });
});
