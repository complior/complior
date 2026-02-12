'use strict';

const Stripe = require('stripe');
const config = require('../../../app/config/stripe.js');

const createStripeClient = (options = config) => {
  const stripe = new Stripe(options.secretKey);

  return {
    async createCheckoutSession(params) {
      return stripe.checkout.sessions.create(params);
    },

    async retrieveSession(sessionId) {
      return stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      });
    },

    constructEvent(payload, signature, secret) {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    },
  };
};

module.exports = createStripeClient;
