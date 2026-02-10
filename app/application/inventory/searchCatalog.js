({
  search: async ({ q, category, riskLevel, page = 1, pageSize = 20 }) => {
    const conditions = ['"active" = true'];
    const values = [];
    let idx = 1;

    if (q) {
      conditions.push(
        `("name" ILIKE $${idx} OR "vendor" ILIKE $${idx} OR "description" ILIKE $${idx})`,
      );
      values.push(`%${q}%`);
      idx++;
    }

    if (category) {
      conditions.push(`"category" = $${idx++}`);
      values.push(category);
    }

    if (riskLevel) {
      conditions.push(`"defaultRiskLevel" = $${idx++}`);
      values.push(riskLevel);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM "AIToolCatalog" WHERE ${whereClause}`,
      values,
    );
    const total = countResult.rows[0].total;

    const offset = (page - 1) * pageSize;
    const dataValues = [...values, pageSize, offset];

    const result = await db.query(
      `SELECT * FROM "AIToolCatalog"
       WHERE ${whereClause}
       ORDER BY "name" ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      dataValues,
    );

    return {
      data: result.rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  findById: async (id) => {
    const result = await db.query(
      'SELECT * FROM "AIToolCatalog" WHERE "aIToolCatalogId" = $1 AND "active" = true',
      [id],
    );
    return result.rows[0] || null;
  },
})
