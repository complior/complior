({
  map: async ({ aiToolId, riskLevel }) => {
    // Risk level hierarchy for requirement inclusion
    const LEVEL_REQUIREMENTS = {
      minimal: ['minimal'],
      limited: ['minimal', 'limited'],
      gpai: ['minimal', 'limited'],
      high: ['minimal', 'limited', 'high'],
      prohibited: ['prohibited'],
    };

    const applicableLevels = LEVEL_REQUIREMENTS[riskLevel];
    if (!applicableLevels || applicableLevels.length === 0) return [];

    // Fetch applicable requirements from global Requirement table
    const placeholders = applicableLevels.map((_, i) => `$${i + 1}`).join(', ');
    const reqResult = await db.query(
      `SELECT * FROM "Requirement" WHERE "riskLevel" IN (${placeholders}) ORDER BY "sortOrder" ASC`,
      applicableLevels,
    );

    // Get existing ToolRequirements to skip duplicates (idempotent)
    const existingResult = await db.query(
      'SELECT "requirementId" FROM "ToolRequirement" WHERE "aiToolId" = $1',
      [aiToolId],
    );
    const existingReqIds = new Set(
      existingResult.rows.map((r) => r.requirementId),
    );

    const created = [];
    for (const req of reqResult.rows) {
      if (existingReqIds.has(req.requirementId)) continue;

      const record = await db.query(
        `INSERT INTO "ToolRequirement" ("aiToolId", "requirementId", "status", "progress")
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [aiToolId, req.requirementId, 'pending', 0],
      );
      created.push(record.rows[0]);
    }

    return created;
  },
})
