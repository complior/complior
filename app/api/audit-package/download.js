({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/audit-package/:id/download',
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

    if (pkg.status !== 'ready') {
      throw new errors.ValidationError(
        `Audit package is not ready for download (current status: ${pkg.status})`,
      );
    }

    if (!pkg.fileUrl) {
      throw new errors.ValidationError('Audit package file not available');
    }

    // Check expiry
    if (pkg.expiresAt && new Date(pkg.expiresAt) < new Date()) {
      throw new errors.ValidationError('Audit package has expired');
    }

    const signedUrl = await s3.getSignedUrl(pkg.fileUrl);
    const filename = `audit-package-${parsed.id}.zip`;

    return { fileUrl: signedUrl, filename };
  },
})
