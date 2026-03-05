({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/sync/passport',
  method: async ({ body, headers }) => {
    const auth = lib.apiAuth.resolveApiAuth(headers);

    let parsed;
    try {
      parsed = schemas.SyncPassportSchema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid passport data', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const result = await application.sync.mergePassport.merge({
      passport: parsed,
      organizationId: auth.organizationId,
      userId: auth.userId,
    });

    // Map requirements when CLI import created a new classification
    if (result.mapRiskLevel && result.toolId) {
      await application.classification.mapRequirements.map({
        aiToolId: result.toolId,
        riskLevel: result.mapRiskLevel,
      });
    }

    return result;
  },
})
