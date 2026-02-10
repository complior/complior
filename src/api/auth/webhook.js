'use strict';

const { AuthError, ValidationError } = require('../../lib/errors.js');

const createWebhookHandler = (db, oryClient, userSync) => {
  const handler = async (request, reply) => {
    const secret = request.headers['x-webhook-secret'];
    if (!oryClient.verifyWebhookSecret(secret)) {
      throw new AuthError('Invalid webhook secret');
    }

    const body = request.body || {};
    const identityId = body.identity_id;
    const { email, name, locale, event } = body;

    if (event !== 'registration') {
      return reply.status(200).send({ status: 'ignored', event });
    }

    if (!identityId || !email) {
      throw new ValidationError('Missing required fields', {
        identityId: !identityId ? 'required' : undefined,
        email: !email ? 'required' : undefined,
      });
    }

    const result = await userSync.syncFromWebhook({
      // eslint-disable-next-line camelcase
      identity_id: identityId,
      email,
      name,
      locale,
    });

    return reply.status(result.created ? 201 : 200).send({
      status: result.created ? 'created' : 'exists',
      userId: result.user.id,
      organizationId: result.user.organizationId,
    });
  };

  return {
    method: 'POST',
    path: '/api/auth/webhook',
    handler,
    public: true,
  };
};

module.exports = createWebhookHandler;
