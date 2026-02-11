({
  access: 'authenticated',
  httpMethod: 'PATCH',
  path: '/api/tools/:id',
  method: async ({ params, body, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.syncUserFromOry.syncOnLogin(session);
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

    if (!body || !body.step) {
      throw new errors.ValidationError('Missing step parameter', {
        step: ['Wizard step is required (1-4)'],
      });
    }

    const tool = await application.inventory.updateToolStep.update({
      toolId: parsed.id,
      step: Number(body.step),
      body,
      userId: user.id,
      organizationId: user.organizationId,
    });

    return tool;
  },
})
