({
  exportAll: async ({ userId, organizationId }) => {
    const user = await db.query(
      `SELECT "id", "email", "fullName", "locale", "createdAt", "lastLoginAt"
       FROM "User" WHERE "id" = $1 AND "organizationId" = $2`,
      [userId, organizationId],
    );

    const organization = await db.query(
      `SELECT "name", "slug", "createdAt"
       FROM "Organization" WHERE "id" = $1`,
      [organizationId],
    );

    const tools = await db.query(
      `SELECT "name", "vendor", "version", "riskLevel", "status", "createdAt"
       FROM "AITool" WHERE "organizationId" = $1`,
      [organizationId],
    );

    const classifications = await db.query(
      `SELECT c."riskLevel", c."confidence", c."method", c."isCurrent", c."createdAt",
              t."name" AS "toolName"
       FROM "RiskClassification" c
       JOIN "AITool" t ON t."id" = c."aiToolId"
       WHERE t."organizationId" = $1`,
      [organizationId],
    );

    const conversations = await db.query(
      `SELECT c."title", c."context", c."createdAt",
              json_agg(json_build_object(
                'role', m."role", 'content', m."content", 'createdAt', m."createdAt"
              ) ORDER BY m."createdAt") AS messages
       FROM "Conversation" c
       LEFT JOIN "ChatMessage" m ON m."conversationId" = c."id"
       WHERE c."userId" = $1
       GROUP BY c."id"`,
      [userId],
    );

    const auditLog = await db.query(
      `SELECT "action", "resource", "details", "createdAt"
       FROM "AuditLog"
       WHERE "userId" = $1 AND "organizationId" = $2
       ORDER BY "createdAt" DESC
       LIMIT 1000`,
      [userId, organizationId],
    );

    return {
      exportedAt: new Date().toISOString(),
      gdprArticle: 'Art. 20 — Right to data portability',
      user: user.rows[0] || null,
      organization: organization.rows[0] || null,
      aiTools: tools.rows,
      riskClassifications: classifications.rows,
      conversations: conversations.rows,
      auditLog: auditLog.rows,
    };
  },
})
