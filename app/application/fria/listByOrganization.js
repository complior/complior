({
  list: async ({ query, organizationId }) => {
    const parsed = schemas.FRIAListSchema.parse(query || {});
    const offset = (parsed.page - 1) * parsed.pageSize;

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM "FRIAAssessment"
       WHERE "organizationId" = $1`,
      [organizationId],
    );
    const total = countResult.rows[0].total;

    const result = await db.query(
      `SELECT f."fRIAAssessmentId", f."aiToolId", f."status",
              f."completedAt", f."createdById",
              t."name" AS "toolName", t."riskLevel" AS "toolRiskLevel",
              (SELECT COUNT(*)::int FROM "FRIASection"
               WHERE "friaId" = f."fRIAAssessmentId" AND "completed" = true
              ) AS "completedSections",
              (SELECT COUNT(*)::int FROM "FRIASection"
               WHERE "friaId" = f."fRIAAssessmentId"
              ) AS "totalSections"
       FROM "FRIAAssessment" f
       JOIN "AITool" t ON t."aIToolId" = f."aiToolId"
       WHERE f."organizationId" = $1
       ORDER BY f."fRIAAssessmentId" DESC
       LIMIT $2 OFFSET $3`,
      [organizationId, parsed.pageSize, offset],
    );

    return {
      data: result.rows,
      pagination: {
        page: parsed.page,
        pageSize: parsed.pageSize,
        total,
        totalPages: Math.ceil(total / parsed.pageSize),
      },
    };
  },
})
