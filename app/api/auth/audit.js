({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/auth/audit',
  method: async ({ query, session }) => {
    if (!session) throw new errors.AuthError();

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'AuditLog', 'read');

    let parsed;
    try {
      parsed = schemas.AuditQuerySchema.parse(query || {});
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid query parameters', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    return lib.audit.findEntries(user.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      action: parsed.action,
      resource: parsed.resource,
    });
  },
})
