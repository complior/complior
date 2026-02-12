(() => {
  const fetchPlanLimits = async (organizationId) => {
    const result = await db.query(
      `SELECT p."maxUsers", p."maxTools"
       FROM "Subscription" s
       JOIN "Plan" p ON p."planId" = s."planId"
       WHERE s."organizationId" = $1 AND s."status" IN ('active', 'trialing')
       LIMIT 1`,
      [organizationId],
    );
    if (result.rows.length === 0) {
      throw new errors.NotFoundError('Subscription', organizationId);
    }
    return result.rows[0];
  };

  return {
    checkUsers: async (organizationId) => {
      const { maxUsers } = await fetchPlanLimits(organizationId);
      const tq = lib.tenant.createTenantQuery(organizationId);
      const currentUsers = await tq.count('User', { active: true });
      const pendingInvites = await tq.count('Invitation', { status: 'pending' });
      return domain.iam.services.SubscriptionLimitChecker.checkUserLimit({
        currentUsers, pendingInvites, maxUsers,
      });
    },

    checkTools: async (organizationId) => {
      const { maxTools } = await fetchPlanLimits(organizationId);
      const tq = lib.tenant.createTenantQuery(organizationId);
      const currentTools = await tq.count('AITool');
      return domain.iam.services.SubscriptionLimitChecker.checkToolLimit({
        currentTools, maxTools,
      });
    },

    getLimits: async (organizationId) => {
      const { maxUsers, maxTools } = await fetchPlanLimits(organizationId);
      const tq = lib.tenant.createTenantQuery(organizationId);
      const currentUsers = await tq.count('User', { active: true });
      const pendingInvites = await tq.count('Invitation', { status: 'pending' });
      const currentTools = await tq.count('AITool');
      return {
        users: domain.iam.services.SubscriptionLimitChecker.checkUserLimit({
          currentUsers, pendingInvites, maxUsers,
        }),
        tools: domain.iam.services.SubscriptionLimitChecker.checkToolLimit({
          currentTools, maxTools,
        }),
      };
    },
  };
})()
