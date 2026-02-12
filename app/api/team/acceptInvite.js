([
  {
    access: 'public',
    httpMethod: 'GET',
    path: '/api/team/invite/verify',
    method: async ({ query }) => {
      const token = (query || {}).token;
      if (!token) {
        throw new errors.ValidationError('Token is required', { token: 'required' });
      }
      return application.iam.acceptInvitation.verify(token);
    },
  },
  {
    access: 'authenticated',
    httpMethod: 'POST',
    path: '/api/team/invite/accept',
    method: async ({ body, session }) => {
      if (!session) throw new errors.AuthError('Not authenticated');

      const user = await application.iam.resolveSession.resolveUser(session);
      if (!user) throw new errors.AuthError('User not found');

      const token = (body || {}).token;
      if (!token) {
        throw new errors.ValidationError('Token is required', { token: 'required' });
      }

      const result = await application.iam.acceptInvitation.accept({
        token,
        userId: user.id,
        email: user.email,
      });

      return result;
    },
  },
])
