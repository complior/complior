({
  getByTool: async ({ toolId, organizationId }) => {
    const tq = lib.tenant.createTenantQuery(organizationId);

    // 1. Verify tool exists and belongs to org
    const tool = await tq.findOne('AITool', toolId);
    if (!tool) throw new errors.NotFoundError('AITool', toolId);

    // 2. Fetch ToolRequirements with joined Requirement data
    const result = await db.query(
      `SELECT tr.*, r."code", r."name", r."description",
              r."articleReference", r."riskLevel" AS "reqRiskLevel",
              r."category", r."estimatedEffortHours", r."guidance",
              r."translations"
       FROM "ToolRequirement" tr
       JOIN "Requirement" r ON r."requirementId" = tr."requirementId"
       WHERE tr."aiToolId" = $1
       ORDER BY r."sortOrder" ASC`,
      [toolId],
    );

    // 3. Group by article
    const groups = domain.classification.services.ComplianceScoreCalculator
      .groupByArticle(result.rows);

    // 4. Calculate compliance score
    const score = domain.classification.services.ComplianceScoreCalculator
      .calculateToolScore(result.rows);

    return {
      toolId,
      toolName: tool.name,
      riskLevel: tool.riskLevel,
      complianceScore: score,
      groups,
      totalRequirements: result.rows.length,
    };
  },
})
