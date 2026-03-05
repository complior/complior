({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/audit-package/:id/status',
  method: async ({ params, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');
    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');
    await lib.permissions.checkPermission(user, 'AuditPackage', 'read');

    let parsed;
    try {
      parsed = schemas.AuditPackageIdSchema.parse(params);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid audit package ID',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const tq = lib.tenant.createTenantQuery(user.organizationId);
    const pkg = await tq.findOne('AuditPackage', parsed.id);

    if (!pkg) {
      throw new errors.NotFoundError('AuditPackage', parsed.id);
    }

    return {
      auditPackageId: pkg.auditPackageId,
      status: pkg.status,
      toolCount: pkg.toolCount,
      documentCount: pkg.documentCount,
      fileSize: pkg.fileSize,
      errorMessage: pkg.errorMessage,
      expiresAt: pkg.expiresAt,
      createdAt: pkg.createdAt,
    };
  },
})
