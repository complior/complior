({
  get: async ({ toolId, organizationId }) => {
    const tq = lib.tenant.createTenantQuery(organizationId);
    const tool = await tq.findOne('AITool', toolId);
    if (!tool) throw new errors.NotFoundError('AITool', toolId);

    const classResult = await db.query(
      `SELECT rc.* FROM "RiskClassification" rc
       JOIN "AITool" t ON t."aIToolId" = rc."aiToolId"
       WHERE rc."aiToolId" = $1 AND t."organizationId" = $2
         AND rc."isCurrent" = true
       ORDER BY rc."version" DESC LIMIT 1`,
      [toolId, organizationId],
    );

    const reqResult = await db.query(
      `SELECT tr.*, r."code", r."name", r."description", r."articleReference",
              r."riskLevel" AS "requirementLevel", r."category", r."guidance",
              r."estimatedEffortHours", r."translations"
       FROM "ToolRequirement" tr
       JOIN "AITool" t ON t."aIToolId" = tr."aiToolId"
       JOIN "Requirement" r ON r."requirementId" = tr."requirementId"
       WHERE tr."aiToolId" = $1 AND t."organizationId" = $2
       ORDER BY r."sortOrder" ASC`,
      [toolId, organizationId],
    );

    return {
      tool,
      classification: classResult.rows[0] || null,
      requirements: reqResult.rows,
    };
  },
})
