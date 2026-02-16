({
  list: async ({ q, page = 1, pageSize = 20, sortBy = 'createdAt', sortDir = 'desc' }) => {
    const offset = (page - 1) * pageSize;
    const params = [];
    let whereClause = '';

    if (q) {
      params.push(`%${q}%`);
      whereClause = 'WHERE (u."email" ILIKE $1 OR u."fullName" ILIKE $1 OR o."name" ILIKE $1)';
    }

    const validSorts = {
      email: 'u."email"',
      fullName: 'u."fullName"',
      createdAt: 'u."id"',
      lastLoginAt: 'u."lastLoginAt"',
    };
    const orderCol = validSorts[sortBy] || 'u."id"';
    const dir = sortDir === 'asc' ? 'ASC' : 'DESC';

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const sql = `
      SELECT u."id", u."email", u."fullName", u."active", u."lastLoginAt",
             o."name" AS "organizationName",
             (SELECT string_agg(r2."name", ',') FROM "UserRole" ur2
              JOIN "Role" r2 ON r2."roleId" = ur2."roleId"
              WHERE ur2."userId" = u."id") AS "roleName",
             p."name" AS "planName",
             s."status" AS "subscriptionStatus",
             COUNT(*) OVER() AS "totalCount"
      FROM "User" u
      LEFT JOIN "Organization" o ON o."id" = u."organizationId"
      LEFT JOIN "Subscription" s ON s."organizationId" = u."organizationId"
      LEFT JOIN "Plan" p ON p."planId" = s."planId"
      ${whereClause}
      ORDER BY ${orderCol} ${dir}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

    params.push(pageSize, offset);
    const result = await db.query(sql, params);
    const total = result.rows.length > 0 ? parseInt(result.rows[0].totalCount, 10) : 0;

    return {
      data: result.rows.map((r) => ({
        id: r.id,
        email: r.email,
        fullName: r.fullName,
        organizationName: r.organizationName,
        role: r.roleName || 'none',
        planName: r.planName || 'free',
        subscriptionStatus: r.subscriptionStatus || 'none',
        active: r.active,
        lastLoginAt: r.lastLoginAt,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },
})
