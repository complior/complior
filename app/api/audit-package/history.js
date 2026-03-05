({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/audit-package/history',
  method: async ({ query, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');
    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');
    await lib.permissions.checkPermission(user, 'AuditPackage', 'read');

    let parsed;
    try {
      parsed = schemas.AuditPackageHistorySchema.parse(query || {});
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid query parameters',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const { page, pageSize } = parsed;
    const offset = (page - 1) * pageSize;
    const organizationId = user.organizationId;

    const countResult = await db.query(
      'SELECT COUNT(*)::int AS total FROM "AuditPackage" WHERE "organizationId" = $1',
      [organizationId],
    );
    const total = countResult.rows[0].total;

    const result = await db.query(
      `SELECT ap.*, u."email" AS "createdByEmail", u."fullName" AS "createdByName"
       FROM "AuditPackage" ap
       LEFT JOIN "User" u ON u."id" = ap."createdById"
       WHERE ap."organizationId" = $1
       ORDER BY ap."createdAt" DESC
       LIMIT $2 OFFSET $3`,
      [organizationId, pageSize, offset],
    );

    return {
      data: result.rows.map((row) => ({
        auditPackageId: row.auditPackageId,
        status: row.status,
        toolCount: row.toolCount,
        documentCount: row.documentCount,
        fileSize: row.fileSize,
        expiresAt: row.expiresAt,
        errorMessage: row.errorMessage,
        createdAt: row.createdAt,
        createdBy: {
          email: row.createdByEmail,
          fullName: row.createdByName,
        },
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },
})
