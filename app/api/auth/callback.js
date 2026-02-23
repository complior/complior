({
  access: 'public',
  httpMethod: 'GET',
  path: '/api/auth/callback',
  method: async ({ query, headers }) => {
    const code = query.code;
    if (!code) {
      throw new errors.ValidationError('Missing authorization code');
    }

    let result;
    try {
      result = await workos.authenticateWithCode(code);
    } catch (err) {
      throw new errors.AuthError('Invalid authorization code');
    }
    const { user, sealedSession } = result;

    if (!user || !sealedSession) {
      throw new errors.AuthError('Authentication failed');
    }

    const syncResult = await application.iam.syncUserFromWorkOS.syncUser(user);

    // Decode state for redirect target
    let redirectTo = '/dashboard';
    const stateParam = query.state;
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
