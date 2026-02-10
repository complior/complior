({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/auth/webhook',
  method: async ({ body, headers }) => {
    const secret = headers['x-webhook-secret'];
    if (!ory.verifyWebhookSecret(secret)) {
      throw new errors.AuthError('Invalid webhook secret');
    }

    const payload = body || {};

    if (payload.event !== 'registration') {
      return { _statusCode: 200, status: 'ignored', event: payload.event };
    }

    let data;
    try {
      data = schemas.WebhookSchema.parse(payload);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Validation failed', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const result = await application.iam.syncUserFromOry.syncFromWebhook({
      identity_id: data.identity_id,
      email: data.email,
      name: data.name,
      locale: data.locale,
    });

    return {
      _statusCode: result.created ? 201 : 200,
      status: result.created ? 'created' : 'exists',
      userId: result.user.id,
      organizationId: result.user.organizationId,
    };
  },
})
