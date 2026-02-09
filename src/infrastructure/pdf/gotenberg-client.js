'use strict';

const config = require('../../config/gotenberg.js');

const createGotenbergClient = (options = config) => {
  const { url, timeout } = options;

  return {
    async convertHtmlToPdf(html, { landscape = false, marginTop = '1cm', marginBottom = '1cm', marginLeft = '1cm', marginRight = '1cm' } = {}) {
      const formData = new FormData();

      const htmlBlob = new Blob([html], { type: 'text/html' });
      formData.append('files', htmlBlob, 'index.html');

      formData.append('landscape', String(landscape));
      formData.append('marginTop', marginTop);
      formData.append('marginBottom', marginBottom);
      formData.append('marginLeft', marginLeft);
      formData.append('marginRight', marginRight);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetch(`${url}/forms/chromium/convert/html`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          const err = new Error(`Gotenberg error: ${res.status} ${res.statusText}`);
          err.status = res.status;
          err.body = text;
          throw err;
        }

        return Buffer.from(await res.arrayBuffer());
      } finally {
        clearTimeout(timer);
      }
    },

    async convertUrlToPdf(targetUrl, options = {}) {
      const formData = new FormData();
      formData.append('url', targetUrl);

      const res = await fetch(`${url}/forms/chromium/convert/url`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = new Error(`Gotenberg error: ${res.status}`);
        err.status = res.status;
        throw err;
      }

      return Buffer.from(await res.arrayBuffer());
    },
  };
};

module.exports = createGotenbergClient;
