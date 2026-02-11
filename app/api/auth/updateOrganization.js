({
  access: 'authenticated',
  httpMethod: 'PATCH',
  path: '/api/organizations/:id',
  method: async ({ body, params, session }) => {
    if (!session) throw new errors.AuthError();

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'Organization', 'update');

    const orgId = parseInt(params.id, 10);

    return application.iam.updateOrganization.update({
      body,
      orgId,
      userId: user.id,
      organizationId: user.organizationId,
    });
  },
})
