({
  get: async ({ jurisdictionId }) => {
    const result = await db.query(
      `SELECT * FROM "ScoringRule"
       WHERE "regulation" = $1
       ORDER BY "weight" DESC`,
      [jurisdictionId],
    );

    const rules = result.rows || result;

    // Aggregate by risk level
    const byRiskLevel = {};
    for (const rule of rules) {
      const rl = rule.riskLevel || 'unclassified';
      if (!byRiskLevel[rl]) byRiskLevel[rl] = { count: 0, totalWeight: 0, maxScoreSum: 0 };
      byRiskLevel[rl].count++;
      byRiskLevel[rl].totalWeight += rule.weight || 0;
      byRiskLevel[rl].maxScoreSum += rule.maxScore || 0;
    }

    return {
      jurisdictionId,
      totalRules: rules.length,
      maxPossibleScore: rules.reduce((sum, r) => sum + (r.maxScore || 0), 0),
      byRiskLevel,
      rules: rules.map((r) => ({
        checkId: r.checkId,
        weight: r.weight,
        maxScore: r.maxScore,
        riskLevel: r.riskLevel,
        description: r.description,
      })),
    };
  },
})
