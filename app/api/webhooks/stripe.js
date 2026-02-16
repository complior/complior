({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/webhooks/stripe',
  method: async ({ body, rawBody, headers }) => {
    const signature = headers['stripe-signature'];
    if (!signature) {
      throw new errors.AuthError('Missing Stripe signature');
    }

    const webhookSecret = config.stripe.webhookSecret;
    if (!webhookSecret) {
      throw new errors.AppError('Stripe webhook secret not configured', 500);
    }

    let event;
    try {
      const payload = rawBody || (typeof body === 'string' ? body : JSON.stringify(body));
      event = stripe.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new errors.AuthError('Invalid Stripe signature');
    }

    const result = await application.billing.handleStripeWebhook.handleEvent(event);

    return { _statusCode: 200, received: true, ...result };
  },
})
