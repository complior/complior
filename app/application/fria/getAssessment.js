({
  get: async ({ assessmentId, organizationId }) => {
    const result = await db.query(
      `SELECT f.*, t."name" AS "toolName", t."riskLevel" AS "toolRiskLevel"
       FROM "FRIAAssessment" f
       JOIN "AITool" t ON t."aIToolId" = f."aiToolId"
       WHERE f."fRIAAssessmentId" = $1
       AND f."organizationId" = $2`,
      [assessmentId, organizationId],
    );

    if (result.rows.length === 0) {
      throw new errors.NotFoundError('FRIAAssessment', assessmentId);
    }

    const assessment = result.rows[0];

    const sections = await db.query(
      `SELECT * FROM "FRIASection"
       WHERE "friaId" = $1
       ORDER BY "sortOrder" ASC`,
      [assessmentId],
    );

    return {
      assessment: {
        fRIAAssessmentId: assessment.fRIAAssessmentId,
        aiToolId: assessment.aiToolId,
        createdById: assessment.createdById,
        status: assessment.status,
        completedAt: assessment.completedAt,
        approvedById: assessment.approvedById,
      },
      sections: sections.rows,
      tool: {
        name: assessment.toolName,
        riskLevel: assessment.toolRiskLevel,
      },
    };
  },
})
