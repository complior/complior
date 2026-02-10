'use strict';

const crypto = require('node:crypto');
const config = require('../../../app/config/ory.js');

const createOryClient = (options = config) => {
  const { sdkUrl, adminUrl, webhookSecret } = options;

  const request = async (baseUrl, path, opts = {}) => {
    const url = `${baseUrl}${path}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`Ory API error: ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return res.json();
  };

  return {
    async verifySession(sessionToken, cookie) {
      const headers = {};
      if (sessionToken) headers['X-Session-Token'] = sessionToken;
      if (cookie) headers.Cookie = cookie;
      return request(sdkUrl, '/sessions/whoami', { headers });
    },

    async getIdentity(identityId) {
      return request(adminUrl, `/admin/identities/${identityId}`);
    },

    async listIdentities({ page = 0, perPage = 100 } = {}) {
      const q = `page=${page}&per_page=${perPage}`;
      return request(
        adminUrl, `/admin/identities?${q}`
      );
    },

    async deleteIdentity(identityId) {
      const url = `${adminUrl}/admin/identities/${identityId}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const err = new Error(`Ory delete identity failed: ${res.status}`);
        err.status = res.status;
        throw err;
      }
    },

    async updateIdentity(identityId, traits) {
      return request(adminUrl, `/admin/identities/${identityId}`, {
        method: 'PUT',
        body: JSON.stringify({
          // eslint-disable-next-line camelcase
          schema_id: 'default',
          state: 'active',
          traits,
        }),
      });
    },

    verifyWebhookSecret(headerSecret) {
      if (!webhookSecret || !headerSecret) return false;
      const a = Buffer.from(String(headerSecret));
      const b = Buffer.from(String(webhookSecret));
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    },
  };
};

module.exports = createOryClient;
