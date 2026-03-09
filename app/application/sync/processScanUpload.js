({
  process: async ({ scanData, organizationId, userId }) => {
    const { recordSyncHistory } = lib.syncHelpers;
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
          `INSERT INTO "AITool" ("organizationId", "createdById", "name", "vendorName", "description", "purpose", "domain", "dataTypes", "affectedPersons", "affectsNaturalPersons", "wizardStep", "wizardCompleted", "source")
           VALUES ($1, $2, $3, $4, '', '', $5, '[]'::jsonb, '[]'::jsonb, false, 1, false, 'cli_scan') RETURNING "aIToolId"`,
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

    await recordSyncHistory({
      organizationId, userId, syncType: 'scan', status: 'success',
      toolSlug: scanData.projectPath || 'unknown',
      metadata: {
        projectPath: scanData.projectPath,
        score: scanData.score,
        findingsCount: (scanData.findings || []).length,
        toolsDetected: results.length,
      },
    });

    return { processed: results.length, tools: results };
  },
})
