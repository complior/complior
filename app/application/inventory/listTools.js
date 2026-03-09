({
  list: async ({ query, organizationId }) => {
    let parsed;
    try {
      parsed = schemas.ToolListSchema.parse(query || {});
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError('Invalid query parameters', err.flatten().fieldErrors);
      }
      throw err;
    }

    const conditions = ['"organizationId" = $1'];
    const values = [organizationId];
    let idx = 2;

    if (parsed.q) {
      conditions.push(
        `("name" ILIKE $${idx} OR "vendorName" ILIKE $${idx} OR "purpose" ILIKE $${idx})`,
      );
      values.push(`%${parsed.q}%`);
      idx++;
    }

    if (parsed.riskLevel) {
      conditions.push(`"riskLevel" = $${idx++}`);
      values.push(parsed.riskLevel);
    }

    if (parsed.domain) {
      conditions.push(`"domain" = $${idx++}`);
      values.push(parsed.domain);
    }

    if (parsed.status) {
      conditions.push(`"complianceStatus" = $${idx++}`);
      values.push(parsed.status);
    }

    if (parsed.lifecycle) {
      conditions.push(`"lifecycle" = $${idx++}`);
      values.push(parsed.lifecycle);
    }

    if (parsed.source) {
      conditions.push(`"source" = $${idx++}`);
      values.push(parsed.source);
    }

    if (parsed.autonomyLevel) {
      conditions.push(`"autonomyLevel" = $${idx++}`);
      values.push(parsed.autonomyLevel);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM "AITool" WHERE ${whereClause}`,
      values,
    );
    const total = countResult.rows[0].total;

    const offset = (parsed.page - 1) * parsed.pageSize;
    const dataValues = [...values, parsed.pageSize, offset];

    const result = await db.query(
      `SELECT * FROM "AITool"
       WHERE ${whereClause}
       ORDER BY "aIToolId" DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      dataValues,
    );

    const data = result.rows.map((r) =>
      r.aIToolId !== undefined ? { ...r, id: r.aIToolId } : r,
    );

    return {
      data,
      pagination: {
        page: parsed.page,
        pageSize: parsed.pageSize,
        total,
        totalPages: Math.ceil(total / parsed.pageSize),
      },
    };
  },
})
