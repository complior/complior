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

const MOCK_TOOL = {
  id: 5,
  aIToolId: 5,
  organizationId: 10,
  name: 'TestBot',
  riskLevel: 'limited',
  complianceScore: 0,
  complianceStatus: 'in_progress',
  createdById: 1,
};

const MOCK_TOOL_REQUIREMENTS = [
  {
    toolRequirementId: 1, aiToolId: 5, requirementId: 10,
    status: 'pending', progress: 0, completedAt: null,
    code: 'ART_4_LITERACY', name: 'AI Literacy', description: 'Train staff',
    articleReference: 'Art. 4', reqRiskLevel: 'minimal', category: 'ai_literacy',
    estimatedEffortHours: 8, guidance: 'Conduct training sessions',
  },
  {
    toolRequirementId: 2, aiToolId: 5, requirementId: 11,
    status: 'completed', progress: 100, completedAt: '2026-01-15',
    code: 'ART_50_TRANSPARENCY', name: 'Transparency Notice', description: 'Disclose AI',
    articleReference: 'Art. 50', reqRiskLevel: 'limited', category: 'transparency',
    estimatedEffortHours: 2, guidance: 'Add AI disclosure to UI',
  },
];

const createMockDb = (tool, toolReqs) => ({
  query: async (sql, params) => {
    if (sql.includes('FROM "Permission"')) {
      return { rows: [{ role: 'owner', resource: 'AITool', action: 'manage' }] };
    }
    if (sql.includes('FROM "User"')) {
      return { rows: [MOCK_USER] };
    }
    if (sql.includes('UPDATE "User"')) {
      return { rows: [] };
    }
    if (sql.includes('FROM "AITool"') && (sql.includes('"aIToolId"') || sql.includes('"id"'))) {
      return { rows: tool ? [tool] : [] };
    }
    if (sql.includes('FROM "ToolRequirement"') && sql.includes('JOIN')) {
      return { rows: toolReqs || [] };
    }
    if (sql.includes('FROM "ToolRequirement"') && !sql.includes('JOIN')) {
      return { rows: toolReqs || [] };
    }
    if (sql.includes('UPDATE "ToolRequirement"')) {
      const updated = { ...(toolReqs || [])[0], status: params[0] };
      return { rows: [updated] };
    }
    if (sql.includes('UPDATE "AITool"')) {
      return { rows: [tool], rowCount: 1 };
    }
    if (sql.includes('INSERT INTO "AuditLog"')) {
      return { rows: [{ auditLogId: 1 }] };
    }
    return { rows: [] };
  },
});

