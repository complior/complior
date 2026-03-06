({
  // Validate sync payload with Zod schema, throw ValidationError on failure
  validateSync: (body, schema, errorMessage) => {
    try {
      return schema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(errorMessage, err.flatten().fieldErrors);
      }
      throw err;
    }
  },

  // Find AITool ID by slug or name (org-scoped, case-insensitive)
  findToolBySlug: async (organizationId, slug) => {
    const slugAsName = slug.replace(/-/g, ' ');
    const result = await db.query(
      `SELECT "aIToolId" FROM "AITool"
       WHERE "organizationId" = $1
         AND (LOWER("name") = LOWER($2) OR "name" = $2 OR LOWER("name") = LOWER($3))
       LIMIT 1`,
      [organizationId, slug, slugAsName],
    );
    return result.rows.length > 0 ? result.rows[0].aIToolId : null;
  },

  // Record sync event in SyncHistory
  recordSyncHistory: async ({ organizationId, userId, syncType, status, toolSlug, conflicts, metadata }) => {
    const hasConflicts = conflicts && conflicts.length > 0;
    if (hasConflicts) {
      await db.query(
        `INSERT INTO "SyncHistory"
         ("organizationId", "userId", "source", "syncType", "status", "toolSlug", "conflicts", "metadata")
         VALUES ($1, $2, 'cli', $3, $4, $5, $6, $7)`,
        [
          organizationId, userId, syncType, status, toolSlug,
          JSON.stringify(conflicts),
          metadata ? JSON.stringify(metadata) : null,
        ],
      );
    } else {
      await db.query(
        `INSERT INTO "SyncHistory"
         ("organizationId", "userId", "source", "syncType", "status", "toolSlug", "metadata")
         VALUES ($1, $2, 'cli', $3, $4, $5, $6)`,
        [
          organizationId, userId, syncType, status, toolSlug,
          metadata ? JSON.stringify(metadata) : null,
        ],
      );
    }
  },

  // Safely parse JSON field (handles string, object, null)
  parseJsonField: (value, fallback) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  },
})
