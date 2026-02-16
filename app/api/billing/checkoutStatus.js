({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/billing/checkout-status',
  method: async ({ query, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    let parsed;
    try {
      parsed = schemas.CheckoutStatusSchema.parse(query);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid query', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const stripeSession = await stripe.retrieveSession(parsed.sessionId);
    if (!stripeSession) {
      throw new errors.NotFoundError('CheckoutSession', parsed.sessionId);
    }

    const metaOrgId = stripeSession.metadata?.organizationId;
    if (metaOrgId && String(metaOrgId) !== String(user.organizationId)) {
      throw new errors.ForbiddenError('Session belongs to another organization');
    }

    // Sync subscription to DB when payment is confirmed
    if (stripeSession.payment_status === 'paid' && stripeSession.metadata?.planName) {
      const planName = stripeSession.metadata.planName;
      const planResult = await db.query(
        'SELECT "planId" FROM "Plan" WHERE "name" = $1', [planName],
      );
      const planRow = planResult.rows?.[0];
      if (planRow) {
        const customerId = typeof stripeSession.customer === 'object'
          ? stripeSession.customer.id : stripeSession.customer;
        const subscriptionId = typeof stripeSession.subscription === 'object'
          ? stripeSession.subscription.id : stripeSession.subscription;
        const sub = typeof stripeSession.subscription === 'object'
          ? stripeSession.subscription : null;
        const priceId = sub?.items?.data?.[0]?.price?.id || null;
        const trialEnd = sub?.trial_end
          ? new Date(sub.trial_end * 1000).toISOString() : null;
        const periodStart = sub?.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString() : null;
        const periodEnd = sub?.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString() : null;
        const status = trialEnd && new Date(trialEnd) > new Date()
          ? 'trialing' : 'active';

        await db.query(`
          UPDATE "Subscription"
          SET "planId" = $1,
              "stripeCustomerId" = $2,
              "stripeSubscriptionId" = $3,
              "stripePriceId" = $4,
              "status" = $5,
              "trialEndsAt" = $6,
              "currentPeriodStart" = COALESCE($7, "currentPeriodStart"),
              "currentPeriodEnd" = COALESCE($8, "currentPeriodEnd")
          WHERE "organizationId" = $9
            AND "stripeSubscriptionId" IS NULL
        `, [
          planRow.planId, customerId, subscriptionId, priceId,
          status, trialEnd, periodStart, periodEnd,
          user.organizationId,
        ]);
      }
    }

    return {
      _statusCode: 200,
      status: stripeSession.payment_status,
      planName: stripeSession.metadata?.planName || null,
    };
  },
})
