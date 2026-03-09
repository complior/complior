({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/tools/stats',
  method: async ({ session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'AITool', 'read');

    return application.inventory.getToolStats.get({
      organizationId: user.organizationId,
    });
  },
})
