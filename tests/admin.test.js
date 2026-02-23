'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const MOCK_ADMIN = {
  id: 1,
  organizationId: 10,
  email: 'admin@example.com',
  fullName: 'Platform Admin',
  active: true,
  roles: ['platform_admin'],
};

const MOCK_REGULAR_USER = {
  id: 2,
  organizationId: 20,
  email: 'user@example.com',
  fullName: 'Regular User',
  active: true,
  roles: ['member'],
};

const MOCK_SESSION_ADMIN = {
  user: { id: 'wos-admin-uuid' },
};

const MOCK_SESSION_REGULAR = {
  user: { id: 'wos-user-uuid' },
};

const createAdminMockDb = () => ({
  query: async (sql, params) => {
    // Permission cache
    if (sql.includes('FROM "Permission"') && sql.includes('JOIN "Role"')) {
      return {
        rows: [
          { role: 'platform_admin', resource: 'PlatformAdmin', action: 'manage' },
          { role: 'owner', resource: 'AITool', action: 'manage' },
          { role: 'member', resource: 'AITool', action: 'read' },
        ],
      };
    }

    // resolveUser — return admin or regular user based on workosUserId
    if (sql.includes('FROM "User"') && sql.includes('"workosUserId"')) {
      if (params && params[0] === 'wos-admin-uuid') {
        return { rows: [MOCK_ADMIN] };
      }
      if (params && params[0] === 'wos-user-uuid') {
        return { rows: [MOCK_REGULAR_USER] };
      }
      return { rows: [] };
    }

    // Overview stats: total users
    if (sql.includes('COUNT(*)') && sql.includes('FROM "User"') && !sql.includes('JOIN')) {
      return { rows: [{ count: 42 }] };
    }

    // Overview stats: total organizations
    if (sql.includes('COUNT(*)') && sql.includes('FROM "Organization"') && !sql.includes('JOIN')) {
      return { rows: [{ count: 15 }] };
    }

    // Overview stats: active subscriptions
    if (sql.includes('COUNT(*)') && sql.includes('FROM "Subscription"') && sql.includes('active')) {
      return { rows: [{ count: 10 }] };
    }

    // Overview stats: MRR
    if (sql.includes('SUM') && sql.includes('"priceMonthly"')) {
      return { rows: [{ mrr: '4900' }] };
    }

    // Overview stats: plan distribution
    if (sql.includes('"planName"') && sql.includes('LEFT JOIN "Subscription"') && sql.includes('GROUP BY')) {
      return {
        rows: [
          { planName: 'free', displayName: 'Free', count: 5 },
          { planName: 'starter', displayName: 'Starter', count: 3 },
          { planName: 'growth', displayName: 'Growth', count: 2 },
        ],
      };
    }

    // User listing
    if (sql.includes('FROM "User" u') && sql.includes('LEFT JOIN "Organization"') && sql.includes('LIMIT')) {
      return {
        rows: [
          {
            id: 1, email: 'admin@example.com', fullName: 'Admin User',
            organizationName: 'Org A', roleName: 'platform_admin', planName: 'growth',
            subscriptionStatus: 'active', active: true, lastLoginAt: '2026-01-01',
            totalCount: '2',
          },
          {
            id: 2, email: 'user@example.com', fullName: 'Regular User',
            organizationName: 'Org B', roleName: 'member', planName: 'free',
            subscriptionStatus: 'none', active: true, lastLoginAt: null,
            totalCount: '2',
          },
        ],
      };
    }

    // AuditLog insert
    if (sql.includes('INSERT INTO "AuditLog"')) {
      return { rows: [{ auditLogId: 99 }] };
    }

    return { rows: [] };
  },
});

