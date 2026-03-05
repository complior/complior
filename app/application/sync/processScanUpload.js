({
  process: async ({ scanData, organizationId, userId }) => {
    const results = [];

    for (const detected of (scanData.toolsDetected || [])) {
      // Find or create tool
      const existing = await db.query(
        `SELECT "aIToolId" FROM "AITool" WHERE "organizationId" = $1 AND LOWER("name") = LOWER($2) LIMIT 1`,
        [organizationId, detected.name],
      );

      let toolId;
      if (existing.rows.length > 0) {
        toolId = existing.rows[0].aIToolId;
      } else {
        const inserted = await db.query(
          `INSERT INTO "AITool" ("organizationId", "createdById", "name", "vendorName", "description", "purpose", "domain", "dataTypes", "affectedPersons", "autonomyLevel", "affectsNaturalPersons", "wizardStep", "wizardCompleted")
           VALUES ($1, $2, $3, $4, '', '', $5, '[]'::jsonb, '[]'::jsonb, 'advisory', false, 1, false) RETURNING "aIToolId"`,
          [organizationId, userId, detected.name, detected.vendor || '', detected.category || 'other'],
        );
        toolId = inserted.rows[0].aIToolId;
      }

      results.push({
        name: detected.name,
        toolId,
        action: existing.rows.length > 0 ? 'found' : 'created',
      });
    }

    // Log sync history
    await db.query(
      `INSERT INTO "SyncHistory" ("organizationId", "userId", "source", "syncType", "status", "toolSlug", "metadata")
       VALUES ($1, $2, 'cli', 'scan', 'success', $3, $4)`,
      [
        organizationId, userId,
        scanData.projectPath || 'unknown',
        JSON.stringify({
          projectPath: scanData.projectPath,
          score: scanData.score,
          findingsCount: (scanData.findings || []).length,
          toolsDetected: results.length,
        }),
      ],
    );

    return { processed: results.length, tools: results };
  },
})
