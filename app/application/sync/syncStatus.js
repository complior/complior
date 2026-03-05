({
  getStatus: async ({ organizationId }) => {
    const history = await db.query(
      `SELECT "syncType", "status", "toolSlug", "creation"
       FROM "SyncHistory"
       WHERE "organizationId" = $1
       ORDER BY "creation" DESC
       LIMIT 10`,
      [organizationId],
    );

    const stats = await db.query(
      `SELECT
         COUNT(*)::int AS "totalSyncs",
         COUNT(*) FILTER (WHERE "syncType" = 'passport')::int AS "passportSyncs",
         COUNT(*) FILTER (WHERE "syncType" = 'scan')::int AS "scanSyncs",
         MAX("creation") AS "lastSyncAt"
       FROM "SyncHistory"
       WHERE "organizationId" = $1`,
      [organizationId],
    );

    return {
      stats: stats.rows[0] || { totalSyncs: 0, passportSyncs: 0, scanSyncs: 0, lastSyncAt: null },
      recentHistory: history.rows,
    };
  },
})
