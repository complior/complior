({
  update: async ({ toolId, lifecycle, organizationId, userId }) => {
    const VALID_TRANSITIONS = {
      active: ['suspended'],
      suspended: ['active', 'decommissioned'],
      decommissioned: [],
    };

    const result = await db.query(
      `SELECT "aIToolId", "lifecycle", "name" FROM "AITool"
       WHERE "aIToolId" = $1 AND "organizationId" = $2`,
      [toolId, organizationId],
    );

    if (result.rows.length === 0) {
      throw new errors.NotFoundError('AITool', toolId);
    }

    const tool = result.rows[0];
    const current = tool.lifecycle || 'active';
    const allowed = VALID_TRANSITIONS[current] || [];

    if (!allowed.includes(lifecycle)) {
      throw new errors.ValidationError(
        `Cannot transition from '${current}' to '${lifecycle}'. ` +
        `Allowed: ${allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'}`,
      );
    }

    await db.query(
      `UPDATE "AITool" SET "lifecycle" = $1 WHERE "aIToolId" = $2 AND "organizationId" = $3`,
      [lifecycle, toolId, organizationId],
    );

    return {
      toolId,
      name: tool.name,
      previousLifecycle: current,
      lifecycle,
    };
  },
})
