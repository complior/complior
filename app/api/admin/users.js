({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/admin/users',
  method: async ({ session, query }) => {
    const admin = await application.admin.requirePlatformAdmin.require(session);

    let parsed;
    try {
      parsed = schemas.AdminListSchema.parse(query || {});
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid query parameters', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const result = await application.admin.listAllUsers.list(parsed);

    await lib.audit.createAuditEntry({
      userId: admin.id,
      organizationId: admin.organizationId,
      action: 'read',
      resource: 'PlatformAdmin',
      resourceId: 0,
      newData: { endpoint: 'users', query: parsed },
    });

    return result;
  },
})
