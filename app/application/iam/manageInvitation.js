({
  revoke: async ({ invitationId, actingUser }) => {
    const tq = lib.tenant.createTenantQuery(actingUser.organizationId);
    const invitation = await tq.findOne('Invitation', invitationId);
    if (!invitation) throw new errors.NotFoundError('Invitation', invitationId);

    if (invitation.status !== 'pending') {
      throw new errors.ValidationError('Cannot revoke a non-pending invitation', {
        status: [`Invitation is ${invitation.status}`],
      });
    }

    await tq.update('Invitation', invitationId, { status: 'revoked' });

    await lib.audit.createAuditEntry({
      userId: actingUser.id,
      organizationId: actingUser.organizationId,
      action: 'delete',
      resource: 'Invitation',
      resourceId: invitationId,
      oldData: { email: invitation.email, status: 'pending' },
      newData: { status: 'revoked' },
    });

    return { success: true };
  },

  resend: async ({ invitationId, actingUser }) => {
    const tq = lib.tenant.createTenantQuery(actingUser.organizationId);
    const invitation = await tq.findOne('Invitation', invitationId);
    if (!invitation) throw new errors.NotFoundError('Invitation', invitationId);

    if (invitation.status !== 'pending') {
      throw new errors.ValidationError('Cannot resend a non-pending invitation', {
        status: [`Invitation is ${invitation.status}`],
      });
    }

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await tq.update('Invitation', invitationId, { expiresAt: newExpiresAt });

    await brevo.sendTransactional({
      to: invitation.email,
      templateId: 'invite',
      params: {
        inviterName: actingUser.fullName,
        role: invitation.role,
        token: invitation.token,
      },
    });

    await lib.audit.createAuditEntry({
      userId: actingUser.id,
      organizationId: actingUser.organizationId,
      action: 'update',
      resource: 'Invitation',
      resourceId: invitationId,
      newData: { action: 'resend', email: invitation.email },
    });

    return { success: true };
  },
})