describe('Platform Admin API', () => {
  describe('requirePlatformAdmin guard', () => {
    it('rejects unauthenticated requests', async () => {
      const mockDb = createAdminMockDb();
      const { application } = await buildFullSandbox(mockDb, {
        config: { server: { platformAdminEmails: [] } },
      });

      await assert.rejects(
        () => application.admin.requirePlatformAdmin.require(null),
        (err) => err.message === 'Not authenticated',
      );
    });

    it('rejects non-admin users', async () => {
      const mockDb = createAdminMockDb();
      const { application } = await buildFullSandbox(mockDb, {
        config: { server: { platformAdminEmails: [] } },
      });

      await assert.rejects(
        () => application.admin.requirePlatformAdmin.require(MOCK_SESSION_REGULAR),
        (err) => err.message.includes('Missing permission'),
      );
    });

    it('allows platform_admin users', async () => {
      const mockDb = createAdminMockDb();
      const { application } = await buildFullSandbox(mockDb, {
        config: { server: { platformAdminEmails: [] } },
      });

      const admin = await application.admin.requirePlatformAdmin.require(MOCK_SESSION_ADMIN);
      assert.strictEqual(admin.id, 1);
      assert.strictEqual(admin.email, 'admin@example.com');
    });

    it('rejects admin not in email whitelist', async () => {
      const mockDb = createAdminMockDb();
      const { application } = await buildFullSandbox(mockDb, {
        config: { server: { platformAdminEmails: ['other@example.com'] } },
      });

      await assert.rejects(
        () => application.admin.requirePlatformAdmin.require(MOCK_SESSION_ADMIN),
        (err) => err.message === 'Not in admin whitelist',
      );
    });
  });

  describe('listAllUsers', () => {
    it('returns paginated user list', async () => {
      const mockDb = createAdminMockDb();
      const { application } = await buildFullSandbox(mockDb, {
        config: { server: { platformAdminEmails: [] } },
      });

      const result = await application.admin.listAllUsers.list({
        page: 1,
        pageSize: 20,
      });

      assert.strictEqual(result.data.length, 2);
      assert.strictEqual(result.pagination.total, 2);
      assert.strictEqual(result.pagination.page, 1);
      assert.strictEqual(result.data[0].email, 'admin@example.com');
      assert.strictEqual(result.data[0].role, 'platform_admin');
      assert.strictEqual(result.data[1].email, 'user@example.com');
      assert.strictEqual(result.data[1].planName, 'free');
    });

    it('returns correct pagination metadata', async () => {
      const mockDb = createAdminMockDb();
      const { application } = await buildFullSandbox(mockDb, {
        config: { server: { platformAdminEmails: [] } },
      });

      const result = await application.admin.listAllUsers.list({
        page: 1,
        pageSize: 10,
      });

      assert.strictEqual(result.pagination.pageSize, 10);
      assert.strictEqual(result.pagination.totalPages, 1);
    });
  });

  describe('getOverviewStats', () => {
    it('returns correct aggregate stats', async () => {
      const mockDb = createAdminMockDb();
      const { application } = await buildFullSandbox(mockDb, {
        config: { server: { platformAdminEmails: [] } },
      });

      const stats = await application.admin.getOverviewStats.getStats();

      assert.strictEqual(stats.totalUsers, 42);
      assert.strictEqual(stats.totalOrganizations, 15);
      assert.strictEqual(stats.activeSubscriptions, 10);
      assert.strictEqual(stats.mrr, 4900);
      assert.strictEqual(stats.planDistribution.length, 3);
      assert.strictEqual(stats.planDistribution[0].planName, 'free');
      assert.strictEqual(stats.planDistribution[0].count, 5);
    });

    it('returns plan distribution with display names', async () => {
      const mockDb = createAdminMockDb();
      const { application } = await buildFullSandbox(mockDb, {
        config: { server: { platformAdminEmails: [] } },
      });

      const stats = await application.admin.getOverviewStats.getStats();

      assert.strictEqual(stats.planDistribution[1].displayName, 'Starter');
      assert.strictEqual(stats.planDistribution[2].displayName, 'Growth');
    });
  });
});
