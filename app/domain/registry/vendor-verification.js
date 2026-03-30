/**
 * Vendor Verification — Domain logic for verifying vendor ownership of tools.
 *
 * Three verification methods:
 *   1. DNS TXT record: complior-verify=<token>
 *   2. Meta tag: <meta name="complior-verify" content="<token>">
 *   3. Well-known file: /.well-known/complior-verify.json
 *
 * VM sandbox compatible — IIFE returns factory function.
 */
(() => {
  /**
   * Generate a cryptographically-looking token (16 hex chars).
   * Uses timestamp + random for uniqueness (not security-critical).
   */
  const generateToken = () => {
    const ts = Date.now().toString(16);
    const rand = Math.random().toString(16).slice(2, 10);
    return `cv_${ts}${rand}`;
  };

  /**
   * Extract domain from email address.
   */
  const extractDomain = (email) => {
    if (!email || !email.includes('@')) return null;
    return email.split('@')[1].toLowerCase();
  };

  /**
   * Check if email domain matches the tool's website domain.
   */
  const isVendorDomain = (email, websiteUrl) => {
    const emailDomain = extractDomain(email);
    if (!emailDomain) return false;

    try {
      const parsed = new URL(websiteUrl);
      const siteDomain = parsed.hostname.replace(/^www\./, '').toLowerCase();
      // Direct match or subdomain match
      return emailDomain === siteDomain
        || siteDomain.endsWith('.' + emailDomain)
        || emailDomain.endsWith('.' + siteDomain);
    } catch {
      return false;
    }
  };

  return ({ fetch, config }) => {
    const claimConfig = (config && config.registry && config.registry.vendorClaim) || {};
    const tokenTTLHours = claimConfig.verificationTokenTTLHours || 72;

    return {
      /**
       * Create a new verification challenge.
       *
       * @param {string} email - Vendor email (must be on vendor domain)
       * @param {string} websiteUrl - Tool's website URL
       * @returns {{ token, domain, methods, expiresAt }}
       */
      createChallenge(email) {
        const domain = extractDomain(email);
        if (!domain) {
          throw new Error('Invalid email: cannot extract domain');
        }

        const token = generateToken();
        const expiresAt = new Date(
          Date.now() + tokenTTLHours * 60 * 60 * 1000,
        ).toISOString();

        return {
          token,
          domain,
          expiresAt,
          methods: {
            dns_txt: {
              type: 'TXT',
              host: '_complior-verify',
              value: `complior-verify=${token}`,
              instructions: `Add a TXT record to ${domain}:\nHost: _complior-verify.${domain}\nValue: complior-verify=${token}`,
            },
            meta_tag: {
              tag: `<meta name="complior-verify" content="${token}">`,
              instructions: `Add to the <head> of your website:\n<meta name="complior-verify" content="${token}">`,
            },
            well_known: {
              path: '/.well-known/complior-verify.json',
              content: JSON.stringify({ token, domain, timestamp: new Date().toISOString() }),
              instructions: `Create file at https://${domain}/.well-known/complior-verify.json with content:\n${JSON.stringify({ token, domain })}`,
            },
          },
        };
      },

      /**
       * Verify a claim using the specified method.
       *
       * @param {string} method - 'dns_txt' | 'meta_tag' | 'well_known'
       * @param {string} domain - Domain to verify
       * @param {string} token - Expected token
       * @returns {Promise<{ verified: boolean, error?: string }>}
       */
      async verify(method, domain, token) {
        switch (method) {
        case 'meta_tag':
          return this.verifyMetaTag(domain, token);
        case 'well_known':
          return this.verifyWellKnown(domain, token);
        case 'dns_txt':
          // DNS verification requires server-side DNS lookup
          // For now, return instructions for manual admin check
          return { verified: false, error: 'dns_txt requires manual admin verification' };
        default:
          return { verified: false, error: `Unknown method: ${method}` };
        }
      },

      /**
       * Check meta tag on vendor's website.
       */
      async verifyMetaTag(domain, token) {
        try {
          const url = `https://${domain}`;
          const response = await fetch(url, {
            headers: { 'User-Agent': 'Complior-Verify/1.0' },
            signal: AbortSignal.timeout(10000),
          });

          if (!response.ok) {
            return { verified: false, error: `HTTP ${response.status}` };
          }

          const html = await response.text();
          const pattern = new RegExp(
            `<meta[^>]*name=["']complior-verify["'][^>]*content=["']${token}["']`,
            'i',
          );
          const altPattern = new RegExp(
            `<meta[^>]*content=["']${token}["'][^>]*name=["']complior-verify["']`,
            'i',
          );

          if (pattern.test(html) || altPattern.test(html)) {
            return { verified: true };
          }

          return { verified: false, error: 'Meta tag not found' };
        } catch (err) {
          return { verified: false, error: `Fetch failed: ${err.message}` };
        }
      },

      /**
       * Check .well-known file on vendor's website.
       */
      async verifyWellKnown(domain, token) {
        try {
          const url = `https://${domain}/.well-known/complior-verify.json`;
          const response = await fetch(url, {
            headers: { 'User-Agent': 'Complior-Verify/1.0' },
            signal: AbortSignal.timeout(10000),
          });

          if (!response.ok) {
            return { verified: false, error: `HTTP ${response.status}` };
          }

          const data = await response.json();
          if (data && data.token === token) {
            return { verified: true };
          }

          return { verified: false, error: 'Token mismatch' };
        } catch (err) {
          return { verified: false, error: `Fetch failed: ${err.message}` };
        }
      },

      // Exposed for external use
      extractDomain,
      isVendorDomain,
      generateToken,
    };
  };
})()
