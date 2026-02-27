({
  search: async ({ q, category, risk, aiActRole, jurisdiction, hasDetectionPatterns, level, sort, page = 1, limit = 20 }) => {
    const conditions = ['"active" = true'];
    const values = [];
    let idx = 1;

    if (q) {
      conditions.push(
        `("name" ILIKE $${idx} OR "provider"::text ILIKE $${idx} OR "description" ILIKE $${idx})`,
      );
      values.push(`%${q}%`);
      idx++;
    }

    if (category) {
      conditions.push(`"category" = $${idx++}`);
      values.push(category);
    }

    if (risk) {
      const riskValues = risk.split(',').map(r => r.trim()).filter(Boolean);
      if (riskValues.length === 1) {
        conditions.push(`"riskLevel" = $${idx++}`);
        values.push(riskValues[0]);
      } else if (riskValues.length > 1) {
        const placeholders = riskValues.map(() => `$${idx++}`).join(',');
        conditions.push(`"riskLevel" IN (${placeholders})`);
        riskValues.forEach(v => values.push(v));
      }
    }

    if (jurisdiction) {
      conditions.push(`"jurisdictions"::text ILIKE $${idx++}`);
      values.push(`%${jurisdiction}%`);
    }

    if (hasDetectionPatterns === true) {
      conditions.push(`"detectionPatterns" IS NOT NULL AND "detectionPatterns" != 'null'::jsonb`);
    } else if (hasDetectionPatterns === false) {
      conditions.push(`("detectionPatterns" IS NULL OR "detectionPatterns" = 'null'::jsonb)`);
    }

    if (aiActRole) {
      conditions.push(`"aiActRole" = $${idx++}`);
      values.push(aiActRole);
    }

    if (level) {
      conditions.push(`"level" = $${idx++}`);
      values.push(level);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM "RegistryTool" WHERE ${whereClause}`,
      values,
    );
    const total = countResult.rows[0].total;

    const offset = (page - 1) * limit;

    // For text search: add raw query param for relevance sorting, then LIMIT/OFFSET
    let relevancePrefix = '';
    const dataValues = [...values];
    if (q) {
      const qRawIdx = idx++;
      dataValues.push(q);
      relevancePrefix = `CASE
           WHEN LOWER("name") = LOWER($${qRawIdx}) THEN 0
           WHEN LOWER("name") LIKE LOWER($${qRawIdx}) || '%' THEN 1
           WHEN LOWER("name") LIKE '%' || LOWER($${qRawIdx}) || '%' THEN 2
           ELSE 3
         END,`;
    }
    dataValues.push(limit, offset);

    let orderClause;
    if (sort === 'grade') {
      orderClause = `ORDER BY ${relevancePrefix} COALESCE(("assessments"->'eu-ai-act'->'publicDocumentation'->>'grade'), 'Z') ASC`;
    } else if (sort === 'score') {
      orderClause = `ORDER BY ${relevancePrefix} COALESCE(("assessments"->'eu-ai-act'->>'score')::numeric, -1) DESC, COALESCE(("assessments"->'eu-ai-act'->>'transparencyGrade'), 'Z') ASC`;
    } else if (sort === 'risk') {
      orderClause = `ORDER BY ${relevancePrefix} CASE "riskLevel"
        WHEN 'unacceptable' THEN 1 WHEN 'high' THEN 2 WHEN 'gpai_systemic' THEN 3
        WHEN 'gpai' THEN 4 WHEN 'limited' THEN 5 WHEN 'minimal' THEN 6
        ELSE 7 END ASC`;
    } else {
      orderClause = `ORDER BY ${relevancePrefix} "name" ASC`;
    }

    const result = await db.query(
      `SELECT * FROM "RegistryTool"
       WHERE ${whereClause}
       ${orderClause}
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

  findBySlug: async (slug) => {
    const result = await db.query(
      'SELECT * FROM "RegistryTool" WHERE "slug" = $1 AND "active" = true',
      [slug],
    );
    return result.rows[0] || null;
  },

  findById: async (id) => {
    const result = await db.query(
      'SELECT * FROM "RegistryTool" WHERE "registryToolId" = $1 AND "active" = true',
      [id],
    );
    return result.rows[0] || null;
  },
})
