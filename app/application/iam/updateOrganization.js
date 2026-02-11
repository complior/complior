({
  update: async ({ body, orgId, userId, organizationId }) => {
    if (orgId !== Number(organizationId)) {
      throw new errors.ForbiddenError('Cannot update another organization');
    }

    let validated;
    try {
      validated = schemas.UpdateOrganizationSchema.parse(body || {});
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid organization data', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const fields = [];
    const values = [];
    let idx = 1;

    const addField = (col, val) => {
      if (val !== undefined) {
        fields.push(`"${col}" = $${idx++}`);
        values.push(val);
      }
    };

    addField('name', validated.name);
    addField('industry', validated.industry);
    addField('size', validated.size);
    addField('country', validated.country);
    addField('website', validated.website);
    addField('vatId', validated.vatId);

    if (fields.length === 0) {
      throw new errors.ValidationError('No fields to update');
    }

    values.push(orgId);
    const result = await db.query(
      `UPDATE "Organization" SET ${fields.join(', ')} WHERE "id" = $${idx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      throw new errors.NotFoundError('Organization', orgId);
    }

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'update',
      resource: 'Organization',
      resourceId: orgId,
      newData: validated,
    });

    return result.rows[0];
  },
})
