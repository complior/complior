({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/audit-package/generate',
  method: async ({ session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');
    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');
    await lib.permissions.checkPermission(user, 'AuditPackage', 'create');

    const result = await application.audit.generateAuditPackage.generate({
      userId: user.id,
      organizationId: user.organizationId,
    });

    return { _statusCode: 201, ...result };
  },
})
