({
  list: async ({ query, organizationId }) => {
    const parsed = schemas.DocumentListSchema.parse(query || {});
    const offset = (parsed.page - 1) * parsed.pageSize;

    const conditions = ['d."organizationId" = $1'];
    const values = [organizationId];
    let idx = 2;

    if (parsed.toolId) {
      conditions.push(`d."aiToolId" = $${idx++}`);
      values.push(parsed.toolId);
    }

    if (parsed.status) {
      conditions.push(`d."status" = $${idx++}`);
      values.push(parsed.status);
    }

    if (parsed.documentType) {
      conditions.push(`d."documentType" = $${idx++}`);
      values.push(parsed.documentType);
    }

    const where = conditions.join(' AND ');

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM "ComplianceDocument" d
       WHERE ${where}`,
      values,
    );
    const total = countResult.rows[0].total;

    const result = await db.query(
      `SELECT d."complianceDocumentId", d."aiToolId", d."documentType",
              d."title", d."version", d."status", d."fileUrl",
              t."name" AS "toolName", t."riskLevel" AS "toolRiskLevel",
              (SELECT COUNT(*)::int FROM "DocumentSection"
               WHERE "documentId" = d."complianceDocumentId"
               AND "status" != 'empty'
              ) AS "completedSections",
              (SELECT COUNT(*)::int FROM "DocumentSection"
               WHERE "documentId" = d."complianceDocumentId"
              ) AS "totalSections"
       FROM "ComplianceDocument" d
       JOIN "AITool" t ON t."aIToolId" = d."aiToolId"
       WHERE ${where}
       ORDER BY d."complianceDocumentId" DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, parsed.pageSize, offset],
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
