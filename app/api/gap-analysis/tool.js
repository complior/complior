({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/gap-analysis/:toolId',
  method: async ({ params, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');
    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');
    await lib.permissions.checkPermission(user, 'GapAnalysis', 'read');

    let parsed;
    try {
      parsed = schemas.GapAnalysisToolIdSchema.parse(params);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid tool ID',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    return application['gap-analysis'].analyzeGaps.analyze({
      toolId: parsed.toolId,
      organizationId: user.organizationId,
    });
  },
})
