({
  createDeviceCode: async () => {
    const deviceCode = crypto.randomBytes(32).toString('hex');
    const userCode = crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()
      .slice(0, 6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await db.query(
      `INSERT INTO "DeviceCode" ("deviceCode", "userCode", "status", "scope", "expiresAt")
       VALUES ($1, $2, 'pending', 'sync:read sync:write', $3)`,
      [deviceCode, userCode, expiresAt],
    );

    return {
      deviceCode,
      userCode,
      verificationUri: `${config.server.frontendUrl}/auth/device`,
      expiresIn: 900,
      interval: 5,
    };
  },

  pollToken: async ({ deviceCode }) => {
    const result = await db.query(
      `SELECT * FROM "DeviceCode" WHERE "deviceCode" = $1`,
      [deviceCode],
    );
    if (result.rows.length === 0) {
      throw new errors.NotFoundError('DeviceCode', deviceCode);
    }

    const dc = result.rows[0];

    if (new Date(dc.expiresAt) < new Date()) {
      await db.query(
        `UPDATE "DeviceCode" SET "status" = 'expired' WHERE "deviceCodeId" = $1`,
        [dc.deviceCodeId],
      );
      return { error: 'expired_token' };
    }

    if (dc.status === 'expired') return { error: 'expired_token' };
    if (dc.status === 'used') return { error: 'expired_token' };
    if (dc.status === 'pending') return { error: 'authorization_pending' };

    if (dc.status === 'authorized') {
      const secret = config.server.jwtSecret;
      if (!secret) throw new errors.AppError('JWT secret not configured', 500);

      const accessToken = lib.jwt.sign(
        {
          userId: dc.userId,
          organizationId: dc.organizationId,
          scope: dc.scope,
        },
        secret,
        3600,
      );
      const refreshToken = lib.jwt.sign(
        {
          userId: dc.userId,
          organizationId: dc.organizationId,
          type: 'refresh',
        },
        secret,
        30 * 24 * 3600,
      );

      await db.query(
        `UPDATE "DeviceCode" SET "status" = 'used' WHERE "deviceCodeId" = $1`,
        [dc.deviceCodeId],
      );

      const userRow = await db.query(
        `SELECT u."email", u."fullName", o."name" AS "orgName"
         FROM "User" u
         LEFT JOIN "Organization" o ON o."id" = u."organizationId"
         WHERE u."id" = $1`,
        [dc.userId],
      );
      const user = userRow.rows[0] || {};

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer',
        userEmail: user.email || null,
        orgName: user.orgName || null,
      };
    }

    return { error: 'authorization_pending' };
  },

  confirmDevice: async ({ userCode, userId, organizationId }) => {
    const result = await db.query(
      `SELECT * FROM "DeviceCode"
       WHERE "userCode" = $1 AND "status" = 'pending' AND "expiresAt" > NOW()`,
      [userCode.toUpperCase()],
    );
    if (result.rows.length === 0) {
      throw new errors.ValidationError('Invalid or expired device code');
    }

    const dc = result.rows[0];
    await db.query(
      `UPDATE "DeviceCode"
       SET "status" = 'authorized', "userId" = $1, "organizationId" = $2, "authorizedAt" = NOW()
       WHERE "deviceCodeId" = $3`,
      [userId, organizationId, dc.deviceCodeId],
    );

    return { confirmed: true };
  },
})
