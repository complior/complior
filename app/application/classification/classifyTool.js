({
  classify: async ({ toolId, userId, organizationId }) => {
    const tq = lib.tenant.createTenantQuery(organizationId);

    // 1. Get the tool
    const tool = await tq.findOne('AITool', toolId);
    if (!tool) throw new errors.NotFoundError('AITool', toolId);

    // 2. Verify wizard is completed
    if (!tool.wizardCompleted) {
      throw new errors.ValidationError(
        'Tool wizard must be completed before classification',
        { wizardCompleted: ['All wizard steps must be completed'] },
      );
    }

    // 3. Get catalog default risk if linked
    let catalogDefaultRisk = null;
    if (tool.catalogEntryId) {
      const catalogResult = await db.query(
        'SELECT "defaultRiskLevel" FROM "AIToolCatalog" WHERE "aIToolCatalogId" = $1',
        [tool.catalogEntryId],
      );
      if (catalogResult.rows[0]) {
        catalogDefaultRisk = catalogResult.rows[0].defaultRiskLevel;
      }
    }

    // 4. Parse JSON fields safely
    const dataTypes = typeof tool.dataTypes === 'string'
      ? JSON.parse(tool.dataTypes) : (tool.dataTypes || []);
    const affectedPersons = typeof tool.affectedPersons === 'string'
      ? JSON.parse(tool.affectedPersons) : (tool.affectedPersons || []);

    // 5. Run RuleEngine
    const ruleResult = application.classification.services.RuleEngine.classify({
      name: tool.name,
      domain: tool.domain,
      purpose: tool.purpose,
      dataTypes,
      affectedPersons,
      vulnerableGroups: tool.vulnerableGroups,
      autonomyLevel: tool.autonomyLevel,
      humanOversight: tool.humanOversight,
      affectsNaturalPersons: tool.affectsNaturalPersons,
      catalogDefaultRisk,
    });

    // 6. Mark previous classifications as not current
    await db.query(
      `UPDATE "RiskClassification" SET "isCurrent" = false
       WHERE "aiToolId" = $1`,
      [toolId],
    );

    // 7. Get version number
    const versionResult = await db.query(
      'SELECT COALESCE(MAX("version"), 0) + 1 AS next FROM "RiskClassification" WHERE "aiToolId" = $1',
      [toolId],
    );
    const nextVersion = versionResult.rows[0].next;

    // 8. Create RiskClassification record
    const reasoning = ruleResult.matchedRules.join('; ');
    const classification = await db.query(
      `INSERT INTO "RiskClassification"
       ("aiToolId", "riskLevel", "annexCategory", "confidence", "reasoning",
        "ruleResult", "llmResult", "crossValidation", "method",
        "articleReferences", "version", "isCurrent", "classifiedById")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        toolId,
        ruleResult.riskLevel,
        ruleResult.annexCategory || null,
        ruleResult.confidence,
        reasoning,
        JSON.stringify(ruleResult),
        null,
        null,
        'rule_only',
        JSON.stringify(ruleResult.articleReferences),
        nextVersion,
        true,
        userId,
      ],
    );

    // 9. Update AITool with classification result
    await tq.update('AITool', toolId, {
      riskLevel: ruleResult.riskLevel,
      annexCategory: ruleResult.annexCategory || null,
      classificationConfidence: ruleResult.confidence,
      complianceStatus: 'in_progress',
    });

    // 10. Map requirements
    const requirements = await application.classification.mapRequirements.map({
      aiToolId: toolId,
      riskLevel: ruleResult.riskLevel,
      organizationId,
    });

    // 11. Audit log
    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'classify',
      resource: 'AITool',
      resourceId: toolId,
      newData: {
        riskLevel: ruleResult.riskLevel,
        confidence: ruleResult.confidence,
        method: 'rule_only',
      },
    });

    return {
      classification: classification.rows[0],
      riskLevel: ruleResult.riskLevel,
      confidence: ruleResult.confidence,
      matchedRules: ruleResult.matchedRules,
      articleReferences: ruleResult.articleReferences,
      annexCategory: ruleResult.annexCategory,
      requirementsCreated: requirements.length,
    };
  },
})
