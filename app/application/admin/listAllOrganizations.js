({
  list: async ({ q, page = 1, pageSize = 20, sortDir = 'desc', planName }) => {
    const offset = (page - 1) * pageSize;
    const params = [];
    const conditions = [];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`o."name" ILIKE $${params.length}`);
    }

    if (planName) {
      params.push(planName);
      conditions.push(`p."name" = $${params.length}`);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const dir = sortDir === 'asc' ? 'ASC' : 'DESC';
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const sql = `
      SELECT o."id", o."name", o."industry", o."size", o."country",
             (SELECT COUNT(*)::int FROM "User" u WHERE u."organizationId" = o."id") AS "userCount",
             (SELECT COUNT(*)::int FROM "AITool" t WHERE t."organizationId" = o."id") AS "toolCount",
             p."name" AS "planName",
             s."status" AS "subscriptionStatus",
             COUNT(*) OVER() AS "totalCount"
      FROM "Organization" o
      LEFT JOIN "Subscription" s ON s."organizationId" = o."id"
      LEFT JOIN "Plan" p ON p."planId" = s."planId"
      ${whereClause}
      ORDER BY o."id" ${dir}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

    params.push(pageSize, offset);
    const result = await db.query(sql, params);
    const total = result.rows.length > 0 ? parseInt(result.rows[0].totalCount, 10) : 0;

    return {
      data: result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        industry: r.industry,
        size: r.size,
        country: r.country,
        userCount: r.userCount,
        toolCount: r.toolCount,
        planName: r.planName || 'free',
        subscriptionStatus: r.subscriptionStatus || 'none',
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },
})
