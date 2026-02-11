({
  access: 'authenticated',
  httpMethod: 'DELETE',
  path: '/api/tools/:id',
  method: async ({ params, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'AITool', 'manage');

    let parsed;
    try {
      parsed = schemas.ToolIdSchema.parse(params);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError('Invalid tool ID', err.flatten().fieldErrors);
      }
      throw err;
    }

    const tq = lib.tenant.createTenantQuery(user.organizationId);
    const tool = await tq.findOne('AITool', parsed.id);
    if (!tool) throw new errors.NotFoundError('AITool', parsed.id);

    // Hard-delete if draft (not yet classified), soft-delete otherwise
    if (!tool.wizardCompleted && !tool.riskLevel) {
      await tq.remove('AITool', parsed.id);
    } else {
      await tq.update('AITool', parsed.id, {
        complianceStatus: 'non_compliant',
      });
    }

    await lib.audit.createAuditEntry({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'delete',
      resource: 'AITool',
      resourceId: parsed.id,
      oldData: { name: tool.name, riskLevel: tool.riskLevel },
    });

    return { success: true };
  },
})
