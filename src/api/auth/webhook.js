'use strict';

const { z } = require('zod');
const { AuthError, ValidationError } = require('../../lib/errors.js');
const { WebhookSchema } = require('../../lib/schemas.js');

const createWebhookHandler = (db, oryClient, userSync) => {
  const handler = async (request, reply) => {
    const secret = request.headers['x-webhook-secret'];
    if (!oryClient.verifyWebhookSecret(secret)) {
      throw new AuthError('Invalid webhook secret');
    }

    const body = request.body || {};

    if (body.event !== 'registration') {
      return reply.status(200).send({ status: 'ignored', event: body.event });
    }

    let data;
    try {
      data = WebhookSchema.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError('Validation failed', err.flatten().fieldErrors);
      }
      throw err;
    }

    const result = await userSync.syncFromWebhook({
      // eslint-disable-next-line camelcase
      identity_id: data.identity_id,
      email: data.email,
      name: data.name,
      locale: data.locale,
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
