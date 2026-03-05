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
  if (!process.env.WORKOS_CLIENT_ID) {
    warnings.push('WORKOS_CLIENT_ID not set — WorkOS auth disabled');
  }
  if (!process.env.WORKOS_API_KEY) {
    warnings.push('WORKOS_API_KEY not set — WorkOS auth disabled');
  }
  if (!process.env.WORKOS_COOKIE_PASSWORD) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('WORKOS_COOKIE_PASSWORD is required in production');
    }
    warnings.push('WORKOS_COOKIE_PASSWORD not set — session sealing disabled');
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
  if (!process.env.MISTRAL_API_KEY && !process.env.OPENROUTER_API_KEY) {
    warnings.push('No LLM API key set (MISTRAL_API_KEY or OPENROUTER_API_KEY) — AI draft generation disabled');
  }

  return { missing, warnings };
};

module.exports = validate;
