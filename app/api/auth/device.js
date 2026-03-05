({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/auth/device',
  method: async () => {
    // Rate limit: max 10 pending device codes at a time
    const pending = await db.query(
      `SELECT COUNT(*)::int AS "cnt" FROM "DeviceCode"
       WHERE "status" = 'pending' AND "expiresAt" > NOW()`,
    );
    if (pending.rows[0].cnt > 10) {
      throw new errors.ValidationError('Too many pending device code requests. Please try again later.');
    }
    return application.auth.deviceFlow.createDeviceCode();
  },
})
