({
  change: async ({ targetUserId, newRole, actingUser, organizationId }) => {
    // 1. Validate input
    let parsed;
    try {
      parsed = schemas.ChangeRoleSchema.parse({ role: newRole });
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError('Invalid role', err.flatten().fieldErrors);
      }
      throw err;
    }

    // 2. Cannot change own role
    if (targetUserId === actingUser.id) {
      throw new errors.ForbiddenError('Cannot change your own role');
    }

    // 3. Find the target user within the same org
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

    // 4. Cannot change owner's role
    if (targetUser.role === 'owner') {
      throw new errors.ForbiddenError('Cannot change the owner\'s role');
    }

    // 5. Admin cannot promote to admin (only owner can)
    const actingRole = actingUser.roles?.[0] || 'member';
    if (actingRole === 'admin' && parsed.role === 'admin') {
      throw new errors.ForbiddenError('Only the owner can assign admin role');
    }

    // 6. Get the new role ID
    const roleResult = await db.query(
      'SELECT "roleId" FROM "Role" WHERE "name" = $1',
      [parsed.role],
    );
    if (roleResult.rows.length === 0) {
      throw new errors.NotFoundError('Role', parsed.role);
    }
    const newRoleId = roleResult.rows[0].roleId;

    // 7. Update: delete old UserRole, insert new (transaction)
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'DELETE FROM "UserRole" WHERE "userId" = $1',
        [targetUserId],
      );
      await client.query(
        'INSERT INTO "UserRole" ("userId", "roleId") VALUES ($1, $2)',
        [targetUserId, newRoleId],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // 8. Audit log
    await lib.audit.createAuditEntry({
      userId: actingUser.id,
      organizationId,
      action: 'update',
      resource: 'User',
      resourceId: targetUserId,
      oldData: { role: targetUser.role },
      newData: { role: parsed.role },
    });

    return { success: true, userId: targetUserId, role: parsed.role };
  },
})
