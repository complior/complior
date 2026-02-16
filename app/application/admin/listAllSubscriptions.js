({
  list: async ({ q, page = 1, pageSize = 20, sortDir = 'desc', status, planName }) => {
    const offset = (page - 1) * pageSize;
    const params = [];
    const conditions = [];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`o."name" ILIKE $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`s."status" = $${params.length}`);
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
      SELECT s."subscriptionId", s."status", s."billingPeriod",
             s."stripeSubscriptionId", s."currentPeriodStart", s."currentPeriodEnd",
             s."trialEndsAt", s."canceledAt",
             o."name" AS "organizationName",
             p."name" AS "planName", p."displayName" AS "planDisplayName",
             p."priceMonthly",
             COUNT(*) OVER() AS "totalCount"
      FROM "Subscription" s
      JOIN "Organization" o ON o."id" = s."organizationId"
      JOIN "Plan" p ON p."planId" = s."planId"
      ${whereClause}
      ORDER BY s."subscriptionId" ${dir}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

    params.push(pageSize, offset);
    const result = await db.query(sql, params);
    const total = result.rows.length > 0 ? parseInt(result.rows[0].totalCount, 10) : 0;

    return {
      data: result.rows.map((r) => ({
        subscriptionId: r.subscriptionId,
        organizationName: r.organizationName,
        planName: r.planName,
        planDisplayName: r.planDisplayName,
        priceMonthly: r.priceMonthly,
        status: r.status,
        billingPeriod: r.billingPeriod,
        stripeSubscriptionId: r.stripeSubscriptionId,
        currentPeriodStart: r.currentPeriodStart,
        currentPeriodEnd: r.currentPeriodEnd,
        trialEndsAt: r.trialEndsAt,
        canceledAt: r.canceledAt,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },
})
