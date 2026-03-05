({
  create: async ({ body, userId, organizationId }) => {
    let parsed;
    try {
      parsed = schemas.ToolStep1Schema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid tool data', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    let prefill = {};
    if (parsed.catalogEntryId) {
      const catalog = await db.query(
        'SELECT * FROM "AIToolCatalog" WHERE "aIToolCatalogId" = $1 AND "active" = true',
        [parsed.catalogEntryId],
      );
      if (catalog.rows[0]) {
        const entry = catalog.rows[0];
        prefill = {
          description: entry.description || '',
          vendorCountry: entry.vendorCountry || parsed.vendorCountry || null,
          vendorUrl: entry.websiteUrl || parsed.vendorUrl || null,
          dataResidency: entry.dataResidency || null,
        };
      }
    }

    const tq = lib.tenant.createTenantQuery(organizationId);
    const tool = await tq.create('AITool', {
      ...prefill,
      name: parsed.name,
      vendorName: parsed.vendorName,
      vendorCountry: parsed.vendorCountry || prefill.vendorCountry || null,
      vendorUrl: parsed.vendorUrl || prefill.vendorUrl || null,
      description: parsed.description || prefill.description || '',
      catalogEntryId: parsed.catalogEntryId || null,
      createdById: userId,
      wizardStep: 1,
      wizardCompleted: false,
      complianceStatus: 'not_started',
      complianceScore: 0,
      purpose: '',
      domain: 'other',
      dataTypes: JSON.stringify([]),
      affectedPersons: JSON.stringify([]),
      vulnerableGroups: false,
      autonomyLevel: 'advisory',
      humanOversight: true,
      affectsNaturalPersons: false,
      framework: parsed.framework || null,
      modelProvider: parsed.modelProvider || null,
      modelId: parsed.modelId || null,
    });

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'create',
      resource: 'AITool',
      resourceId: tool.id,
      newData: { name: tool.name, vendorName: tool.vendorName },
    });

    return tool;
  },
})
