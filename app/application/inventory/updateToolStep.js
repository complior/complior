({
  update: async ({ toolId, step, body, userId, organizationId }) => {
    const stepSchemas = {
      1: schemas.ToolStep1Schema,
      2: schemas.ToolStep2Schema,
      3: schemas.ToolStep3Schema,
      4: schemas.ToolStep4Schema,
    };

    const schema = stepSchemas[step];
    if (!schema) {
      throw new errors.ValidationError('Invalid wizard step', { step: ['Must be 1-4'] });
    }

    let parsed;
    try {
      parsed = schema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          `Invalid data for step ${step}`, err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const tq = lib.tenant.createTenantQuery(organizationId);
    const existing = await tq.findOne('AITool', toolId);
    if (!existing) throw new errors.NotFoundError('AITool', toolId);

    const updateData = { ...parsed };

    if (parsed.dataTypes) {
      updateData.dataTypes = JSON.stringify(parsed.dataTypes);
    }
    if (parsed.affectedPersons) {
      updateData.affectedPersons = JSON.stringify(parsed.affectedPersons);
    }

    if (step >= existing.wizardStep) {
      updateData.wizardStep = step + 1 > 4 ? 4 : step + 1;
    }
    if (step === 4) {
      updateData.wizardCompleted = true;
    }

    const updated = await tq.update('AITool', toolId, updateData);
    if (!updated) throw new errors.NotFoundError('AITool', toolId);

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'update',
      resource: 'AITool',
      resourceId: toolId,
      oldData: { wizardStep: existing.wizardStep },
      newData: { wizardStep: updated.wizardStep, step },
    });

    return updated;
  },
})
