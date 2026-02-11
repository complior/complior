({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/tools/:id',
  method: async ({ params, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.syncUserFromOry.syncOnLogin(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'AITool', 'read');

    let parsed;
    try {
      parsed = schemas.ToolIdSchema.parse(params);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError('Invalid tool ID', err.flatten().fieldErrors);
      }
      throw err;
    }

    const tq = lib.tenant.createTenantQuery(user.organizationId);
    const tool = await tq.findOne('AITool', parsed.id);
    if (!tool) throw new errors.NotFoundError('AITool', parsed.id);

    // Get latest classification
    const classResult = await db.query(
      `SELECT * FROM "RiskClassification"
       WHERE "aiToolId" = $1 AND "isCurrent" = true
       ORDER BY "version" DESC LIMIT 1`,
      [parsed.id],
    );

    // Get requirements with details
    const reqResult = await db.query(
      `SELECT tr.*, r."code", r."name", r."description", r."articleReference",
              r."riskLevel" AS "requirementLevel", r."category", r."guidance",
              r."estimatedEffortHours"
       FROM "ToolRequirement" tr
       JOIN "Requirement" r ON r."requirementId" = tr."requirementId"
       WHERE tr."aiToolId" = $1
       ORDER BY r."sortOrder" ASC`,
      [parsed.id],
    );

    return {
      tool,
      classification: classResult.rows[0] || null,
      requirements: reqResult.rows,
    };
  },
})
