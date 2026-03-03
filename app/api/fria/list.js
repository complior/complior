({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/fria',
  method: async ({ query, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');
    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');
    await lib.permissions.checkPermission(user, 'FRIAAssessment', 'read');

    return application.fria.listByOrganization.list({
      query,
      organizationId: user.organizationId,
    });
  },
})
