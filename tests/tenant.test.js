'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createTenantQuery, isTenantTable, TENANT_TABLES, GLOBAL_TABLES } = require('../src/lib/tenant.js');

const createMockDb = () => {
  const queries = [];
  return {
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (sql.includes('COUNT')) {
        return { rows: [{ total: 5 }] };
      }
      if (sql.includes('DELETE')) {
        return { rowCount: 1, rows: [{ id: 1 }] };
      }
      if (sql.includes('RETURNING')) {
        return { rows: [{ id: 1, organizationId: 100, name: 'Test' }] };
      }
      return { rows: [{ id: 1, organizationId: 100 }] };
    },
    getQueries: () => queries,
  };
};

describe('tenant isolation', () => {
  describe('table classification', () => {
    it('identifies tenant tables', () => {
      assert.strictEqual(isTenantTable('AITool'), true);
      assert.strictEqual(isTenantTable('AuditLog'), true);
      assert.strictEqual(isTenantTable('Subscription'), true);
    });

    it('identifies global tables', () => {
      assert.strictEqual(isTenantTable('AIToolCatalog'), false);
      assert.strictEqual(isTenantTable('Plan'), false);
      assert.strictEqual(isTenantTable('Role'), false);
    });

    it('TENANT_TABLES and GLOBAL_TABLES do not overlap', () => {
      for (const table of TENANT_TABLES) {
        assert(!GLOBAL_TABLES.has(table), `${table} is in both sets`);
      }
    });
  });

  describe('createTenantQuery', () => {
    it('throws without organizationId', () => {
      const db = createMockDb();
      assert.throws(() => createTenantQuery(db, null), (err) => err.statusCode === 400);
    });

    it('findMany injects organizationId filter', async () => {
      const db = createMockDb();
      const tq = createTenantQuery(db, 100);
      await tq.findMany('AITool');
      const lastQuery = db.getQueries().at(-1);
      assert(lastQuery.sql.includes('"organizationId" = $1'));
      assert.strictEqual(lastQuery.params[0], 100);
    });

    it('findMany supports additional where conditions', async () => {
      const db = createMockDb();
      const tq = createTenantQuery(db, 100);
      await tq.findMany('AITool', { where: { active: true }, limit: 10, offset: 0 });
      const lastQuery = db.getQueries().at(-1);
      assert(lastQuery.sql.includes('"organizationId" = $1'));
      assert(lastQuery.sql.includes('"active" = $2'));
    });

    it('findOne filters by both id and organizationId', async () => {
      const db = createMockDb();
      const tq = createTenantQuery(db, 100);
      await tq.findOne('AITool', 42);
      const lastQuery = db.getQueries().at(-1);
      assert(lastQuery.sql.includes('"id" = $1'));
      assert(lastQuery.sql.includes('"organizationId" = $2'));
      assert.deepStrictEqual(lastQuery.params, [42, 100]);
    });

    it('create injects organizationId', async () => {
      const db = createMockDb();
      const tq = createTenantQuery(db, 100);
      await tq.create('AITool', { name: 'Test Tool' });
      const lastQuery = db.getQueries().at(-1);
      assert(lastQuery.sql.includes('INSERT INTO "AITool"'));
      assert(lastQuery.params.includes(100));
    });

    it('create rejects cross-org data', async () => {
      const db = createMockDb();
      const tq = createTenantQuery(db, 100);
      await assert.rejects(
        tq.create('AITool', { name: 'Test', organizationId: 999 }),
        (err) => err.statusCode === 403,
      );
    });

    it('update filters by organizationId', async () => {
      const db = createMockDb();
      const tq = createTenantQuery(db, 100);
      await tq.update('AITool', 42, { name: 'Updated' });
      const lastQuery = db.getQueries().at(-1);
      assert(lastQuery.sql.includes('"organizationId"'));
    });

    it('update rejects cross-org transfer', async () => {
      const db = createMockDb();
      const tq = createTenantQuery(db, 100);
      await assert.rejects(
        tq.update('AITool', 42, { organizationId: 999 }),
        (err) => err.statusCode === 403,
      );
    });

    it('remove filters by organizationId', async () => {
      const db = createMockDb();
      const tq = createTenantQuery(db, 100);
      const result = await tq.remove('AITool', 42);
      assert.strictEqual(result, true);
      const lastQuery = db.getQueries().at(-1);
      assert(lastQuery.sql.includes('"organizationId" = $2'));
    });

    it('count returns total with organizationId filter', async () => {
      const db = createMockDb();
      const tq = createTenantQuery(db, 100);
      const total = await tq.count('AITool');
      assert.strictEqual(total, 5);
    });
  });
});
