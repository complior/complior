([
  // PATCH /api/team/members/:userId — change role
  {
    access: 'authenticated',
    httpMethod: 'PATCH',
    path: '/api/team/members/:userId',
    method: async ({ params, body, session }) => {
      if (!session) throw new errors.AuthError('Not authenticated');

      const user = await application.iam.resolveSession.resolveUser(session);
      if (!user) throw new errors.AuthError('User not found');

      await lib.permissions.checkPermission(user, 'User', 'manage');

      const targetUserId = Number(params.userId);
      if (!targetUserId || !Number.isInteger(targetUserId) || targetUserId <= 0) {
        throw new errors.ValidationError('Invalid user ID', { userId: ['Must be a positive integer'] });
      }

      if (!body || !body.role) {
        throw new errors.ValidationError('Missing role', { role: ['Role is required'] });
      }

      return application.iam.changeRole.change({
        targetUserId,
        newRole: body.role,
        actingUser: user,
        organizationId: user.organizationId,
      });
    },
  },

  // DELETE /api/team/members/:userId — remove member
  {
    access: 'authenticated',
    httpMethod: 'DELETE',
    path: '/api/team/members/:userId',
    method: async ({ params, session }) => {
      if (!session) throw new errors.AuthError('Not authenticated');

      const user = await application.iam.resolveSession.resolveUser(session);
      if (!user) throw new errors.AuthError('User not found');

      await lib.permissions.checkPermission(user, 'User', 'manage');

      const targetUserId = Number(params.userId);
      if (!targetUserId || !Number.isInteger(targetUserId) || targetUserId <= 0) {
        throw new errors.ValidationError('Invalid user ID', { userId: ['Must be a positive integer'] });
      }

      return application.iam.removeMember.remove({
        targetUserId,
        actingUser: user,
        organizationId: user.organizationId,
      });
    },
  },

  // DELETE /api/team/invitations/:invitationId — revoke invitation
  {
    access: 'authenticated',
    httpMethod: 'DELETE',
    path: '/api/team/invitations/:invitationId',
    method: async ({ params, session }) => {
      if (!session) throw new errors.AuthError('Not authenticated');

      const user = await application.iam.resolveSession.resolveUser(session);
      if (!user) throw new errors.AuthError('User not found');

      await lib.permissions.checkPermission(user, 'User', 'manage');

      const invitationId = Number(params.invitationId);
      if (!invitationId || !Number.isInteger(invitationId) || invitationId <= 0) {
        throw new errors.ValidationError('Invalid invitation ID', {
          invitationId: ['Must be a positive integer'],
        });
      }

      return application.iam.manageInvitation.revoke({ invitationId, actingUser: user });
    },
  },

  // POST /api/team/invitations/:invitationId/resend — resend invitation email
  {
    access: 'authenticated',
    httpMethod: 'POST',
    path: '/api/team/invitations/:invitationId/resend',
    method: async ({ params, session }) => {
      if (!session) throw new errors.AuthError('Not authenticated');

      const user = await application.iam.resolveSession.resolveUser(session);
      if (!user) throw new errors.AuthError('User not found');

      await lib.permissions.checkPermission(user, 'User', 'manage');

      const invitationId = Number(params.invitationId);
      if (!invitationId || !Number.isInteger(invitationId) || invitationId <= 0) {
        throw new errors.ValidationError('Invalid invitation ID', {
          invitationId: ['Must be a positive integer'],
        });
      }

      return application.iam.manageInvitation.resend({ invitationId, actingUser: user });
    },
  },
])
