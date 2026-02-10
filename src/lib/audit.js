'use strict';

const createAuditLogger = (db) => {
  const createAuditEntry = async ({
    userId, organizationId, action, resource,
    resourceId = 0, oldData = null, newData = null,
    ip = '0.0.0.0', userAgent = null,
  }) => {
    const result = await db.query(
      `INSERT INTO "AuditLog"
       ("userId", "organizationId", "action", "resource", "resourceId",
        "oldData", "newData", "ip", "userAgent")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING "id", "createdAt"`,
      [
        userId, organizationId, action, resource, resourceId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ip, userAgent,
      ],
    );
    return result.rows[0];
  };

  const findEntries = async (organizationId, options = {}) => {
    const { page = 1, pageSize = 20, action, resource } = options;
    const conditions = ['"organizationId" = $1'];
    const values = [organizationId];
    let idx = 2;

    if (action) {
      conditions.push(`"action" = $${idx++}`);
      values.push(action);
    }
    if (resource) {
      conditions.push(`"resource" = $${idx++}`);
      values.push(resource);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM "AuditLog" WHERE ${whereClause}`,
      values,
    );
    const total = countResult.rows[0].total;

    const offset = (page - 1) * pageSize;
    const dataValues = [...values, pageSize, offset];

    const result = await db.query(
      `SELECT al.*, u."email", u."fullName"
       FROM "AuditLog" al
       LEFT JOIN "User" u ON u."id" = al."userId"
       WHERE ${whereClause}
       ORDER BY al."createdAt" DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      dataValues,
    );

    return {
      data: result.rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  };

  return { createAuditEntry, findEntries };
};

module.exports = createAuditLogger;
