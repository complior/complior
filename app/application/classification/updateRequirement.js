({
  update: async ({ toolId, requirementId, userId, organizationId, data }) => {
    const tq = lib.tenant.createTenantQuery(organizationId);

    // 1. Verify tool exists and belongs to org
    const tool = await tq.findOne('AITool', toolId);
    if (!tool) throw new errors.NotFoundError('AITool', toolId);

    // 2. Verify ToolRequirement exists for this tool
    const trResult = await db.query(
      `SELECT * FROM "ToolRequirement"
       WHERE "toolRequirementId" = $1 AND "aiToolId" = $2`,
      [requirementId, toolId],
    );
    if (trResult.rows.length === 0) {
      throw new errors.NotFoundError('ToolRequirement', requirementId);
    }

    const oldReq = trResult.rows[0];

    // 3. Build update fields
    const updates = {};
    if (data.status !== undefined) updates.status = data.status;
    if (data.progress !== undefined) updates.progress = data.progress;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.dueDate !== undefined) updates.dueDate = data.dueDate;

    // 4. Auto-manage completedAt
    if (data.status === 'completed' && oldReq.status !== 'completed') {
      updates.completedAt = new Date().toISOString();
    } else if (data.status && data.status !== 'completed' && oldReq.status === 'completed') {
      updates.completedAt = null;
    }

    // 5. Auto-set progress to 100 when completed
    if (data.status === 'completed' && updates.progress === undefined) {
      updates.progress = 100;
    }

    if (Object.keys(updates).length === 0) {
      throw new errors.ValidationError('No fields to update', {});
    }

    // 6. Execute update
    const cols = Object.keys(updates);
    const vals = Object.values(updates);
    const sets = cols.map((c, i) => `"${c}" = $${i + 1}`);
    vals.push(requirementId, toolId);

    const updated = await db.query(
      `UPDATE "ToolRequirement" SET ${sets.join(', ')}
       WHERE "toolRequirementId" = $${vals.length - 1} AND "aiToolId" = $${vals.length}
       RETURNING *`,
      vals,
    );

    // 7. Recalculate compliance score
    const allReqs = await db.query(
      'SELECT "status", "progress" FROM "ToolRequirement" WHERE "aiToolId" = $1',
      [toolId],
    );
    const newScore = domain.classification.services.ComplianceScoreCalculator
      .calculateToolScore(allReqs.rows);

    // 8. Update complianceScore + complianceStatus in a single write
    const toolUpdate = { complianceScore: newScore };
    if (newScore === 100 && tool.complianceStatus !== 'compliant') {
      toolUpdate.complianceStatus = 'compliant';
    } else if (newScore > 0 && newScore < 100 && tool.complianceStatus !== 'in_progress') {
      toolUpdate.complianceStatus = 'in_progress';
    }
    await tq.update('AITool', toolId, toolUpdate);

    // 9. Audit log
    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'update',
      resource: 'ToolRequirement',
      resourceId: requirementId,
      oldData: { status: oldReq.status, progress: oldReq.progress },
      newData: updates,
    });

    return {
      requirement: updated.rows[0],
      complianceScore: newScore,
    };
  },
})
