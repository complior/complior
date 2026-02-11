({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/tools',
  method: async ({ query, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.syncUserFromOry.syncOnLogin(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'AITool', 'read');

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
    const values = [user.organizationId];
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

    const data = result.rows.map((r) => {
      if (r.aIToolId !== undefined) r.id = r.aIToolId;
      return r;
    });

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
