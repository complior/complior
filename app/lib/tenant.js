(() => {
  const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  const VALID_DIRS = new Set(['ASC', 'DESC']);

  const assertValidColumn = (col) => {
    if (!col || !VALID_IDENTIFIER.test(col)) {
      throw new errors.ValidationError(
        `Invalid column name: ${String(col).slice(0, 50)}`,
      );
    }
  };

  const TENANT_TABLES = new Set([
    'AITool', 'AuditLog', 'Subscription', 'Conversation', 'Notification',
    'AIToolDiscovery', 'ComplianceDocument', 'FRIAAssessment',
    'LiteracyCompletion', 'User', 'Invitation', 'ApiKey',
  ]);

  const GLOBAL_TABLES = new Set([
    'AIToolCatalog', 'Requirement', 'TrainingCourse', 'Plan', 'Role',
    'Permission', 'Organization', 'TrainingModule', 'RegulatoryUpdate',
  ]);

  /* Registry tables use "id" as PK; all others use "{camelCase}Id" */
  const REGISTRY_TABLES = new Set(['Organization', 'User']);

  const getPkColumn = (table) => {
    if (REGISTRY_TABLES.has(table)) return 'id';
    return `${table[0].toLowerCase()}${table.slice(1)}Id`;
  };

  const addIdAlias = (table, row) => {
    if (!row) return row;
    const pk = getPkColumn(table);
    if (pk !== 'id' && row[pk] !== undefined) return { ...row, id: row[pk] };
    return row;
  };

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
          assertValidColumn(col);
          if (val === null) {
            conditions.push(`"${col}" IS NULL`);
          } else {
            conditions.push(`"${col}" = $${idx++}`);
            values.push(val);
          }
        }

        let sql = `SELECT * FROM "${table}" WHERE ${conditions.join(' AND ')}`;
        if (orderBy) {
          assertValidColumn(orderBy.column);
          const dir = VALID_DIRS.has(String(orderBy.dir).toUpperCase())
            ? String(orderBy.dir).toUpperCase()
            : 'ASC';
          sql += ` ORDER BY "${orderBy.column}" ${dir}`;
        }
        if (limit) { sql += ` LIMIT $${idx++}`; values.push(limit); }
        if (offset) { sql += ` OFFSET $${idx++}`; values.push(offset); }

        const result = await db.query(sql, values);
        result.rows = result.rows.map((r) => addIdAlias(table, r));
        return result;
      },

      async findOne(table, id) {
        const pk = getPkColumn(table);
        const result = await db.query(
          `SELECT * FROM "${table}" WHERE "${pk}" = $1 AND "organizationId" = $2`,
          [id, organizationId],
        );
        return addIdAlias(table, result.rows[0]) || null;
      },

      async count(table, where = {}) {
        const conditions = ['"organizationId" = $1'];
        const values = [organizationId];
        let idx = 2;

        for (const [col, val] of Object.entries(where)) {
          assertValidColumn(col);
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
        cols.forEach((c) => assertValidColumn(c));
        const vals = Object.values(record);
        const placeholders = cols.map((_, i) => `$${i + 1}`);

        const result = await db.query(
          `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')})
           VALUES (${placeholders.join(', ')})
           RETURNING *`,
          vals,
        );
        return addIdAlias(table, result.rows[0]);
      },

      async update(table, id, data) {
        if (data.organizationId && data.organizationId !== organizationId) {
          throw new errors.ForbiddenError(
            'Cannot transfer resource to another organization',
          );
        }

        const pk = getPkColumn(table);
        const cols = Object.keys(data);
        cols.forEach((c) => assertValidColumn(c));
        const vals = Object.values(data);
        const sets = cols.map((c, i) => `"${c}" = $${i + 1}`);
        vals.push(id, organizationId);

        const result = await db.query(
          `UPDATE "${table}" SET ${sets.join(', ')}
           WHERE "${pk}" = $${vals.length - 1} AND "organizationId" = $${vals.length}
           RETURNING *`,
          vals,
        );
        return addIdAlias(table, result.rows[0]) || null;
      },

      async remove(table, id) {
        const pk = getPkColumn(table);
        const result = await db.query(
          `DELETE FROM "${table}" WHERE "${pk}" = $1 AND "organizationId" = $2 RETURNING "${pk}"`,
          [id, organizationId],
        );
        return result.rowCount > 0;
      },
    };
  };

  return { createTenantQuery, isTenantTable, getPkColumn, TENANT_TABLES, GLOBAL_TABLES };
})()
