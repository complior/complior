(() => {
  const TENANT_TABLES = new Set([
    'AITool', 'AuditLog', 'Subscription', 'Conversation', 'Notification',
    'AIToolDiscovery', 'ComplianceDocument', 'FRIAAssessment',
    'LiteracyCompletion', 'User',
  ]);

  const GLOBAL_TABLES = new Set([
    'AIToolCatalog', 'Requirement', 'TrainingCourse', 'Plan', 'Role',
    'Permission', 'Organization', 'TrainingModule', 'RegulatoryUpdate',
  ]);

  const isTenantTable = (table) => TENANT_TABLES.has(table);

  const createTenantQuery = (organizationId) => {
    if (!organizationId) {
      throw new errors.ValidationError(
        'organizationId is required for tenant queries',
      );
    }

    return {
      async findMany(table, { where = {}, orderBy, limit, offset } = {}) {
        const conditions = ['"organizationId" = $1'];
        const values = [organizationId];
        let idx = 2;

        for (const [col, val] of Object.entries(where)) {
          if (val === null) {
            conditions.push(`"${col}" IS NULL`);
          } else {
            conditions.push(`"${col}" = $${idx++}`);
            values.push(val);
          }
        }

        let sql = `SELECT * FROM "${table}" WHERE ${conditions.join(' AND ')}`;
        if (orderBy) {
          sql += ` ORDER BY "${orderBy.column}" ${orderBy.dir || 'ASC'}`;
        }
        if (limit) { sql += ` LIMIT $${idx++}`; values.push(limit); }
        if (offset) { sql += ` OFFSET $${idx++}`; values.push(offset); }

        return db.query(sql, values);
      },

      async findOne(table, id) {
        const result = await db.query(
          `SELECT * FROM "${table}" WHERE "id" = $1 AND "organizationId" = $2`,
          [id, organizationId],
        );
        return result.rows[0] || null;
      },

      async count(table, where = {}) {
        const conditions = ['"organizationId" = $1'];
        const values = [organizationId];
        let idx = 2;

        for (const [col, val] of Object.entries(where)) {
          if (val === null) {
            conditions.push(`"${col}" IS NULL`);
          } else {
            conditions.push(`"${col}" = $${idx++}`);
            values.push(val);
          }
        }

        const result = await db.query(
          `SELECT COUNT(*)::int AS total FROM "${table}" WHERE ${conditions.join(' AND ')}`,
          values,
        );
        return result.rows[0].total;
      },

      async create(table, data) {
        if (data.organizationId && data.organizationId !== organizationId) {
          throw new errors.ForbiddenError(
            'Cannot create resource for another organization',
          );
        }
        const record = { ...data, organizationId };
        const cols = Object.keys(record);
        const vals = Object.values(record);
        const placeholders = cols.map((_, i) => `$${i + 1}`);

        const result = await db.query(
          `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')})
           VALUES (${placeholders.join(', ')})
           RETURNING *`,
          vals,
        );
        return result.rows[0];
      },

      async update(table, id, data) {
        if (data.organizationId && data.organizationId !== organizationId) {
          throw new errors.ForbiddenError(
            'Cannot transfer resource to another organization',
          );
        }

        const cols = Object.keys(data);
        const vals = Object.values(data);
        const sets = cols.map((c, i) => `"${c}" = $${i + 1}`);
        vals.push(id, organizationId);

        const result = await db.query(
          `UPDATE "${table}" SET ${sets.join(', ')}
           WHERE "id" = $${vals.length - 1} AND "organizationId" = $${vals.length}
           RETURNING *`,
          vals,
        );
        return result.rows[0] || null;
      },

      async remove(table, id) {
        const result = await db.query(
          `DELETE FROM "${table}" WHERE "id" = $1 AND "organizationId" = $2 RETURNING "id"`,
          [id, organizationId],
        );
        return result.rowCount > 0;
      },
    };
  };

  return { createTenantQuery, isTenantTable, TENANT_TABLES, GLOBAL_TABLES };
})()
