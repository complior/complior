({
  access: 'authenticated',
  httpMethod: 'PATCH',
  path: '/api/tools/:id/lifecycle',
  method: async ({ params, body, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'AITool', 'update');

    const { id } = schemas.ToolIdSchema.parse(params);
    const { lifecycle } = schemas.ToolLifecycleSchema.parse(body);

    return application.inventory.updateToolLifecycle.update({
      toolId: id,
      lifecycle,
      organizationId: user.organizationId,
      userId: user.id,
    });
  },
})
