'use strict';

const required = [
  'DATABASE_URL',
];

const validate = () => {
  const missing = [];
  for (const key of required) {
    if (!process.env[key]) missing.push(key);
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const warnings = [];
  if (!process.env.ORY_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ORY_WEBHOOK_SECRET is required in production');
    }
    warnings.push('ORY_WEBHOOK_SECRET not set — webhook verification disabled');
  }
  if (!process.env.BREVO_API_KEY) {
    warnings.push('BREVO_API_KEY not set — email sending disabled');
  }
  if (!process.env.S3_ENDPOINT) {
    warnings.push('S3_ENDPOINT not set — file storage disabled');
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_SECRET_KEY not set — Stripe billing disabled');
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    warnings.push('STRIPE_WEBHOOK_SECRET not set — Stripe webhook verification disabled');
  }

  return { missing, warnings };
};

module.exports = validate;
