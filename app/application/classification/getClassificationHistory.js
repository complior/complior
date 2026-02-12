({
  getHistory: async ({ toolId, organizationId }) => {
    const tq = lib.tenant.createTenantQuery(organizationId);

    // 1. Verify tool exists and belongs to org
    const tool = await tq.findOne('AITool', toolId);
    if (!tool) throw new errors.NotFoundError('AITool', toolId);

    // 2. Fetch all classifications for this tool
    const result = await db.query(
      `SELECT rc.*, u."email" AS "classifiedByEmail", u."fullName" AS "classifiedByName"
       FROM "RiskClassification" rc
       LEFT JOIN "User" u ON u."id" = rc."classifiedById"
       WHERE rc."aiToolId" = $1
       ORDER BY rc."version" DESC`,
      [toolId],
    );

    // 3. Separate current from history
    const current = result.rows.find((r) => r.isCurrent) || null;
    const history = result.rows.filter((r) => !r.isCurrent);

    return {
      toolId,
      toolName: tool.name,
      current,
      history,
      totalVersions: result.rows.length,
    };
  },
})
