({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/documents',
  method: async ({ query, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');
    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');
    await lib.permissions.checkPermission(user, 'ComplianceDocument', 'read');

    return application.documents.listByTool.list({
      query: query || {},
      organizationId: user.organizationId,
    });
  },
})
