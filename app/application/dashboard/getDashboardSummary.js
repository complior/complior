({
  getSummary: async ({ userId, organizationId, userRoles }) => {
    const tq = lib.tenant.createTenantQuery(organizationId);
    const isMember = userRoles.includes('member') &&
      !userRoles.includes('owner') && !userRoles.includes('admin');

    // --- Tool Counts ---
    const toolWhere = isMember ? { createdById: userId } : {};
    const toolResult = await tq.findMany('AITool', { where: toolWhere });
    const tools = toolResult.rows;

    const totalTools = tools.length;
    const classifiedTools = tools.filter((t) => t.riskLevel).length;
    const unclassifiedTools = totalTools - classifiedTools;

    // --- Risk Distribution ---
    const riskDistribution = { prohibited: 0, high: 0, gpai: 0, limited: 0, minimal: 0 };
    for (const tool of tools) {
      if (tool.riskLevel && riskDistribution[tool.riskLevel] !== undefined) {
        riskDistribution[tool.riskLevel]++;
      }
    }

    // --- Compliance Score ---
    const classifiedWithScore = tools.filter(
      (t) => t.riskLevel && t.complianceScore !== null && t.complianceScore !== undefined,
    );
    const toolScores = classifiedWithScore.map((t) => t.complianceScore ?? 0);
    const orgScore = domain.classification.services.ComplianceScoreCalculator
      .calculateOrgScore(toolScores);

    // --- AI Literacy (stub — Feature 18 Sprint 8+) ---
    const aiLiteracy = {
      totalEmployees: 0,
      trained: 0,
      completionRate: 0,
      message: 'AI Literacy module available in a future release',
    };

    // --- Requires Attention ---
    const requiresAttention = [];

    // Critical: prohibited tools
    for (const tool of tools) {
      if (tool.riskLevel === 'prohibited') {
        requiresAttention.push({
          toolId: tool.id,
          toolName: tool.name,
          severity: 'critical',
          reason: 'Prohibited AI system — must be discontinued (Art. 5)',
        });
      }
    }

    // High: high-risk tools without compliance progress
    for (const tool of tools) {
      if (tool.riskLevel === 'high' && (!tool.complianceScore || tool.complianceScore === 0)) {
        requiresAttention.push({
          toolId: tool.id,
          toolName: tool.name,
          severity: 'high',
          reason: 'High-risk AI tool with no compliance progress',
        });
      }
    }

    // --- AI Act Timeline (Art. 113) ---
    const timeline = [
      {
        date: '2025-02-02',
        title: 'Art. 5 Prohibited Practices + Art. 4 AI Literacy',
        description: 'Prohibited AI systems must be discontinued. AI Literacy obligations apply.',
        daysUntil: Math.ceil((new Date('2025-02-02') - new Date()) / 86400000),
      },
      {
        date: '2025-08-02',
        title: 'GPAI Obligations (Art. 51-56)',
        description: 'General-purpose AI model obligations enter into force.',
        daysUntil: Math.ceil((new Date('2025-08-02') - new Date()) / 86400000),
      },
      {
        date: '2026-08-02',
        title: 'Full High-Risk Obligations (Art. 6-49)',
        description: 'All high-risk AI system requirements fully applicable.',
        daysUntil: Math.ceil((new Date('2026-08-02') - new Date()) / 86400000),
      },
    ];

    // --- Recent Activity (last 5 audit entries) ---
    const auditResult = await db.query(
      `SELECT al.*, u."email", u."fullName"
       FROM "AuditLog" al
       LEFT JOIN "User" u ON u."id" = al."userId"
       WHERE al."organizationId" = $1
       ORDER BY al."auditLogId" DESC
       LIMIT 5`,
      [organizationId],
    );

    // --- Plan Limits ---
    const planLimits = await application.billing.getOrgLimits.getLimits(organizationId);

    return {
      tools: {
        total: totalTools,
        classified: classifiedTools,
        unclassified: unclassifiedTools,
      },
      riskDistribution,
      complianceScore: orgScore,
      aiLiteracy,
      requiresAttention,
      timeline,
      recentActivity: auditResult.rows,
      planLimits,
    };
  },
})
