({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/sync/passport',
  method: async ({ body, headers }) => {
    const auth = lib.apiAuth.resolveApiAuth(headers);

    const parsed = lib.syncHelpers.validateSync(
      body, schemas.SyncPassportSchema, 'Invalid passport data',
    );

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
