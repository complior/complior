({
  search: async ({ regulation, risk, category, page = 1, limit = 20 }) => {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (regulation) {
      conditions.push(`"regulation" = $${idx++}`);
      values.push(regulation);
    }

    if (risk) {
      conditions.push(`"riskLevel" = $${idx++}`);
      values.push(risk);
    }

    if (category) {
      conditions.push(`"category" = $${idx++}`);
      values.push(category);
    }

    const whereClause = conditions.length > 0
      ? conditions.join(' AND ')
      : '1=1';

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM "Obligation" WHERE ${whereClause}`,
      values,
    );
    const total = countResult.rows[0].total;

    const offset = (page - 1) * limit;
    const dataValues = [...values, limit, offset];

    const result = await db.query(
      `SELECT * FROM "Obligation"
       WHERE ${whereClause}
       ORDER BY "sortOrder" ASC
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
})
