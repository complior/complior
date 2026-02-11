({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/tools/:id/classify',
  method: async ({ params, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'AITool', 'update');

    let parsed;
    try {
      parsed = schemas.ToolIdSchema.parse(params);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError('Invalid tool ID', err.flatten().fieldErrors);
      }
      throw err;
    }

    const result = await application.classification.classifyTool.classify({
      toolId: parsed.id,
      userId: user.id,
      organizationId: user.organizationId,
    });

    return result;
  },
})
