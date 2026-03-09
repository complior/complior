({
  get: async ({ organizationId }) => {
    const result = await db.query(
      `SELECT
         "riskLevel", "source", "lifecycle", "autonomyLevel",
         COUNT(*)::int AS count
       FROM "AITool"
       WHERE "organizationId" = $1
       GROUP BY "riskLevel", "source", "lifecycle", "autonomyLevel"`,
      [organizationId],
    );

    const byRisk = {};
    const bySource = {};
    const byLifecycle = {};
    const byAutonomy = {};
    let total = 0;

    for (const row of result.rows) {
      total += row.count;

      const risk = row.riskLevel || 'unclassified';
      byRisk[risk] = (byRisk[risk] || 0) + row.count;

      const source = row.source || 'manual';
      bySource[source] = (bySource[source] || 0) + row.count;

      const lifecycle = row.lifecycle || 'active';
      byLifecycle[lifecycle] = (byLifecycle[lifecycle] || 0) + row.count;

      if (row.autonomyLevel) {
        byAutonomy[row.autonomyLevel] = (byAutonomy[row.autonomyLevel] || 0) + row.count;
      }
    }

    return { total, byRisk, bySource, byLifecycle, byAutonomy };
  },
})
