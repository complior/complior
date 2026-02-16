(() => {
  return {
    createSession: async ({ organizationId, userId, email, planName, period, returnUrl }) => {
      const priceId = config.stripe.prices[planName]?.[period];
      if (!priceId) {
        throw new errors.ValidationError(
          `No Stripe price configured for ${planName}/${period}`,
        );
      }

      const frontendUrl = returnUrl || config.server.frontendUrl;
      /* eslint-disable camelcase */
      const session = await stripe.createCheckoutSession({
        mode: 'subscription',
        customer_email: email,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: 14,
          metadata: {
            organizationId: String(organizationId),
            userId: String(userId),
            planName,
          },
        },
        metadata: {
          organizationId: String(organizationId),
          userId: String(userId),
          planName,
        },
        success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/checkout/cancel`,
      });
      /* eslint-enable camelcase */

      await lib.audit.createAuditEntry({
        userId,
        organizationId,
        action: 'create',
        resource: 'CheckoutSession',
        resourceId: 0,
        newData: { planName, period, stripeSessionId: session.id },
      });

      return { checkoutUrl: session.url, sessionId: session.id };
    },
  };
})()
