({
  access: 'public',
  httpMethod: 'GET',
  path: '/api/auth/callback',
  method: async ({ query, headers }) => {
    const code = query.code;
    if (!code) {
      return {
        _statusCode: 302,
        _redirect: '/auth/login?error=missing_code',
      };
    }

    // Read state from query or from oauth-state cookie (WorkOS may drop query state)
    const cookieHeader = headers.cookie || '';
    const stateMatch = cookieHeader.match(/(?:^|;\s*)oauth-state=([^;]+)/);
    const stateParam = query.state || (stateMatch ? stateMatch[1] : '');

    let result;
    try {
      result = await workos.authenticateWithCode(code);
    } catch (err) {
      const rawData = err?.rawData || {};
      const errCode = rawData.code || err?.code || '';
      const msg = err?.message || rawData.message || 'Unknown';
      console.error('WorkOS authenticateWithCode failed:', msg, errCode, JSON.stringify(rawData));

      // Handle email verification required — redirect to verify-code page
      if (errCode === 'email_verification_required') {
        const token = encodeURIComponent(rawData.pending_authentication_token || '');
        const email = encodeURIComponent(rawData.email || '');
        let qs = `email=${email}&token=${token}&type=email`;
        if (stateParam) qs += `&state=${encodeURIComponent(stateParam)}`;
        return {
          _statusCode: 302,
          _redirect: `/auth/verify-code?${qs}`,
        };
      }

      return {
        _statusCode: 302,
        _redirect: `/auth/login?error=auth_failed&detail=${encodeURIComponent(msg)}`,
      };
    }
    const { user, sealedSession } = result;

    if (!user || !sealedSession) {
      return {
        _statusCode: 302,
        _redirect: '/auth/login?error=auth_failed',
      };
    }

    let syncResult;
    try {
      syncResult = await application.iam.syncUserFromWorkOS.syncUser(user);
    } catch (err) {
      console.error('syncUser failed after OAuth:', err?.message || err);
      return {
        _statusCode: 302,
        _redirect: `/auth/login?error=sync_failed&detail=${encodeURIComponent(err?.message || 'Unknown')}`,
      };
    }

    // Decode state for redirect target
    let redirectTo = '/dashboard';
    if (stateParam) {
      try {
        const state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
        if (state.returnTo) redirectTo = state.returnTo;
        if (state.plan && state.plan !== 'free') {
          redirectTo = `/auth/register?plan=${state.plan}&period=${state.period || 'monthly'}&step=2`;
        }
      } catch {
        // Invalid state — use default redirect
      }
    }

    return {
      _statusCode: 302,
      _redirect: redirectTo,
      _cookie: {
        name: 'wos-session',
        value: sealedSession,
        options: {
          path: '/',
          httpOnly: true,
          secure: (config.server?.frontendUrl || '').startsWith('https'),
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 400,
        },
      },
      userId: syncResult.user.id,
      organizationId: syncResult.user.organizationId,
      created: syncResult.created,
    };
  },
})
