({
  access: 'public',
  httpMethod: 'GET',
  path: '/v1/regulations/meta',
  method: async ({ query, db }) => {
    const jurisdictionId = query.jurisdictionId || 'eu-ai-act';

    const result = await db.query(
      'SELECT * FROM "RegulationMeta" WHERE "jurisdictionId" = $1',
      [jurisdictionId]
    );

    if (result.length === 0) {
      throw new errors.NotFoundError('RegulationMeta', jurisdictionId);
    }

    const meta = result[0];

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
