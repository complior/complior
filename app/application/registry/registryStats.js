({
  stats: async () => {
    const result = await db.query(`
      SELECT
        COUNT(*)::int                                                          AS "totalTools",
        COUNT(*) FILTER (WHERE "riskLevel" = 'high')::int                    AS "highRisk",
        COUNT(*) FILTER (WHERE "riskLevel" = 'gpai_systemic')::int           AS "gpaiSystemic",
        COUNT(*) FILTER (WHERE "riskLevel" = 'gpai')::int                    AS "gpai",
        COUNT(*) FILTER (WHERE "riskLevel" = 'limited')::int                 AS "limited",
        COUNT(*) FILTER (WHERE "riskLevel" = 'minimal')::int                 AS "minimal",
        COUNT(*) FILTER (WHERE "riskLevel" = 'unacceptable')::int            AS "unacceptable",
        COUNT(*) FILTER (WHERE "level" = 'verified')::int                    AS "verified",
        COUNT(*) FILTER (WHERE "level" = 'scanned')::int                     AS "scanned",
        COUNT(*) FILTER (WHERE "level" = 'classified')::int                  AS "classified",
        COUNT(*) FILTER (
          WHERE "detectionPatterns" IS NOT NULL
            AND "detectionPatterns" != 'null'::jsonb
        )::int                                                                AS "withDetectionPatterns",
        MAX("updatedAt")                                                      AS "lastUpdated"
      FROM "RegistryTool"
      WHERE "active" = true
    `);

    const row = result.rows[0];

    const categoryResult = await db.query(`
      SELECT "category", COUNT(*)::int AS "count"
      FROM "RegistryTool"
      WHERE "active" = true AND "category" IS NOT NULL
      GROUP BY "category"
      ORDER BY "count" DESC
      LIMIT 15
    `);

    return {
      totalTools: row.totalTools,
      byRiskLevel: {
        unacceptable: row.unacceptable,
        high: row.highRisk,
        gpai_systemic: row.gpaiSystemic,
        gpai: row.gpai,
        limited: row.limited,
        minimal: row.minimal,
      },
      byLevel: {
        verified: row.verified,
        scanned: row.scanned,
        classified: row.classified,
      },
      withDetectionPatterns: row.withDetectionPatterns,
      topCategories: categoryResult.rows,
      lastUpdated: row.lastUpdated,
    };
  },
})
