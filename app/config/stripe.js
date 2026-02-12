'use strict';

module.exports = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  prices: {
    starter: {
      monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
      yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
    },
    growth: {
      monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY || '',
      yearly: process.env.STRIPE_PRICE_GROWTH_YEARLY || '',
    },
    scale: {
      monthly: process.env.STRIPE_PRICE_SCALE_MONTHLY || '',
      yearly: process.env.STRIPE_PRICE_SCALE_YEARLY || '',
    },
  },
};
