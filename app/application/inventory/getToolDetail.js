({
  get: async ({ toolId, organizationId }) => {
    const tq = lib.tenant.createTenantQuery(organizationId);
    const tool = await tq.findOne('AITool', toolId);
    if (!tool) throw new errors.NotFoundError('AITool', toolId);

    const classResult = await db.query(
      `SELECT * FROM "RiskClassification"
       WHERE "aiToolId" = $1 AND "isCurrent" = true
       ORDER BY "version" DESC LIMIT 1`,
      [toolId],
    );

    const reqResult = await db.query(
      `SELECT tr.*, r."code", r."name", r."description", r."articleReference",
              r."riskLevel" AS "requirementLevel", r."category", r."guidance",
              r."estimatedEffortHours"
       FROM "ToolRequirement" tr
       JOIN "Requirement" r ON r."requirementId" = tr."requirementId"
       WHERE tr."aiToolId" = $1
       ORDER BY r."sortOrder" ASC`,
      [toolId],
    );

    return {
      tool,
      classification: classResult.rows[0] || null,
      requirements: reqResult.rows,
    };
  },
})
