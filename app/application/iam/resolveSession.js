({
  resolveUser: async (session) => {
    if (!session || !session.identity) {
      throw new errors.AuthError('No valid session');
    }
    const oryId = session.identity.id;
    const result = await db.query(
      `SELECT u."id", u."oryId", u."email", u."fullName", u."active",
              u."organizationId", u."locale", u."lastLoginAt",
              array_agg(r."name") FILTER (WHERE r."name" IS NOT NULL) AS roles
       FROM "User" u
       LEFT JOIN "UserRole" ur ON ur."userId" = u."id"
       LEFT JOIN "Role" r ON r."roleId" = ur."roleId"
       WHERE u."oryId" = $1
       GROUP BY u."id"`,
      [oryId],
    );
    if (result.rows.length === 0) return null;
    const user = result.rows[0];
    if (!user.active) throw new errors.AuthError('Account deactivated');
    return user;
  },
})
