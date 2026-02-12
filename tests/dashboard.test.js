'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const MOCK_USER = {
  id: 1,
  organizationId: 10,
  email: 'test@example.com',
  fullName: 'Test User',
  roles: ['owner'],
};

const MOCK_TOOLS = [
  { id: 1, aIToolId: 1, organizationId: 10, name: 'Tool A', riskLevel: 'high', complianceScore: 50, complianceStatus: 'in_progress', createdById: 1 },
  { id: 2, aIToolId: 2, organizationId: 10, name: 'Tool B', riskLevel: 'limited', complianceScore: 100, complianceStatus: 'compliant', createdById: 1 },
  { id: 3, aIToolId: 3, organizationId: 10, name: 'Tool C', riskLevel: null, complianceScore: null, complianceStatus: 'not_started', createdById: 2 },
  { id: 4, aIToolId: 4, organizationId: 10, name: 'Tool D', riskLevel: 'prohibited', complianceScore: 0, complianceStatus: 'non_compliant', createdById: 1 },
];

const createDashboardMockDb = (tools, userTools) => ({
  query: async (sql, params) => {
    if (sql.includes('FROM "Permission"')) {
      return { rows: [{ role: 'owner', resource: 'AITool', action: 'manage' }] };
    }
    if (sql.includes('FROM "User"') && sql.includes('id')) {
      return { rows: [MOCK_USER] };
    }
    if (sql.includes('UPDATE "User"')) return { rows: [] };
    // Tenant findMany for AITool
    if (sql.includes('FROM "AITool"') && sql.includes('"organizationId"') && sql.includes('SELECT *')) {
      const targetTools = userTools || tools;
      return { rows: targetTools.map((t) => ({ ...t, id: t.aIToolId })) };
    }
    // Count queries for tenant
    if (sql.includes('COUNT(*)') && sql.includes('"AITool"')) {
      return { rows: [{ total: (userTools || tools).length }] };
    }
    if (sql.includes('COUNT(*)') && sql.includes('"User"')) {
      return { rows: [{ total: 3 }] };
    }
    if (sql.includes('COUNT(*)') && sql.includes('"Invitation"')) {
      return { rows: [{ total: 1 }] };
    }
    // Plan limits
    if (sql.includes('FROM "Subscription"') && sql.includes('JOIN "Plan"')) {
      return { rows: [{ maxUsers: 10, maxTools: 20 }] };
    }
    // Audit log
    if (sql.includes('FROM "AuditLog"')) {
      return {
        rows: [
          { auditLogId: 1, action: 'classify', resource: 'AITool', email: 'test@example.com' },
          { auditLogId: 2, action: 'create', resource: 'AITool', email: 'test@example.com' },
        ],
      };
    }
    return { rows: [] };
  },
});

describe('Dashboard API', () => {
  it('returns full dashboard summary for owner', async () => {
    const mockDb = createDashboardMockDb(MOCK_TOOLS);
    const { application } = await buildFullSandbox(mockDb);

    const result = await application.dashboard.getDashboardSummary.getSummary({
      userId: 1,
      organizationId: 10,
      userRoles: ['owner'],
    });

    assert.strictEqual(result.tools.total, 4);
    assert.strictEqual(result.tools.classified, 3);
    assert.strictEqual(result.tools.unclassified, 1);
    assert.strictEqual(result.riskDistribution.prohibited, 1);
    assert.strictEqual(result.riskDistribution.high, 1);
    assert.strictEqual(result.riskDistribution.limited, 1);
    assert(typeof result.complianceScore === 'number');
  });

  it('returns risk distribution counts', async () => {
    const mockDb = createDashboardMockDb(MOCK_TOOLS);
    const { application } = await buildFullSandbox(mockDb);

    const result = await application.dashboard.getDashboardSummary.getSummary({
      userId: 1,
      organizationId: 10,
      userRoles: ['owner'],
    });

    assert.strictEqual(result.riskDistribution.prohibited, 1);
    assert.strictEqual(result.riskDistribution.high, 1);
    assert.strictEqual(result.riskDistribution.limited, 1);
    assert.strictEqual(result.riskDistribution.minimal, 0);
    assert.strictEqual(result.riskDistribution.gpai, 0);
  });

  it('returns AI Literacy stub with zeros', async () => {
    const mockDb = createDashboardMockDb(MOCK_TOOLS);
    const { application } = await buildFullSandbox(mockDb);

    const result = await application.dashboard.getDashboardSummary.getSummary({
      userId: 1,
      organizationId: 10,
      userRoles: ['owner'],
    });

    assert.strictEqual(result.aiLiteracy.totalEmployees, 0);
    assert.strictEqual(result.aiLiteracy.trained, 0);
    assert.strictEqual(result.aiLiteracy.completionRate, 0);
    assert(result.aiLiteracy.message.includes('future'));
  });

  it('flags prohibited tools in requiresAttention', async () => {
    const mockDb = createDashboardMockDb(MOCK_TOOLS);
    const { application } = await buildFullSandbox(mockDb);

    const result = await application.dashboard.getDashboardSummary.getSummary({
      userId: 1,
      organizationId: 10,
      userRoles: ['owner'],
    });

    const critical = result.requiresAttention.filter((a) => a.severity === 'critical');
    assert.strictEqual(critical.length, 1);
    assert.strictEqual(critical[0].toolName, 'Tool D');
  });

  it('includes AI Act timeline with 3 dates', async () => {
    const mockDb = createDashboardMockDb(MOCK_TOOLS);
    const { application } = await buildFullSandbox(mockDb);

    const result = await application.dashboard.getDashboardSummary.getSummary({
      userId: 1,
      organizationId: 10,
      userRoles: ['owner'],
    });

    assert.strictEqual(result.timeline.length, 3);
    assert(result.timeline[0].date);
    assert(result.timeline[0].title);
    assert(typeof result.timeline[0].daysUntil === 'number');
  });

  it('returns recent audit log entries', async () => {
    const mockDb = createDashboardMockDb(MOCK_TOOLS);
    const { application } = await buildFullSandbox(mockDb);

    const result = await application.dashboard.getDashboardSummary.getSummary({
      userId: 1,
      organizationId: 10,
      userRoles: ['owner'],
    });

    assert(Array.isArray(result.recentActivity));
    assert(result.recentActivity.length > 0);
  });

  it('returns plan limits', async () => {
    const mockDb = createDashboardMockDb(MOCK_TOOLS);
    const { application } = await buildFullSandbox(mockDb);

    const result = await application.dashboard.getDashboardSummary.getSummary({
      userId: 1,
      organizationId: 10,
      userRoles: ['owner'],
    });

    assert(result.planLimits);
    assert(result.planLimits.users);
    assert(result.planLimits.tools);
  });
});
