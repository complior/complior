({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/billing/checkout',
  method: async ({ body, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'Subscription', 'manage');

    let parsed;
    try {
      parsed = schemas.CheckoutSchema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid checkout data', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const result = await application.billing.createCheckoutSession.createSession({
      organizationId: user.organizationId,
      userId: user.id,
      email: user.email,
      planName: parsed.planName,
      period: parsed.period,
      returnUrl: parsed.returnUrl,
    });

    return { _statusCode: 200, ...result };
  },
})
