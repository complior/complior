({
  access: 'public',
  httpMethod: 'GET',
  path: '/api/auth/login',
  method: async ({ query }) => {
    const provider = query.provider; // 'google' or 'github'
    const screenHint = query.screen_hint || 'sign-in';
    let state = null;

    // Encode state for callback redirect
    if (query.state) {
      state = query.state;
    } else if (query.plan || query.returnTo) {
      const stateObj = {};
      if (query.plan) stateObj.plan = query.plan;
      if (query.period) stateObj.period = query.period;
      if (query.returnTo) stateObj.returnTo = query.returnTo;
      state = Buffer.from(JSON.stringify(stateObj)).toString('base64url');
    }

    const url = workos.getAuthorizationUrl(screenHint, state, provider);

    const response = {
      _statusCode: 302,
      _redirect: url,
    };

    // Store state in cookie as backup — WorkOS may drop the state param
    if (state) {
      response._cookie = {
        name: 'oauth-state',
        value: state,
        options: {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 600, // 10 minutes
        },
      };
    }

    return response;
  },
})
