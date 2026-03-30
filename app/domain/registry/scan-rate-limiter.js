/**
 * Scan Rate Limiter — Controls free public scan usage.
 *
 * Rules:
 *  - Anonymous (by IP): 3 scans/day, 1 scan/month per endpoint URL
 *  - Authenticated: 10 scans/day, 1 scan/month per endpoint URL
 *  - After repeated limit hits: CAPTCHA flagging
 *
 * VM sandbox compatible — IIFE returns factory function.
 */
(() => {
  /**
   * Normalize URL for dedup — strip protocol, trailing slash, query params.
   * "https://api.openai.com/v1/chat" -> "api.openai.com/v1/chat"
   */
  const normalizeEndpoint = (url) => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return (parsed.hostname + parsed.pathname).replace(/\/+$/, '').toLowerCase();
    } catch {
      return url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    }
  };

  return ({ db, config }) => {
    const scanConfig = (config && config.enrichment && config.enrichment.publicScan) || {};
    const maxAnonPerDay = scanConfig.maxScansPerDayAnon || 3;
    const maxAuthPerDay = scanConfig.maxScansPerDayAuth || 10;
    const endpointCooldownDays = scanConfig.endpointCooldownDays || 30;
    const captchaThreshold = scanConfig.captchaThreshold || 5;

    return {
      /**
       * Check if a scan is allowed. Returns { allowed, reason, upsellMessage }.
       *
       * @param {string} ip - Client IP
       * @param {string} endpointUrl - URL being scanned
       * @param {string|null} userId - Authenticated user ID (null for anon)
       */
      async check(ip, endpointUrl, userId) {
        const normalized = normalizeEndpoint(endpointUrl);
        if (!normalized) {
          return { allowed: false, reason: 'invalid_url' };
        }

        const isAuth = Boolean(userId);
        const maxPerDay = isAuth ? maxAuthPerDay : maxAnonPerDay;
        const identifier = isAuth ? userId : ip;
        const identifierType = isAuth ? 'user' : 'ip';

        // 1. Check endpoint cooldown (same endpoint = 1/month)
        const endpointCheck = await db.query(
          `SELECT COUNT(*) AS cnt FROM "PublicScanLog"
           WHERE "normalizedEndpoint" = $1
             AND "scannedAt" > NOW() - ($2 || ' days')::interval`,
          [normalized, String(endpointCooldownDays)],
        );
        if (parseInt(endpointCheck.rows[0].cnt, 10) > 0) {
          return {
            allowed: false,
            reason: 'endpoint_cooldown',
            message: `This endpoint was already scanned within the last ${endpointCooldownDays} days.`,
          };
        }

        // 2. Check daily limit (by IP or user)
        const dailyCheck = await db.query(
          `SELECT COUNT(*) AS cnt FROM "PublicScanLog"
           WHERE "${identifierType === 'user' ? 'userId' : 'ip'}" = $1
             AND "scannedAt" > NOW() - '1 day'::interval`,
          [identifier],
        );
        const dailyCount = parseInt(dailyCheck.rows[0].cnt, 10);

        if (dailyCount >= maxPerDay) {
          // eslint-disable-next-line max-len
          const upsellMessage = `You've reached the free scan limit (${maxPerDay}/day).\n\nRun unlimited scans locally:\n  npx complior eval --endpoint ${endpointUrl}\n\nOr upgrade to Starter (\u20ac49/mo) for unlimited cloud scans.`;
          return {
            allowed: false,
            reason: 'daily_limit',
            message: upsellMessage,
          };
        }

        // 3. Check CAPTCHA flag (repeated limit hits)
        const recentDenials = await db.query(
          `SELECT COUNT(*) AS cnt FROM "PublicScanLog"
           WHERE "${identifierType === 'user' ? 'userId' : 'ip'}" = $1
             AND "denied" = true
             AND "scannedAt" > NOW() - '7 days'::interval`,
          [identifier],
        );
        const denialCount = parseInt(recentDenials.rows[0].cnt, 10);
        const requireCaptcha = denialCount >= captchaThreshold;

        return {
          allowed: true,
          requireCaptcha,
          dailyRemaining: maxPerDay - dailyCount - 1,
        };
      },

      /**
       * Log a scan attempt (successful or denied).
       */
      async log(ip, endpointUrl, userId, denied) {
        const normalized = normalizeEndpoint(endpointUrl);
        await db.query(
          `INSERT INTO "PublicScanLog" (ip, "normalizedEndpoint", "userId", denied, "scannedAt")
           VALUES ($1, $2, $3, $4, NOW())`,
          [ip, normalized, userId || null, denied || false],
        );
      },

      normalizeEndpoint,
    };
  };
})()
