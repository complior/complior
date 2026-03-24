({
  generate: async () => {
    const [toolsResult, obligationsResult, rulesResult] = await Promise.all([
      db.query('SELECT * FROM "RegistryTool" WHERE "active" = true ORDER BY "name"'),
      db.query('SELECT * FROM "Obligation" ORDER BY "sortOrder"'),
      db.query('SELECT * FROM "ScoringRule" ORDER BY "regulation", "checkId"'),
    ]);

    const tools = toolsResult.rows;
    const obligations = obligationsResult.rows;
    const scoringRules = rulesResult.rows;

    // Hash only data (exclude generatedAt for stable ETags)
    const dataContent = JSON.stringify({ tools, obligations, scoringRules });
    const checksum = crypto
      .createHash('md5').update(dataContent).digest('hex');
    const etag = `"${checksum}"`;

    const bundle = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      tools,
      obligations,
      scoringRules,
      checksum,
    };

    return { bundle, etag };
  },
})
