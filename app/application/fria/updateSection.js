({
  update: async ({ assessmentId, sectionType, body, userId, organizationId }) => {
    let parsed;
    try {
      parsed = schemas.FRIASectionUpdateSchema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid section data',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    // Verify assessment exists + tenant check
    const assessment = await db.query(
      `SELECT f."fRIAAssessmentId", f."status"
       FROM "FRIAAssessment" f
       WHERE f."fRIAAssessmentId" = $1
       AND f."organizationId" = $2`,
      [assessmentId, organizationId],
    );

    if (assessment.rows.length === 0) {
      throw new errors.NotFoundError('FRIAAssessment', assessmentId);
    }

    const current = assessment.rows[0];

    if (current.status === 'completed') {
      throw new errors.ValidationError(
        'Cannot edit a completed assessment',
      );
    }

    // Update section
    const setClauses = ['"content" = $1'];
    const values = [JSON.stringify(parsed.content)];
    let idx = 2;

    if (parsed.completed !== undefined) {
      setClauses.push(`"completed" = $${idx++}`);
      values.push(parsed.completed);
    }

    values.push(assessmentId, sectionType);

    const result = await db.query(
      `UPDATE "FRIASection"
       SET ${setClauses.join(', ')}
       WHERE "friaId" = $${idx++} AND "sectionType" = $${idx++}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      throw new errors.NotFoundError('FRIASection', sectionType);
    }

    // Auto-transition draft → in_progress on first edit
    if (current.status === 'draft') {
      await db.query(
        `UPDATE "FRIAAssessment" SET "status" = 'in_progress'
         WHERE "fRIAAssessmentId" = $1`,
        [assessmentId],
      );
    }

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'update',
      resource: 'FRIAAssessment',
      resourceId: assessmentId,
      newData: { sectionType, completed: parsed.completed },
    });

    return result.rows[0];
  },
})
