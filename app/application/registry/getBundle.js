({
  generate: async () => {
    const [toolsResult, obligationsResult, rulesResult] = await Promise.all([
      db.query('SELECT * FROM "RegistryTool" WHERE "active" = true ORDER BY "name"'),
      db.query('SELECT * FROM "Obligation" ORDER BY "sortOrder"'),
      db.query('SELECT * FROM "ScoringRule" ORDER BY "regulation", "checkId"'),
    ]);

    const bundle = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      tools: toolsResult.rows,
      obligations: obligationsResult.rows,
      scoringRules: rulesResult.rows,
    };

    const content = JSON.stringify(bundle);
    const checksum = crypto.createHash('md5').update(content).digest('hex');
    bundle.checksum = checksum;
    const etag = `"${checksum}"`;

    return { bundle, etag };
  },
})
