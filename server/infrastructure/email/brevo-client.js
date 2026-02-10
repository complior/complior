'use strict';

const config = require('../../../app/config/brevo.js');

const BREVO_API_URL = 'https://api.brevo.com/v3';

const createBrevoClient = (options = config) => {
  const { apiKey, senderEmail, senderName } = options;

  const request = async (path, body) => {
    const res = await fetch(`${BREVO_API_URL}${path}`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Brevo API error: ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }
    return res.json();
  };

  return {
    async sendTransactional({
      to, subject, htmlContent, textContent,
      params, tags,
    }) {
      const toArr = Array.isArray(to)
        ? to.map((email) => ({ email }))
        : [{ email: to }];
      return request('/smtp/email', {
        sender: { email: senderEmail, name: senderName },
        to: toArr,
        subject,
        htmlContent: htmlContent || undefined,
        textContent: textContent || undefined,
        params: params || undefined,
        tags: tags || undefined,
      });
    },

    async sendTemplate({ to, templateId, params }) {
      const toArr = Array.isArray(to)
        ? to.map((email) => ({ email }))
        : [{ email: to }];
      return request('/smtp/email', {
        to: toArr,
        templateId,
        params: params || undefined,
      });
    },
  };
};

module.exports = createBrevoClient;
