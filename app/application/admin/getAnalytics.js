({
  getAnalytics: async () => {
    const [
      usersByDay,
      subscriptionsByDay,
      revenueByPlan,
      statusDistribution,
      kpiResult,
      trialConversion,
      recentSignups,
    ] = await Promise.all([
      // 1. User signups per day (last 30 days)
      db.query(`
        SELECT d::date AS day, COUNT(u."id")::int AS count
        FROM generate_series(
          (CURRENT_DATE - INTERVAL '29 days'), CURRENT_DATE, '1 day'
        ) AS d
        LEFT JOIN "User" u ON u."creation"::date = d::date
        GROUP BY d::date
        ORDER BY d::date`),

      // 2. Subscriptions created per day (last 30 days, using currentPeriodStart)
      db.query(`
        SELECT d::date AS day, COUNT(s."subscriptionId")::int AS count
        FROM generate_series(
          (CURRENT_DATE - INTERVAL '29 days'), CURRENT_DATE, '1 day'
        ) AS d
        LEFT JOIN "Subscription" s ON s."currentPeriodStart"::date = d::date
        GROUP BY d::date
        ORDER BY d::date`),

      // 3. Revenue (MRR) by plan — active subs only, enterprise (priceMonthly=-1) → 0
      db.query(`
        SELECT p."planId", p."name" AS "planName", p."displayName",
               COUNT(s."subscriptionId")::int AS "activeCount",
               CASE WHEN p."priceMonthly" < 0 THEN 0
                    ELSE p."priceMonthly" * COUNT(s."subscriptionId")
               END AS "mrrCents"
        FROM "Plan" p
        LEFT JOIN "Subscription" s ON s."planId" = p."planId"
          AND s."status" IN ('active', 'trialing')
        GROUP BY p."planId", p."name", p."displayName", p."priceMonthly"
        ORDER BY p."sortOrder"`),

      // 4. Subscription status distribution
      db.query(`
        SELECT s."status", COUNT(*)::int AS count
        FROM "Subscription" s
        GROUP BY s."status"
        ORDER BY count DESC`),

      // 5. KPIs — total MRR, active trials, active paid
      db.query(`
        SELECT
          COALESCE(SUM(CASE WHEN p."priceMonthly" > 0 AND s."status" = 'active'
                             THEN p."priceMonthly" ELSE 0 END), 0)::bigint AS "totalMrrCents",
          COUNT(CASE WHEN s."status" = 'trialing' THEN 1 END)::int AS "activeTrials",
          COUNT(CASE WHEN s."status" = 'active' THEN 1 END)::int AS "activePaid"
        FROM "Subscription" s
        JOIN "Plan" p ON p."planId" = s."planId"`),

      // 6. Trial conversion rate
      db.query(`
        SELECT
          COUNT(CASE WHEN s."status" IN ('active', 'past_due') THEN 1 END)::int AS converted,
          COUNT(*)::int AS total
        FROM "Subscription" s
        WHERE s."trialEndsAt" IS NOT NULL`),

      // 7. Recent signups — last 10 users with org + plan
      db.query(`
        SELECT u."id", u."email", u."fullName", u."creation" AS "createdAt",
               o."name" AS "organizationName",
               COALESCE(p."displayName", 'Free') AS "planName"
        FROM "User" u
        LEFT JOIN "Organization" o ON o."id" = u."organizationId"
        LEFT JOIN "Subscription" s ON s."organizationId" = u."organizationId"
          AND s."status" IN ('active', 'trialing')
        LEFT JOIN "Plan" p ON p."planId" = s."planId"
        ORDER BY u."creation" DESC
        LIMIT 10`),
    ]);

    // Compute derived KPIs
    const kpi = kpiResult.rows[0];
    const totalMrrCents = parseInt(kpi.totalMrrCents, 10) || 0;
    const activeTrials = kpi.activeTrials;
    const activePaid = kpi.activePaid;
    const subscriberCount = activePaid + activeTrials;
    const arpu = subscriberCount > 0
      ? Math.round(totalMrrCents / subscriberCount)
      : 0;

    const tc = trialConversion.rows[0] || { converted: 0, total: 0 };
    const trialConversionRate = tc.total > 0
      ? Math.round((tc.converted / tc.total) * 10000) / 100
      : 0;

    return {
      usersByDay: usersByDay.rows.map((r) => ({
        day: r.day, count: r.count,
      })),
      subscriptionsByDay: subscriptionsByDay.rows.map((r) => ({
        day: r.day, count: r.count,
      })),
      revenueByPlan: revenueByPlan.rows.map((r) => ({
        planName: r.planName,
        displayName: r.displayName,
        activeCount: r.activeCount,
        mrrCents: parseInt(r.mrrCents, 10) || 0,
      })),
      statusDistribution: statusDistribution.rows.map((r) => ({
        status: r.status, count: r.count,
      })),
      kpis: {
        totalMrrCents,
        activeTrials,
        activePaid,
        arpu,
        trialConversionRate,
      },
      recentSignups: recentSignups.rows.map((r) => ({
        id: r.id,
        email: r.email,
        fullName: r.fullName,
        organizationName: r.organizationName,
        planName: r.planName,
        createdAt: r.createdAt,
      })),
    };
  },
})
