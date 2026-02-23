(() => {
  return {
    revoke: async ({ organizationId, apiKeyId, userId }) => {
      const tq = lib.tenant.createTenantQuery(organizationId);
      const key = await tq.findOne('ApiKey', apiKeyId);
      if (!key) return null;

      await tq.update('ApiKey', apiKeyId, { active: false });

      await lib.audit.createAuditEntry({
        userId,
        organizationId,
        action: 'revoke',
        resource: 'ApiKey',
        resourceId: apiKeyId,
        oldData: { name: key.name, keyPrefix: key.keyPrefix },
      });

      return { apiKeyId, revoked: true };
    },
  };
})()
