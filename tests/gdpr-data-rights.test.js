'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const createMockDb = (userData = {}, toolData = []) => ({
  query: async (sql, params) => {
    if (sql.includes('FROM "Permission"')) {
      return { rows: [{ role: 'owner', resource: 'Organization', action: 'manage' }] };
    }
    if (sql.includes('FROM "User"') && sql.includes('GROUP BY')) {
      return {
        rows: [{
          id: 1, oryId: 'ory-123', email: 'test@example.com',
          fullName: 'Test User', active: true,
          organizationId: 10, locale: 'en', roles: ['owner'],
          ...userData,
        }],
      };
    }
    if (sql.includes('FROM "User"') && sql.includes('WHERE "id"')) {
      return {
        rows: [{
          id: 1, email: 'test@example.com', fullName: 'Test User',
          locale: 'en', createdAt: '2026-01-01', lastLoginAt: '2026-02-01',
        }],
      };
    }
    if (sql.includes('FROM "Organization"')) {
      return { rows: [{ name: 'TestOrg', slug: 'testorg', createdAt: '2026-01-01' }] };
    }
    if (sql.includes('FROM "AITool"')) {
      return { rows: toolData };
    }
    if (sql.includes('FROM "RiskClassification"')) {
      return { rows: [] };
    }
    if (sql.includes('FROM "Conversation"')) {
      return { rows: [] };
    }
    if (sql.includes('FROM "AuditLog"')) {
      return { rows: [] };
    }
    if (sql.includes('UPDATE "User"')) {
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO "AuditLog"')) {
      return { rows: [] };
    }
    return { rows: [] };
  },
});

describe('GDPR Data Export (application)', () => {
  it('returns all user data in export format', async () => {
    const mockDb = createMockDb({}, [
      { name: 'ChatGPT', vendor: 'OpenAI', version: '4', riskLevel: 'limited', status: 'compliant', createdAt: '2026-01-15' },
    ]);
    const { application } = await buildFullSandbox(mockDb);
    const result = await application.iam.exportUserData.exportAll({
      userId: 1, organizationId: 10,
    });
    assert.ok(result.exportedAt);
    assert.strictEqual(result.gdprArticle, 'Art. 20 — Right to data portability');
    assert.ok(result.user);
    assert.ok(result.organization);
    assert.ok(Array.isArray(result.aiTools));
    assert.ok(Array.isArray(result.riskClassifications));
    assert.ok(Array.isArray(result.conversations));
    assert.ok(Array.isArray(result.auditLog));
  });

  it('returns user email and name in export', async () => {
    const mockDb = createMockDb();
    const { application } = await buildFullSandbox(mockDb);
    const result = await application.iam.exportUserData.exportAll({
      userId: 1, organizationId: 10,
    });
    assert.strictEqual(result.user.email, 'test@example.com');
    assert.strictEqual(result.user.fullName, 'Test User');
  });
});

describe('GDPR Account Deletion (application)', () => {
  it('anonymizes user PII and deactivates account', async () => {
    let updatedEmail = null;
    let updatedName = null;
    const mockDb = {
      query: async (sql, params) => {
        if (sql.includes('FROM "Permission"')) {
          return { rows: [{ role: 'owner', resource: 'Organization', action: 'manage' }] };
        }
        if (sql.includes('UPDATE "User"')) {
          updatedEmail = params[0];
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO "AuditLog"')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    };
    const { application } = await buildFullSandbox(mockDb);
    const result = await application.iam.deleteAccount.deleteAccount({
      userId: 42, organizationId: 10, oryId: 'ory-123',
    });
    assert.strictEqual(result.deleted, true);
    assert.strictEqual(updatedEmail, 'deleted_42@deleted.local');
  });

  it('logs deletion in audit log with GDPR reference', async () => {
    let auditDetails = null;
    const mockDb = {
      query: async (sql, params) => {
        if (sql.includes('FROM "Permission"')) {
          return { rows: [{ role: 'owner', resource: 'Organization', action: 'manage' }] };
        }
        if (sql.includes('UPDATE "User"')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO "AuditLog"')) {
          auditDetails = JSON.parse(params[2]);
          return { rows: [] };
        }
        return { rows: [] };
      },
    };
    const { application } = await buildFullSandbox(mockDb);
    await application.iam.deleteAccount.deleteAccount({
      userId: 42, organizationId: 10, oryId: 'ory-123',
    });
    assert.ok(auditDetails);
    assert.ok(auditDetails.reason.includes('Art. 17'));
  });
});

describe('AccountDeleteSchema (validation)', () => {
  let AccountDeleteSchema;

  before(async () => {
    const { buildFullSandbox: bfs } = require('./helpers/test-sandbox.js');
    const schemas = require('../server/lib/schemas.js');
    AccountDeleteSchema = schemas.AccountDeleteSchema;
  });

  it('accepts { confirm: true }', () => {
    const result = AccountDeleteSchema.safeParse({ confirm: true });
    assert.strictEqual(result.success, true);
  });

  it('rejects { confirm: false }', () => {
    const result = AccountDeleteSchema.safeParse({ confirm: false });
    assert.strictEqual(result.success, false);
  });

  it('rejects empty body', () => {
    const result = AccountDeleteSchema.safeParse({});
    assert.strictEqual(result.success, false);
  });
});
