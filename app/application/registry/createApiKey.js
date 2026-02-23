(() => {
  const RATE_LIMITS = {
    free: 100,
    starter: 1000,
    growth: 5000,
    scale: 10000,
    enterprise: 100000,
  };

  return {
    create: async ({ organizationId, userId, name, expiresInDays }) => {
      // Look up org's current plan
      const subResult = await db.query(
        `SELECT "planName" FROM "Subscription"
         WHERE "organizationId" = $1 AND "status" = 'active'
         ORDER BY "createdAt" DESC LIMIT 1`,
        [organizationId],
      );
      const plan = subResult.rows[0]?.planName || 'free';
      const rateLimit = RATE_LIMITS[plan] || RATE_LIMITS.free;

      // Generate key: ck_live_ + 64 hex chars
      const rawBytes = crypto.randomBytes(32).toString('hex');
      const fullKey = `ck_live_${rawBytes}`;
      const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
      const keyPrefix = fullKey.slice(0, 12);

      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
        : null;

      const tq = lib.tenant.createTenantQuery(organizationId);
      const row = await tq.create('ApiKey', {
        keyHash,
        keyPrefix,
        name,
        plan,
        rateLimit,
        expiresAt,
        active: true,
      });

      await lib.audit.createAuditEntry({
        userId,
        organizationId,
        action: 'create',
        resource: 'ApiKey',
        resourceId: row.apiKeyId,
        newData: { name, plan, rateLimit, keyPrefix },
      });

      return {
        apiKeyId: row.apiKeyId,
        fullKey,
        keyPrefix,
        name,
        plan,
        rateLimit,
        expiresAt,
      };
    },
  };
})()
