({
  get: async ({ jurisdictionId }) => {
    const result = await db.query(
      'SELECT * FROM "RegulationMeta" WHERE "jurisdictionId" = $1',
      [jurisdictionId],
    );

    const rows = result.rows || result;

    if (rows.length === 0) {
      throw new errors.NotFoundError('RegulationMeta', jurisdictionId);
    }

    const meta = rows[0];

    return {
      jurisdictionId: meta.jurisdictionId,
      officialName: meta.officialName,
      jurisdiction: meta.jurisdiction,
      status: meta.status,
      enactedDate: meta.enactedDate,
      entryIntoForceDate: meta.entryIntoForceDate,
      maxPenalty: meta.maxPenalty,
      riskLevels: meta.riskLevels,
      keyDefinitions: meta.keyDefinitions,
      roles: meta.roles,
      classificationQuestions: meta.classificationQuestions,
    };
  },
})
