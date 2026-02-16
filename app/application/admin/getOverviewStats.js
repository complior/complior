({
  getStats: async () => {
    const [usersResult, orgsResult, subsResult, mrrResult, distResult] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM "User"'),
      db.query('SELECT COUNT(*)::int AS count FROM "Organization"'),
      db.query('SELECT COUNT(*)::int AS count FROM "Subscription" WHERE "status" IN (\'active\', \'trialing\')'),
      db.query(`SELECT COALESCE(SUM(p."priceMonthly"), 0) AS mrr
        FROM "Subscription" s
        JOIN "Plan" p ON p."planId" = s."planId"
        WHERE s."status" = 'active'`),
      db.query(`SELECT p."name" AS "planName", p."displayName", COUNT(s."subscriptionId")::int AS count
        FROM "Plan" p
        LEFT JOIN "Subscription" s ON s."planId" = p."planId" AND s."status" IN ('active', 'trialing')
        GROUP BY p."planId", p."name", p."displayName"
        ORDER BY p."sortOrder"`),
    ]);

    return {
      totalUsers: usersResult.rows[0].count,
      totalOrganizations: orgsResult.rows[0].count,
      activeSubscriptions: subsResult.rows[0].count,
      mrr: parseFloat(mrrResult.rows[0].mrr) || 0,
      planDistribution: distResult.rows.map((r) => ({
        planName: r.planName,
        displayName: r.displayName,
        count: r.count,
      })),
    };
  },
})
