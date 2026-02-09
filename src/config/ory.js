'use strict';

module.exports = {
  sdkUrl: process.env.ORY_SDK_URL || 'http://localhost:4433',
  adminUrl: process.env.ORY_ADMIN_URL || 'http://localhost:4434',
  webhookSecret: process.env.ORY_WEBHOOK_SECRET || '',
};
