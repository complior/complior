(() => {
  const validateToken = (token) => {
    try {
      return schemas.InviteTokenSchema.parse({ token });
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError('Invalid token', err.flatten().fieldErrors);
      }
      throw err;
    }
  };

  const transferUserToOrg = async (client, userId, invitation) => {
    await client.query(
      'UPDATE "User" SET "organizationId" = $1 WHERE "id" = $2',
      [invitation.organizationId, userId],
    );

    await client.query(
      'DELETE FROM "UserRole" WHERE "userId" = $1',
      [userId],
    );

    const roleResult = await client.query(
      'SELECT "roleId" FROM "Role" WHERE "name" = $1 AND "organizationId" IS NULL',
      [invitation.role],
    );
    if (roleResult.rows.length > 0) {
      await client.query(
        'INSERT INTO "UserRole" ("userId", "roleId") VALUES ($1, $2)',
        [userId, roleResult.rows[0].roleId],
      );
    }

    await client.query(
      `UPDATE "Invitation"
       SET "status" = 'accepted', "acceptedAt" = NOW(), "acceptedById" = $1
       WHERE "invitationId" = $2`,
      [userId, invitation.invitationId],
    );
  };

  return {
    verify: async (token) => {
      const parsed = validateToken(token);

      const result = await db.query(
        `SELECT i."invitationId", i."email", i."role", i."status", i."expiresAt",
                i."organizationId", o."name" AS "organizationName"
         FROM "Invitation" i
         JOIN "Organization" o ON o."id" = i."organizationId"
         WHERE i."token" = $1`,
        [parsed.token],
      );

      if (result.rows.length === 0) {
        return { valid: false, reason: 'not_found' };
      }

      const invitation = result.rows[0];

      if (invitation.status === 'accepted') {
        return { valid: false, reason: 'already_accepted' };
      }
      if (invitation.status === 'revoked') {
        return { valid: false, reason: 'revoked' };
      }
      if (new Date(invitation.expiresAt) < new Date()) {
        return { valid: false, reason: 'expired' };
      }

      return {
        valid: true,
        organizationName: invitation.organizationName,
        role: invitation.role,
        email: invitation.email,
      };
    },

    accept: async ({ token, userId, email }) => {
      const parsed = validateToken(token);

      const invResult = await db.query(
        `SELECT "invitationId", "email", "role", "status", "expiresAt", "organizationId"
         FROM "Invitation"
         WHERE "token" = $1`,
        [parsed.token],
      );

      if (invResult.rows.length === 0) {
        throw new errors.NotFoundError('Invitation');
      }

      const invitation = invResult.rows[0];

      if (invitation.status !== 'pending') {
        throw new errors.ConflictError('Invitation is no longer pending');
      }
      if (new Date(invitation.expiresAt) < new Date()) {
        throw new errors.ConflictError('Invitation has expired');
      }
      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        throw new errors.ForbiddenError('Email does not match invitation');
      }

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await transferUserToOrg(client, userId, invitation);
        await client.query('COMMIT');

        await lib.audit.createAuditEntry({
          userId,
          organizationId: invitation.organizationId,
          action: 'update',
          resource: 'User',
          resourceId: userId,
          oldData: { source: 'pre_invitation' },
          newData: { source: 'invitation', role: invitation.role, organizationId: invitation.organizationId },
        });

        return {
          organizationId: invitation.organizationId,
          role: invitation.role,
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  };
})()
