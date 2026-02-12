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

    return {
      _statusCode: 200,
      status: stripeSession.payment_status,
      planName: stripeSession.metadata?.planName || null,
    };
  },
})
