'use strict';

module.exports = {
  apiKey: process.env.BREVO_API_KEY || '',
  smtpHost: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  smtpPort: parseInt(process.env.BREVO_SMTP_PORT, 10) || 587,
  senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@aiact-compliance.eu',
  senderName: process.env.BREVO_SENDER_NAME || 'AI Act Compliance Platform',
};
