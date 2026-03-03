({
  update: async ({ assessmentId, body, userId, organizationId }) => {
    let parsed;
    try {
      parsed = schemas.FRIAStatusUpdateSchema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid status',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    // Verify assessment exists + tenant check
    const result = await db.query(
      `SELECT f."fRIAAssessmentId", f."status"
       FROM "FRIAAssessment" f
       WHERE f."fRIAAssessmentId" = $1
       AND f."organizationId" = $2`,
      [assessmentId, organizationId],
    );

    if (result.rows.length === 0) {
      throw new errors.NotFoundError('FRIAAssessment', assessmentId);
    }

    const current = result.rows[0];
    const allowed = {
      draft: ['in_progress'],
      in_progress: ['review'],
      review: ['completed', 'in_progress'],
      completed: [],
    };

    const valid = allowed[current.status] || [];
    if (!valid.includes(parsed.status)) {
      throw new errors.ValidationError(
        `Cannot transition from '${current.status}' to '${parsed.status}'`,
      );
    }

    const setClauses = ['"status" = $1'];
    const values = [parsed.status];
    let idx = 2;

    if (parsed.status === 'completed') {
      setClauses.push(`"completedAt" = now()`);
      setClauses.push(`"approvedById" = $${idx++}`);
      values.push(userId);
    }

    values.push(assessmentId);

    await db.query(
      `UPDATE "FRIAAssessment"
       SET ${setClauses.join(', ')}
       WHERE "fRIAAssessmentId" = $${idx++}`,
      values,
    );

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'update',
      resource: 'FRIAAssessment',
      resourceId: assessmentId,
      oldData: { status: current.status },
      newData: { status: parsed.status },
    });

    return { status: parsed.status };
  },
})
