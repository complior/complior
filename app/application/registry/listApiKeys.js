(() => {
  return {
    list: async ({ organizationId }) => {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const nextMonth = now.getMonth() === 11
        ? `${now.getFullYear() + 1}-01-01`
        : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`;

      const result = await db.query(
        `SELECT k."apiKeyId", k."keyPrefix", k."name", k."plan", k."rateLimit",
                k."lastUsedAt", k."expiresAt", k."createdAt",
                COALESCE(SUM(u."requestCount"), 0)::int AS "requestCount",
                COALESCE(SUM(u."bytesTransferred"), 0)::int AS "bytesTransferred"
         FROM "ApiKey" k
         LEFT JOIN "ApiUsage" u ON u."apiKeyId" = k."apiKeyId"
           AND u."usageDate" >= $2 AND u."usageDate" < $3
         WHERE k."organizationId" = $1 AND k."active" = true
         GROUP BY k."apiKeyId"
         ORDER BY k."createdAt" DESC`,
        [organizationId, monthStart, nextMonth],
      );

      return {
        data: result.rows.map((row) => ({
          apiKeyId: row.apiKeyId,
          keyPrefix: row.keyPrefix,
          name: row.name,
          plan: row.plan,
          rateLimit: row.rateLimit,
          lastUsedAt: row.lastUsedAt,
          expiresAt: row.expiresAt,
          createdAt: row.createdAt,
          usage: {
            requestCount: row.requestCount,
            bytesTransferred: row.bytesTransferred,
          },
        })),
      };
    },
  };
})()
