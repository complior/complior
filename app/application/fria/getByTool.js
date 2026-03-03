({
  get: async ({ toolId, organizationId }) => {
    const result = await db.query(
      `SELECT f.*
       FROM "FRIAAssessment" f
       JOIN "AITool" t ON t."aIToolId" = f."aiToolId"
       WHERE f."aiToolId" = $1
       AND f."organizationId" = $2
       ORDER BY f."fRIAAssessmentId" DESC
       LIMIT 1`,
      [toolId, organizationId],
    );

    if (result.rows.length === 0) return { assessment: null, sections: [] };

    const assessment = result.rows[0];

    const sections = await db.query(
      `SELECT * FROM "FRIASection"
       WHERE "friaId" = $1
       ORDER BY "sortOrder" ASC`,
      [assessment.fRIAAssessmentId],
    );

    return {
      assessment,
      sections: sections.rows,
    };
  },
})
