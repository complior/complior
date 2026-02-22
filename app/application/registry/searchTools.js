({
  search: async ({ q, category, risk, jurisdiction, page = 1, limit = 20 }) => {
    const conditions = ['"active" = true'];
    const values = [];
    let idx = 1;

    if (q) {
      conditions.push(
        `("name" ILIKE $${idx} OR "provider" ILIKE $${idx} OR "description" ILIKE $${idx})`,
      );
      values.push(`%${q}%`);
      idx++;
    }

    if (category) {
      conditions.push(`"category" = $${idx++}`);
      values.push(category);
    }

    if (risk) {
      conditions.push(`"riskLevel" = $${idx++}`);
      values.push(risk);
    }

    if (jurisdiction) {
      conditions.push(`"jurisdictions"::text ILIKE $${idx++}`);
      values.push(`%${jurisdiction}%`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM "RegistryTool" WHERE ${whereClause}`,
      values,
    );
    const total = countResult.rows[0].total;

    const offset = (page - 1) * limit;
    const dataValues = [...values, limit, offset];

    const result = await db.query(
      `SELECT * FROM "RegistryTool"
       WHERE ${whereClause}
       ORDER BY "name" ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      dataValues,
    );

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  findById: async (id) => {
    const result = await db.query(
      'SELECT * FROM "RegistryTool" WHERE "registryToolId" = $1 AND "active" = true',
      [id],
    );
    return result.rows[0] || null;
  },
})
