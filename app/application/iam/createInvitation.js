({
  create: async ({ email, role, userId, organizationId }) => {
    let parsed;
    try {
      parsed = schemas.InviteCreateSchema.parse({ email, role });
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError('Invalid invitation data', err.flatten().fieldErrors);
      }
      throw err;
    }

    const existingUser = await db.query(
      'SELECT "id" FROM "User" WHERE "email" = $1 AND "organizationId" = $2 AND "active" = true',
      [parsed.email, organizationId],
    );
    if (existingUser.rows.length > 0) {
      throw new errors.ConflictError('User is already a member of this organization');
    }

    const tq = lib.tenant.createTenantQuery(organizationId);
    const existingInvite = await tq.findMany('Invitation', {
      where: { email: parsed.email, status: 'pending' },
    });
    if (existingInvite.rows.length > 0) {
      throw new errors.ConflictError('A pending invitation already exists for this email');
    }

    const limits = await application.billing.getOrgLimits.checkUsers(organizationId);
    if (!limits.allowed) {
      throw new errors.PlanLimitError('maxUsers', limits.current, limits.limit);
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await tq.create('Invitation', {
      invitedById: userId,
      email: parsed.email,
      role: parsed.role,
      token,
      status: 'pending',
      expiresAt,
    });

    const orgResult = await db.query(
      'SELECT "name" FROM "Organization" WHERE "id" = $1',
      [organizationId],
    );
    const orgName = orgResult.rows[0]?.name || 'Organization';

    const acceptUrl = `${config.APP_URL || 'http://localhost:3000'}/invite/accept?token=${token}`;
    await brevo.sendTransactional({
      to: parsed.email,
      subject: `You've been invited to join ${orgName}`,
      html: `<p>You have been invited to join <strong>${orgName}</strong> as <strong>${parsed.role}</strong>.</p>
<p><a href="${acceptUrl}">Accept Invitation</a></p>
<p>This invitation expires in 7 days.</p>`,
    });

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'create',
      resource: 'Invitation',
      resourceId: invitation.id,
      newData: { email: parsed.email, role: parsed.role },
    });

    return invitation;
  },
})
