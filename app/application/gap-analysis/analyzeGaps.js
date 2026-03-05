({
  analyze: async ({ toolId, organizationId }) => {
    // 1. Check plan has gapAnalysis feature (Growth+)
    const sub = await db.query(
      `SELECT s.*, p."features"
       FROM "Subscription" s
       JOIN "Plan" p ON p."planId" = s."planId"
       WHERE s."organizationId" = $1
       AND s."status" IN ('active', 'trialing')
       LIMIT 1`,
      [organizationId],
    );

    if (sub.rows.length === 0) {
      throw new errors.NotFoundError('Subscription', organizationId);
    }

    const features = sub.rows[0].features;
    if (!features || (!features.gapAnalysis && !features.all)) {
      throw new errors.PlanLimitError('gapAnalysis', 0, 0);
    }

    // 2. Verify tool exists and belongs to organization (tenant-safe)
    const tq = lib.tenant.createTenantQuery(organizationId);
    const tool = await tq.findOne('AITool', toolId);
    if (!tool) throw new errors.NotFoundError('AITool', toolId);

    // 3. Get ToolRequirements with Requirement join for codes + effort
    const trResult = await db.query(
      `SELECT tr."status", tr."progress",
              r."code", r."estimatedEffortHours", r."name" AS "requirementName",
              r."category" AS "requirementCategory"
       FROM "ToolRequirement" tr
       JOIN "Requirement" r ON r."requirementId" = tr."requirementId"
       WHERE tr."aiToolId" = $1`,
      [toolId],
    );

    const toolRequirements = trResult.rows;

    // 4. Evaluate each of 12 AESIA categories
    const aesiaCategories = domain['gap-analysis'].AESIACategories.getAll();

    const evaluatedCategories = aesiaCategories.map(
      (cat) => domain['gap-analysis'].AESIACategories.evaluate(cat, toolRequirements),
    );

    // 5. Calculate overall score (weighted average of completeness)
    const totalCompleteness = evaluatedCategories.reduce(
      (sum, c) => sum + c.completeness, 0,
    );
    const overallScore = evaluatedCategories.length > 0
      ? Math.round(totalCompleteness / evaluatedCategories.length)
      : 0;

    // 6. Build action plan sorted by priority (urgency x impact)
    const actionPlan = domain['gap-analysis'].AESIACategories.buildActionPlan(
      evaluatedCategories,
    );

    return {
      toolName: tool.name,
      toolId: tool.aIToolId || tool.id,
      riskLevel: tool.riskLevel || 'unknown',
      overallScore,
      categories: evaluatedCategories,
      actionPlan,
    };
  },
})
