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
};

const MOCK_CLASSIFICATIONS = [
  {
    riskClassificationId: 3, aiToolId: 5, version: 3, isCurrent: true,
    riskLevel: 'limited', confidence: 85, method: 'rule_only',
    classifiedByEmail: 'test@example.com', classifiedByName: 'Test User',
  },
  {
    riskClassificationId: 2, aiToolId: 5, version: 2, isCurrent: false,
    riskLevel: 'high', confidence: 90, method: 'rule_only',
    classifiedByEmail: 'test@example.com', classifiedByName: 'Test User',
  },
  {
    riskClassificationId: 1, aiToolId: 5, version: 1, isCurrent: false,
    riskLevel: 'minimal', confidence: 60, method: 'rule_only',
    classifiedByEmail: 'test@example.com', classifiedByName: 'Test User',
  },
];

describe('Classification History', () => {
  it('returns current classification and history', async () => {
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
        if (sql.includes('FROM "RiskClassification"')) {
          return { rows: MOCK_CLASSIFICATIONS };
        }
        return { rows: [] };
      },
    };

    const { application } = await buildFullSandbox(mockDb);
    const result = await application.classification.getClassificationHistory.getHistory({
      toolId: 5,
      organizationId: 10,
    });

    assert.strictEqual(result.toolId, 5);
    assert.strictEqual(result.toolName, 'TestBot');
    assert.strictEqual(result.totalVersions, 3);
    assert.strictEqual(result.current.riskLevel, 'limited');
    assert.strictEqual(result.current.isCurrent, true);
    assert.strictEqual(result.history.length, 2);
  });

  it('returns null current when no classifications exist', async () => {
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
        if (sql.includes('FROM "RiskClassification"')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    const { application } = await buildFullSandbox(mockDb);
    const result = await application.classification.getClassificationHistory.getHistory({
      toolId: 5,
      organizationId: 10,
    });

    assert.strictEqual(result.current, null);
    assert.strictEqual(result.history.length, 0);
    assert.strictEqual(result.totalVersions, 0);
  });

  it('returns 404 for non-existent tool', async () => {
    const mockDb = {
      query: async (sql) => {
        if (sql.includes('FROM "Permission"')) {
          return { rows: [{ role: 'owner', resource: 'AITool', action: 'manage' }] };
        }
        if (sql.includes('FROM "User"')) return { rows: [MOCK_USER] };
        if (sql.includes('UPDATE "User"')) return { rows: [] };
        if (sql.includes('FROM "AITool"')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    const { application } = await buildFullSandbox(mockDb);

    await assert.rejects(
      () => application.classification.getClassificationHistory.getHistory({
        toolId: 999,
        organizationId: 10,
      }),
      (err) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      },
    );
  });

  it('history is sorted by version DESC', async () => {
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
        if (sql.includes('FROM "RiskClassification"')) {
          return { rows: MOCK_CLASSIFICATIONS };
        }
        return { rows: [] };
      },
    };

    const { application } = await buildFullSandbox(mockDb);
    const result = await application.classification.getClassificationHistory.getHistory({
      toolId: 5,
      organizationId: 10,
    });

    assert(result.history[0].version > result.history[1].version,
      'History should be sorted by version DESC');
  });
});
