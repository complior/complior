'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const createAuditLogger = require('../src/lib/audit.js');

const createMockDb = () => {
  const queries = [];
  return {
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (sql.includes('INSERT INTO "AuditLog"')) {
        return { rows: [{ auditLogId: 1 }] };
      }
      if (sql.includes('COUNT')) {
        return { rows: [{ total: 42 }] };
      }
      if (sql.includes('SELECT al.*')) {
        return {
          rows: [
            { id: 1, action: 'login', resource: 'User', email: 'test@example.com' },
            { id: 2, action: 'login', resource: 'User', email: 'other@example.com' },
          ],
        };
      }
      return { rows: [] };
    },
    getQueries: () => queries,
  };
};

describe('audit logging', () => {
  describe('createAuditEntry', () => {
    it('inserts audit record with all fields', async () => {
      const db = createMockDb();
      const audit = createAuditLogger(db);
      const entry = await audit.createAuditEntry({
        userId: 1,
        organizationId: 10,
        action: 'login',
        resource: 'User',
        resourceId: 1,
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
      assert(entry.auditLogId);
      const q = db.getQueries().at(-1);
      assert(q.sql.includes('INSERT INTO "AuditLog"'));
      assert.strictEqual(q.params[0], 1); // userId
      assert.strictEqual(q.params[1], 10); // organizationId
      assert.strictEqual(q.params[2], 'login'); // action
    });

    it('handles null oldData and newData', async () => {
      const db = createMockDb();
      const audit = createAuditLogger(db);
      await audit.createAuditEntry({
        userId: 1,
        organizationId: 10,
        action: 'login',
        resource: 'User',
      });
      const q = db.getQueries().at(-1);
      assert.strictEqual(q.params[5], null); // oldData
      assert.strictEqual(q.params[6], null); // newData
    });
  });

  describe('findEntries', () => {
    it('returns paginated results for organization', async () => {
      const db = createMockDb();
      const audit = createAuditLogger(db);
      const result = await audit.findEntries(10, { page: 1, pageSize: 20 });
      assert.strictEqual(result.pagination.total, 42);
      assert.strictEqual(result.pagination.page, 1);
      assert.strictEqual(result.pagination.pageSize, 20);
      assert.strictEqual(result.pagination.totalPages, 3);
      assert.strictEqual(result.data.length, 2);
    });

    it('filters by action when provided', async () => {
      const db = createMockDb();
      const audit = createAuditLogger(db);
      await audit.findEntries(10, { action: 'login' });
      const queries = db.getQueries();
      const countQuery = queries.find((q) => q.sql.includes('COUNT'));
      assert(countQuery.sql.includes('"action" = $2'));
    });

    it('filters by resource when provided', async () => {
      const db = createMockDb();
      const audit = createAuditLogger(db);
      await audit.findEntries(10, { resource: 'User' });
      const queries = db.getQueries();
      const countQuery = queries.find((q) => q.sql.includes('COUNT'));
      assert(countQuery.sql.includes('"resource" = $2'));
    });
  });
});
