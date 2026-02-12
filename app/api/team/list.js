({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/team/members',
  method: async ({ session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'User', 'read');

    return application.iam.listTeamMembers.list({
      organizationId: user.organizationId,
    });
  },
})
