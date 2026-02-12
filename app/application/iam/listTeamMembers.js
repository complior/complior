({
  list: async ({ organizationId }) => {
    // 1. Query members with their roles (owner first, then alphabetical)
    const membersResult = await db.query(
      `SELECT u."id", u."email", u."fullName", u."active", u."lastLoginAt",
              r."name" AS role
       FROM "User" u
       LEFT JOIN "UserRole" ur ON ur."userId" = u."id"
       LEFT JOIN "Role" r ON r."roleId" = ur."roleId"
       WHERE u."organizationId" = $1
       ORDER BY
         CASE r."name" WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'member' THEN 2 WHEN 'viewer' THEN 3 ELSE 4 END,
         u."fullName" ASC`,
      [organizationId],
    );

    const members = membersResult.rows.map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      role: row.role || 'member',
      active: row.active,
      lastLoginAt: row.lastLoginAt,
    }));

    // 2. Query pending invitations
    const invitationsResult = await db.query(
      `SELECT i."invitationId", i."email", i."role", i."status",
              u."fullName" AS "invitedBy", i."expiresAt"
       FROM "Invitation" i
       LEFT JOIN "User" u ON u."id" = i."invitedById"
       WHERE i."organizationId" = $1 AND i."status" = 'pending'
       ORDER BY i."expiresAt" DESC`,
      [organizationId],
    );

    const invitations = invitationsResult.rows.map((row) => ({
      invitationId: row.invitationId,
      email: row.email,
      role: row.role,
      status: row.status,
      invitedBy: row.invitedBy,
      expiresAt: row.expiresAt,
    }));

    // 3. Plan limits — get from subscription + plan
    const activeMembers = members.filter((m) => m.active).length;
    const pendingCount = invitations.length;

    let maxUsers = 1;
    const subResult = await db.query(
      `SELECT p."maxUsers"
       FROM "Subscription" s
       JOIN "Plan" p ON p."planId" = s."planId"
       WHERE s."organizationId" = $1 AND s."status" IN ('active', 'trialing')
       LIMIT 1`,
      [organizationId],
    );
    if (subResult.rows.length > 0) {
      maxUsers = subResult.rows[0].maxUsers;
    }

    return {
      members,
      invitations,
      limits: {
        current: activeMembers,
        pending: pendingCount,
        max: maxUsers,
      },
    };
  },
})
