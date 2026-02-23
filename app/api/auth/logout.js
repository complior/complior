({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/auth/logout',
  method: async ({ session }) => {
    if (!session) {
      throw new errors.AuthError('Not authenticated');
    }

    return {
      _cookie: {
        name: 'wos-session',
        value: '',
        options: {
          path: '/',
          httpOnly: true,
          secure: (config.server?.frontendUrl || '').startsWith('https'),
          sameSite: 'lax',
          maxAge: 0,
        },
      },
      success: true,
    };
  },
})