describe('Requirements API', () => {
  describe('getRequirements', () => {
    it('returns requirements grouped by article with compliance score', async () => {
      const mockDb = createMockDb(MOCK_TOOL, MOCK_TOOL_REQUIREMENTS);
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.classification.getRequirements.getByTool({
        toolId: 5,
        organizationId: 10,
      });

      assert.strictEqual(result.toolId, 5);
      assert.strictEqual(result.toolName, 'TestBot');
      assert.strictEqual(result.totalRequirements, 2);
      assert(result.complianceScore >= 0);
      assert(Array.isArray(result.groups));
      assert.strictEqual(result.groups.length, 2); // Art. 4 + Art. 50
    });

    it('returns 404 for non-existent tool', async () => {
      const mockDb = createMockDb(null, []);
      const { application } = await buildFullSandbox(mockDb);

      await assert.rejects(
        () => application.classification.getRequirements.getByTool({
          toolId: 999,
          organizationId: 10,
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 404);
          return true;
        },
      );
    });

    it('returns score 0 for empty requirements', async () => {
      const mockDb = createMockDb(MOCK_TOOL, []);
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.classification.getRequirements.getByTool({
        toolId: 5,
        organizationId: 10,
      });

      assert.strictEqual(result.complianceScore, 0);
      assert.strictEqual(result.totalRequirements, 0);
    });

    it('calculates correct score for mixed statuses', async () => {
      const mockDb = createMockDb(MOCK_TOOL, MOCK_TOOL_REQUIREMENTS);
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.classification.getRequirements.getByTool({
        toolId: 5,
        organizationId: 10,
      });

      // pending (0) + completed (100) = 100 / 200 = 50%
      assert.strictEqual(result.complianceScore, 50);
    });

    it('shows deployer-specific fields per requirement', async () => {
      const mockDb = createMockDb(MOCK_TOOL, MOCK_TOOL_REQUIREMENTS);
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.classification.getRequirements.getByTool({
        toolId: 5,
        organizationId: 10,
      });

      const art4Group = result.groups.find((g) => g.articleReference === 'Art. 4');
      assert(art4Group);
      const req = art4Group.requirements[0];
      assert.strictEqual(req.name, 'AI Literacy');
      assert.strictEqual(req.guidance, 'Conduct training sessions');
      assert.strictEqual(req.estimatedEffortHours, 8);
    });
  });

  describe('updateRequirement', () => {
    it('updates status and recalculates compliance score', async () => {
      const reqs = [
        { toolRequirementId: 1, aiToolId: 5, requirementId: 10, status: 'pending', progress: 0, completedAt: null },
        { toolRequirementId: 2, aiToolId: 5, requirementId: 11, status: 'completed', progress: 100, completedAt: '2026-01-15' },
      ];
      const mockDb = createMockDb(MOCK_TOOL, reqs);
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.classification.updateRequirement.update({
        toolId: 5,
        requirementId: 1,
        userId: 1,
        organizationId: 10,
        data: { status: 'in_progress', progress: 50 },
      });

      assert(result.requirement);
      assert(typeof result.complianceScore === 'number');
    });

    it('auto-sets completedAt when status changes to completed', async () => {
      const reqs = [
        { toolRequirementId: 1, aiToolId: 5, requirementId: 10, status: 'pending', progress: 0, completedAt: null },
      ];
      const mockDb = {
        query: async (sql, params) => {
          if (sql.includes('FROM "Permission"')) {
            return { rows: [{ role: 'owner', resource: 'AITool', action: 'manage' }] };
          }
          if (sql.includes('FROM "User"')) return { rows: [MOCK_USER] };
          if (sql.includes('UPDATE "User"')) return { rows: [] };
          if (sql.includes('FROM "AITool"') && (sql.includes('"aIToolId"') || sql.includes('"id"'))) {
            return { rows: [MOCK_TOOL] };
          }
          if (sql.includes('SELECT * FROM "ToolRequirement"') && sql.includes('toolRequirementId')) {
            return { rows: [reqs[0]] };
          }
          if (sql.includes('UPDATE "ToolRequirement"')) {
            // Verify completedAt is set
            assert(params.some((p) => typeof p === 'string' && p.includes('T')),
              'completedAt should be an ISO string');
            return { rows: [{ ...reqs[0], status: 'completed', completedAt: new Date().toISOString() }] };
          }
          if (sql.includes('FROM "ToolRequirement"') && sql.includes('SELECT "status"')) {
            return { rows: [{ status: 'completed', progress: 100 }] };
          }
          if (sql.includes('UPDATE "AITool"')) return { rows: [MOCK_TOOL], rowCount: 1 };
          if (sql.includes('INSERT INTO "AuditLog"')) return { rows: [{ auditLogId: 1 }] };
          return { rows: [] };
        },
      };
      const { application } = await buildFullSandbox(mockDb);

      await application.classification.updateRequirement.update({
        toolId: 5,
        requirementId: 1,
        userId: 1,
        organizationId: 10,
        data: { status: 'completed' },
      });
    });

    it('clears completedAt when status changes from completed', async () => {
      const reqs = [
        { toolRequirementId: 1, aiToolId: 5, requirementId: 10, status: 'completed', progress: 100, completedAt: '2026-01-15' },
      ];
      let updatedCompletedAt = 'not-updated';
      const mockDb = {
        query: async (sql, params) => {
          if (sql.includes('FROM "Permission"')) {
            return { rows: [{ role: 'owner', resource: 'AITool', action: 'manage' }] };
          }
          if (sql.includes('FROM "User"')) return { rows: [MOCK_USER] };
          if (sql.includes('UPDATE "User"')) return { rows: [] };
          if (sql.includes('FROM "AITool"') && (sql.includes('"aIToolId"') || sql.includes('"id"'))) {
            return { rows: [MOCK_TOOL] };
          }
          if (sql.includes('SELECT * FROM "ToolRequirement"') && sql.includes('toolRequirementId')) {
            return { rows: [reqs[0]] };
          }
          if (sql.includes('UPDATE "ToolRequirement"')) {
            const completedIdx = sql.indexOf('"completedAt"');
            if (completedIdx > -1) {
              // completedAt should be null
              updatedCompletedAt = params.find((p) => p === null);
            }
            return { rows: [{ ...reqs[0], status: 'in_progress', completedAt: null }] };
          }
          if (sql.includes('FROM "ToolRequirement"') && sql.includes('SELECT "status"')) {
            return { rows: [{ status: 'in_progress', progress: 50 }] };
          }
          if (sql.includes('UPDATE "AITool"')) return { rows: [MOCK_TOOL], rowCount: 1 };
          if (sql.includes('INSERT INTO "AuditLog"')) return { rows: [{ auditLogId: 1 }] };
          return { rows: [] };
        },
      };
      const { application } = await buildFullSandbox(mockDb);

      await application.classification.updateRequirement.update({
        toolId: 5,
        requirementId: 1,
        userId: 1,
        organizationId: 10,
        data: { status: 'in_progress', progress: 50 },
      });

      assert.strictEqual(updatedCompletedAt, null, 'completedAt should be set to null');
    });

    it('returns 404 for non-existent tool', async () => {
      const mockDb = createMockDb(null, []);
      const { application } = await buildFullSandbox(mockDb);

      await assert.rejects(
        () => application.classification.updateRequirement.update({
          toolId: 999,
          requirementId: 1,
          userId: 1,
          organizationId: 10,
          data: { status: 'completed' },
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 404);
          return true;
        },
      );
    });

    it('returns 404 for non-existent requirement', async () => {
      const mockDb = {
        query: async (sql) => {
          if (sql.includes('FROM "Permission"')) {
            return { rows: [{ role: 'owner', resource: 'AITool', action: 'manage' }] };
          }
          if (sql.includes('FROM "User"')) return { rows: [MOCK_USER] };
          if (sql.includes('UPDATE "User"')) return { rows: [] };
          if (sql.includes('FROM "AITool"') && (sql.includes('"aIToolId"') || sql.includes('"id"'))) {
            return { rows: [MOCK_TOOL] };
          }
          if (sql.includes('SELECT * FROM "ToolRequirement"') && sql.includes('toolRequirementId')) {
            return { rows: [] }; // requirement not found
          }
          return { rows: [] };
        },
      };
      const { application } = await buildFullSandbox(mockDb);

      await assert.rejects(
        () => application.classification.updateRequirement.update({
          toolId: 5,
          requirementId: 999,
          userId: 1,
          organizationId: 10,
          data: { status: 'completed' },
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 404);
          return true;
        },
      );
    });

    it('creates audit log entry on update', async () => {
      let auditCalled = false;
      const reqs = [
        { toolRequirementId: 1, aiToolId: 5, requirementId: 10, status: 'pending', progress: 0, completedAt: null },
      ];
      const mockDb = {
        query: async (sql, params) => {
          if (sql.includes('FROM "Permission"')) {
            return { rows: [{ role: 'owner', resource: 'AITool', action: 'manage' }] };
          }
          if (sql.includes('FROM "User"')) return { rows: [MOCK_USER] };
          if (sql.includes('UPDATE "User"')) return { rows: [] };
          if (sql.includes('FROM "AITool"') && (sql.includes('"aIToolId"') || sql.includes('"id"'))) {
            return { rows: [MOCK_TOOL] };
          }
          if (sql.includes('SELECT * FROM "ToolRequirement"') && sql.includes('toolRequirementId')) {
            return { rows: [reqs[0]] };
          }
          if (sql.includes('UPDATE "ToolRequirement"')) {
            return { rows: [{ ...reqs[0], status: 'in_progress' }] };
          }
          if (sql.includes('FROM "ToolRequirement"') && sql.includes('SELECT "status"')) {
            return { rows: [{ status: 'in_progress', progress: 30 }] };
          }
          if (sql.includes('UPDATE "AITool"')) return { rows: [MOCK_TOOL], rowCount: 1 };
          if (sql.includes('INSERT INTO "AuditLog"')) {
            auditCalled = true;
            assert.strictEqual(params[2], 'update');
            assert.strictEqual(params[3], 'ToolRequirement');
            return { rows: [{ auditLogId: 1 }] };
          }
          return { rows: [] };
        },
      };
      const { application } = await buildFullSandbox(mockDb);

      await application.classification.updateRequirement.update({
        toolId: 5,
        requirementId: 1,
        userId: 1,
        organizationId: 10,
        data: { status: 'in_progress', progress: 30 },
      });

      assert(auditCalled, 'AuditLog insert should be called');
    });
  });
});
