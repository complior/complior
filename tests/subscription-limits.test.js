'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const createMockDb = (planLimits = { maxUsers: 3, maxTools: 5 }, counts = {}) => {
  const userCount = counts.users ?? 1;
  const inviteCount = counts.invites ?? 0;
  const toolCount = counts.tools ?? 0;

  return {
    query: async (sql, params) => {
      if (sql.includes('FROM "Permission"')) {
        return { rows: [{ role: 'owner', resource: 'Organization', action: 'manage' }] };
      }
      if (sql.includes('FROM "Subscription"') && sql.includes('JOIN "Plan"')) {
        return { rows: [planLimits] };
      }
      if (sql.includes('COUNT') && sql.includes('"Invitation"')) {
        return { rows: [{ total: inviteCount }] };
      }
      if (sql.includes('COUNT') && sql.includes('"User"')) {
        return { rows: [{ total: userCount }] };
      }
      if (sql.includes('COUNT') && sql.includes('"AITool"')) {
        return { rows: [{ total: toolCount }] };
      }
      return { rows: [] };
    },
  };
};

describe('SubscriptionLimitChecker (domain)', () => {
  let checker;

  before(async () => {
    const { domain } = await buildFullSandbox(createMockDb());
    checker = domain.iam.services.SubscriptionLimitChecker;
  });

  it('allows when currentUsers + pendingInvites < maxUsers', () => {
    const result = checker.checkUserLimit({ currentUsers: 1, pendingInvites: 0, maxUsers: 3 });
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.current, 1);
    assert.strictEqual(result.limit, 3);
  });

  it('blocks when currentUsers + pendingInvites >= maxUsers', () => {
    const result = checker.checkUserLimit({ currentUsers: 2, pendingInvites: 1, maxUsers: 3 });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.current, 3);
    assert.strictEqual(result.limit, 3);
  });

  it('allows unlimited users when maxUsers is -1', () => {
    const result = checker.checkUserLimit({ currentUsers: 100, pendingInvites: 50, maxUsers: -1 });
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.limit, -1);
  });

  it('blocks all users when maxUsers is 0', () => {
    const result = checker.checkUserLimit({ currentUsers: 0, pendingInvites: 0, maxUsers: 0 });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.limit, 0);
  });

  it('allows when currentTools < maxTools', () => {
    const result = checker.checkToolLimit({ currentTools: 3, maxTools: 5 });
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.current, 3);
    assert.strictEqual(result.limit, 5);
  });

  it('blocks when currentTools >= maxTools', () => {
    const result = checker.checkToolLimit({ currentTools: 5, maxTools: 5 });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.current, 5);
    assert.strictEqual(result.limit, 5);
  });

  it('allows unlimited tools when maxTools is -1', () => {
    const result = checker.checkToolLimit({ currentTools: 999, maxTools: -1 });
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.limit, -1);
  });

  it('blocks all tools when maxTools is 0', () => {
    const result = checker.checkToolLimit({ currentTools: 0, maxTools: 0 });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.limit, 0);
  });
});

describe('getOrgLimits (application)', () => {
  it('checkUsers returns allowed:true when under limit', async () => {
    const mockDb = createMockDb({ maxUsers: 3 }, { users: 1, invites: 0 });
    const { application } = await buildFullSandbox(mockDb);
    const result = await application.billing.getOrgLimits.checkUsers(10);
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.current, 1);
    assert.strictEqual(result.limit, 3);
  });

  it('checkUsers returns allowed:false when at limit', async () => {
    const mockDb = createMockDb({ maxUsers: 3 }, { users: 2, invites: 1 });
    const { application } = await buildFullSandbox(mockDb);
    const result = await application.billing.getOrgLimits.checkUsers(10);
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.current, 3);
  });

  it('checkTools returns allowed:true when under limit', async () => {
    const mockDb = createMockDb({ maxTools: 5 }, { tools: 3 });
    const { application } = await buildFullSandbox(mockDb);
    const result = await application.billing.getOrgLimits.checkTools(10);
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.current, 3);
    assert.strictEqual(result.limit, 5);
  });

  it('checkTools returns allowed:false when at limit', async () => {
    const mockDb = createMockDb({ maxTools: 5 }, { tools: 5 });
    const { application } = await buildFullSandbox(mockDb);
    const result = await application.billing.getOrgLimits.checkTools(10);
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.current, 5);
  });

  it('getLimits returns both users and tools limits', async () => {
    const mockDb = createMockDb(
      { maxUsers: 3, maxTools: 5 },
      { users: 1, invites: 0, tools: 2 },
    );
    const { application } = await buildFullSandbox(mockDb);
    const result = await application.billing.getOrgLimits.getLimits(10);
    assert.strictEqual(result.users.allowed, true);
    assert.strictEqual(result.tools.allowed, true);
  });

  it('throws NotFoundError when no active subscription', async () => {
    const mockDb = {
      query: async (sql) => {
        if (sql.includes('FROM "Permission"')) {
          return { rows: [{ role: 'owner', resource: 'Organization', action: 'manage' }] };
        }
        if (sql.includes('FROM "Subscription"')) return { rows: [] };
        return { rows: [] };
      },
    };
    const { application } = await buildFullSandbox(mockDb);
    await assert.rejects(
      () => application.billing.getOrgLimits.checkUsers(10),
      (err) => err.code === 'NOT_FOUND',
    );
  });
});
