'use strict';

module.exports = {
  clientId: process.env.WORKOS_CLIENT_ID || '',
  apiKey: process.env.WORKOS_API_KEY || '',
  redirectUri: process.env.WORKOS_REDIRECT_URI || 'http://localhost:3001/api/auth/callback',
  cookiePassword: process.env.WORKOS_COOKIE_PASSWORD || '',
};
