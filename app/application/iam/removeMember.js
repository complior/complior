({
  remove: async ({ targetUserId, actingUser, organizationId }) => {
    // 1. Cannot remove self
    if (targetUserId === actingUser.id) {
      throw new errors.ForbiddenError('Cannot remove yourself');
    }

    // 2. Find the target user within the same org
    const targetResult = await db.query(
      `SELECT u."id", u."email", u."fullName", u."active",
              r."name" AS role
       FROM "User" u
       LEFT JOIN "UserRole" ur ON ur."userId" = u."id"
       LEFT JOIN "Role" r ON r."roleId" = ur."roleId"
       WHERE u."id" = $1 AND u."organizationId" = $2`,
      [targetUserId, organizationId],
    );
    if (targetResult.rows.length === 0) {
      throw new errors.NotFoundError('User', targetUserId);
    }
    const targetUser = targetResult.rows[0];

    // 3. Cannot remove owner
    if (targetUser.role === 'owner') {
      throw new errors.ForbiddenError('Cannot remove the owner');
    }

    // 4. Soft delete: set active = false
    await db.query(
      'UPDATE "User" SET "active" = false WHERE "id" = $1 AND "organizationId" = $2',
      [targetUserId, organizationId],
    );

    // 5. Audit log
    await lib.audit.createAuditEntry({
      userId: actingUser.id,
      organizationId,
      action: 'delete',
      resource: 'User',
      resourceId: targetUserId,
      oldData: { email: targetUser.email, role: targetUser.role, active: true },
      newData: { active: false },
    });

    return { success: true };
  },
})
