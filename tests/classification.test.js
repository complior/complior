'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { loadAppModule, createTestSandbox, buildFullSandbox } = require('./helpers/test-sandbox.js');

const MOCK_USER = {
  id: 1,
  organizationId: 10,
  email: 'test@example.com',
  fullName: 'Test User',
  roles: ['owner'],
};

const MOCK_REQUIREMENTS = [
  { requirementId: 1, code: 'ART_4_LITERACY', riskLevel: 'minimal', sortOrder: 1 },
  { requirementId: 2, code: 'ART_4_TRAINING_CEO', riskLevel: 'minimal', sortOrder: 2 },
  { requirementId: 3, code: 'ART_50_TRANSPARENCY', riskLevel: 'limited', sortOrder: 50 },
  { requirementId: 4, code: 'ART_26_USAGE', riskLevel: 'high', sortOrder: 20 },
  { requirementId: 5, code: 'ART_5_PROHIBITED', riskLevel: 'prohibited', sortOrder: 10 },
];

describe('Classification Service', () => {
  describe('classifyTool', () => {
    const createClassifyMockDb = (tool) => {
      const classifications = [];
      const toolReqs = [];

      return {
        query: async (sql, params) => {
          // Permission
          if (sql.includes('FROM "Permission"')) {
            return { rows: [{ role: 'owner', resource: 'AITool', action: 'manage' }] };
          }
          // User
          if (sql.includes('FROM "User"')) {
            return { rows: [MOCK_USER] };
          }
          // Update lastLogin
          if (sql.includes('UPDATE "User"')) {
            return { rows: [] };
          }
          // AITool findOne
          if (sql.includes('FROM "AITool"') && (sql.includes('"aIToolId"') || sql.includes('"id"'))) {
            return { rows: tool ? [tool] : [] };
          }
          // Catalog lookup
          if (sql.includes('FROM "AIToolCatalog"')) {
            return { rows: [] };
          }
          // Mark previous classifications
          if (sql.includes('UPDATE "RiskClassification"')) {
            return { rowCount: 0 };
          }
          // Version
          if (sql.includes('MAX("version")')) {
            return { rows: [{ next: 1 }] };
          }
          // Insert classification
          if (sql.includes('INSERT INTO "RiskClassification"')) {
            const cls = { riskClassificationId: 1, riskLevel: params[1] };
            classifications.push(cls);
            return { rows: [cls] };
          }
          // Update AITool
          if (sql.includes('UPDATE "AITool"')) {
            return { rows: [tool], rowCount: 1 };
          }
          // Requirements lookup
          if (sql.includes('FROM "Requirement"')) {
            const levels = params;
            return { rows: MOCK_REQUIREMENTS.filter((r) => levels.includes(r.riskLevel)) };
          }
          // ToolRequirement findMany
          if (sql.includes('FROM "ToolRequirement"') && sql.includes('"organizationId"')) {
            return { rows: toolReqs };
          }
          // Insert ToolRequirement
          if (sql.includes('INSERT INTO "ToolRequirement"')) {
            const tr = { toolRequirementId: toolReqs.length + 1 };
            toolReqs.push(tr);
            return { rows: [tr] };
          }
          // Audit
          if (sql.includes('INSERT INTO "AuditLog"')) {
            return { rows: [{ auditLogId: 1 }] };
          }
          return { rows: [] };
        },
      };
    };

    it('classifies a completed minimal-risk tool', async () => {
      const tool = {
        id: 1,
        organizationId: 10,
        name: 'Code Linter',
        domain: 'coding',
        purpose: 'Static code analysis',
        dataTypes: JSON.stringify(['personal']),
        affectedPersons: JSON.stringify(['employees']),
        vulnerableGroups: false,
        autonomyLevel: 'advisory',
        humanOversight: true,
        affectsNaturalPersons: false,
        wizardCompleted: true,
        catalogEntryId: null,
      };

      const mockDb = createClassifyMockDb(tool);
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.classification.classifyTool.classify({
        toolId: 1,
        userId: 1,
        organizationId: 10,
      });

      assert.strictEqual(result.riskLevel, 'minimal');
      assert(result.confidence > 0);
      assert(result.matchedRules.length > 0);
    });

    it('classifies a high-risk employment tool', async () => {
      const tool = {
        id: 2,
        organizationId: 10,
        name: 'HireBot',
        domain: 'employment',
        purpose: 'Automated candidate screening',
        dataTypes: JSON.stringify(['personal', 'sensitive']),
        affectedPersons: JSON.stringify(['applicants']),
        vulnerableGroups: false,
        autonomyLevel: 'semi_autonomous',
        humanOversight: true,
        affectsNaturalPersons: true,
        wizardCompleted: true,
        catalogEntryId: null,
      };

      const mockDb = createClassifyMockDb(tool);
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.classification.classifyTool.classify({
        toolId: 2,
        userId: 1,
        organizationId: 10,
      });

      assert.strictEqual(result.riskLevel, 'high');
    });

    it('rejects classification for incomplete wizard', async () => {
      const tool = {
        id: 3,
        organizationId: 10,
        wizardCompleted: false,
      };

      const mockDb = createClassifyMockDb(tool);
      const { application } = await buildFullSandbox(mockDb);

      await assert.rejects(
        () => application.classification.classifyTool.classify({
          toolId: 3,
          userId: 1,
          organizationId: 10,
        }),
        (err) => {
          assert(err.message.includes('wizard'));
          return true;
        },
      );
    });

    it('rejects classification for non-existent tool', async () => {
      const mockDb = createClassifyMockDb(null);
      const { application } = await buildFullSandbox(mockDb);

      await assert.rejects(
        () => application.classification.classifyTool.classify({
          toolId: 999,
          userId: 1,
          organizationId: 10,
        }),
        (err) => {
          assert.strictEqual(err.statusCode, 404);
          return true;
        },
      );
    });
  });

  describe('mapRequirements', () => {
    it('maps minimal risk to 2 requirements', async () => {
      const toolReqs = [];
      const mockDb = {
        query: async (sql, params) => {
          if (sql.includes('FROM "Permission"')) {
            return { rows: [{ role: 'owner', resource: 'AITool', action: 'manage' }] };
          }
          if (sql.includes('FROM "Requirement"')) {
            return { rows: MOCK_REQUIREMENTS.filter((r) => params.includes(r.riskLevel)) };
          }
          if (sql.includes('FROM "ToolRequirement"')) {
            return { rows: toolReqs };
          }
          if (sql.includes('INSERT INTO "ToolRequirement"')) {
            const tr = { toolRequirementId: toolReqs.length + 1 };
            toolReqs.push(tr);
            return { rows: [tr] };
          }
          return { rows: [] };
        },
      };

      const { application } = await buildFullSandbox(mockDb);
      const result = await application.classification.mapRequirements.map({
        aiToolId: 1,
        riskLevel: 'minimal',
        organizationId: 10,
      });

      assert.strictEqual(result.length, 2); // 2 minimal requirements
    });

    it('maps high risk to all applicable requirements', async () => {
      const toolReqs = [];
      const mockDb = {
        query: async (sql, params) => {
          if (sql.includes('FROM "Permission"')) {
            return { rows: [{ role: 'owner', resource: 'AITool', action: 'manage' }] };
          }
          if (sql.includes('FROM "Requirement"')) {
            return { rows: MOCK_REQUIREMENTS.filter((r) => params.includes(r.riskLevel)) };
          }
          if (sql.includes('FROM "ToolRequirement"')) {
            return { rows: toolReqs };
          }
          if (sql.includes('INSERT INTO "ToolRequirement"')) {
            const tr = { toolRequirementId: toolReqs.length + 1 };
            toolReqs.push(tr);
            return { rows: [tr] };
          }
          return { rows: [] };
        },
      };

      const { application } = await buildFullSandbox(mockDb);
      const result = await application.classification.mapRequirements.map({
        aiToolId: 1,
        riskLevel: 'high',
        organizationId: 10,
      });

      // High includes: minimal(2) + limited(1) + high(1) = 4
      assert.strictEqual(result.length, 4);
    });

    it('is idempotent (skips existing requirements)', async () => {
      const toolReqs = [{ requirementId: 1 }]; // Already has req 1
      const mockDb = {
        query: async (sql, params) => {
          if (sql.includes('FROM "Permission"')) {
            return { rows: [{ role: 'owner', resource: 'AITool', action: 'manage' }] };
          }
          if (sql.includes('FROM "Requirement"')) {
            return { rows: MOCK_REQUIREMENTS.filter((r) => params.includes(r.riskLevel)) };
          }
          if (sql.includes('FROM "ToolRequirement"')) {
            return { rows: toolReqs };
          }
          if (sql.includes('INSERT INTO "ToolRequirement"')) {
            const tr = { toolRequirementId: toolReqs.length + 1, requirementId: params?.[2] };
            toolReqs.push(tr);
            return { rows: [tr] };
          }
          return { rows: [] };
        },
      };

      const { application } = await buildFullSandbox(mockDb);
      const result = await application.classification.mapRequirements.map({
        aiToolId: 1,
        riskLevel: 'minimal',
        organizationId: 10,
      });

      // Should only create 1 (skipping the existing one)
      assert.strictEqual(result.length, 1);
    });
  });
});
