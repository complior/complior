({
  // 12 AESIA categories (#3-#14) mapped to deployer requirement codes
  // from app/seeds/requirements.js
  categories: [
    {
      id: 'technical_documentation',
      name: 'Technical Documentation',
      aesiaRef: '#3',
      relatedArticles: ['Art. 26(7)'],
      requiredRequirementCodes: ['ART_26_INFORM_WORKERS'],
    },
    {
      id: 'qms',
      name: 'Quality Management System',
      aesiaRef: '#4',
      relatedArticles: ['Art. 26(1)'],
      requiredRequirementCodes: ['ART_26_USAGE', 'ART_26_RISK_MGMT_SUPPORT'],
    },
    {
      id: 'risk_management',
      name: 'Risk Management',
      aesiaRef: '#5',
      relatedArticles: ['Art. 26(1)', 'Art. 26(5)'],
      requiredRequirementCodes: ['ART_26_RISK_MGMT_SUPPORT', 'ART_26_CEASE'],
    },
    {
      id: 'human_oversight',
      name: 'Human Oversight',
      aesiaRef: '#6',
      relatedArticles: ['Art. 26(2)'],
      requiredRequirementCodes: ['ART_26_OVERSIGHT'],
    },
    {
      id: 'data_governance',
      name: 'Data Governance',
      aesiaRef: '#7',
      relatedArticles: ['Art. 26(4)', 'Art. 26(9)'],
      requiredRequirementCodes: ['ART_26_INPUT_DATA', 'ART_26_DPIA'],
    },
    {
      id: 'transparency',
      name: 'Transparency',
      aesiaRef: '#8',
      relatedArticles: ['Art. 50', 'Art. 26(7)'],
      requiredRequirementCodes: [
        'ART_50_CHATBOT',
        'ART_50_DEEPFAKE',
        'ART_50_AI_GENERATED_TEXT',
        'ART_50_EMOTION',
        'ART_50_TRANSPARENCY',
        'ART_26_INFORM_WORKERS',
      ],
    },
    {
      id: 'accuracy',
      name: 'Accuracy',
      aesiaRef: '#9',
      relatedArticles: ['Art. 26(5)'],
      requiredRequirementCodes: ['ART_26_MONITORING'],
    },
    {
      id: 'robustness',
      name: 'Robustness',
      aesiaRef: '#10',
      relatedArticles: ['Art. 26(1)'],
      requiredRequirementCodes: ['ART_26_RISK_MGMT_SUPPORT'],
    },
    {
      id: 'cybersecurity',
      name: 'Cybersecurity',
      aesiaRef: '#11',
      relatedArticles: ['Art. 26(1)'],
      requiredRequirementCodes: ['ART_26_RISK_MGMT_SUPPORT'],
    },
    {
      id: 'logging',
      name: 'Logging',
      aesiaRef: '#12',
      relatedArticles: ['Art. 26(6)'],
      requiredRequirementCodes: ['ART_26_LOGS'],
    },
    {
      id: 'post_market_monitoring',
      name: 'Post-Market Monitoring',
      aesiaRef: '#13',
      relatedArticles: ['Art. 26(5)'],
      requiredRequirementCodes: ['ART_26_MONITORING', 'ART_26_POST_MARKET'],
    },
    {
      id: 'incident_management',
      name: 'Incident Management',
      aesiaRef: '#14',
      relatedArticles: ['Art. 26(5)', 'Art. 26(11)'],
      requiredRequirementCodes: ['ART_26_INCIDENT', 'ART_26_COOPERATION'],
    },
  ],

  getAll: function() {
    return this.categories;
  },

  getById: function(categoryId) {
    return this.categories.find((c) => c.id === categoryId) || null;
  },

  getAllRequirementCodes: function() {
    const codes = new Set();
    for (const cat of this.categories) {
      for (const code of cat.requiredRequirementCodes) {
        codes.add(code);
      }
    }
    return Array.from(codes);
  },

  // Evaluate a single category against its tool requirements
  // toolRequirements: array of { code, status, progress, estimatedEffortHours }
  evaluate: function(category, toolRequirements) {
    const matchingReqs = toolRequirements.filter(
      (tr) => category.requiredRequirementCodes.includes(tr.code),
    );

    if (matchingReqs.length === 0) {
      return {
        categoryId: category.id,
        name: category.name,
        aesiaRef: category.aesiaRef,
        status: 'red',
        completeness: 0,
        matchedRequirements: 0,
        totalRequired: category.requiredRequirementCodes.length,
        estimatedEffort: category.requiredRequirementCodes.length * 4,
        recommendations: [
          'No matching requirements found. Register and assess all related requirements for this category.',
        ],
      };
    }

    // Calculate completeness from matched requirement progress
    const totalProgress = matchingReqs.reduce((sum, r) => sum + (r.progress || 0), 0);
    const completeness = Math.round(totalProgress / matchingReqs.length);

    // Determine status based on completeness thresholds
    const status = completeness >= 80 ? 'green'
      : completeness >= 40 ? 'yellow'
        : 'red';

    // Calculate remaining effort from incomplete requirements
    const estimatedEffort = matchingReqs.reduce((sum, r) => {
      if (r.status === 'completed' || r.status === 'not_applicable') return sum;
      const remainingPct = (100 - (r.progress || 0)) / 100;
      return sum + Math.ceil((r.estimatedEffortHours || 4) * remainingPct);
    }, 0);

    // Generate recommendations based on status
    const recommendations = [];

    const notStarted = matchingReqs.filter(
      (r) => r.status === 'pending' || r.status === 'blocked',
    );
    const inProgress = matchingReqs.filter(
      (r) => r.status === 'in_progress',
    );

    if (notStarted.length > 0) {
      recommendations.push(
        `${notStarted.length} requirement(s) not yet started: ${notStarted.map((r) => r.code).join(', ')}`,
      );
    }
    if (inProgress.length > 0) {
      recommendations.push(
        `${inProgress.length} requirement(s) in progress — continue work to reach compliance`,
      );
    }

    const blocked = matchingReqs.filter((r) => r.status === 'blocked');
    if (blocked.length > 0) {
      recommendations.push(
        `${blocked.length} requirement(s) blocked — resolve blockers: ${blocked.map((r) => r.code).join(', ')}`,
      );
    }

    if (completeness < 80 && recommendations.length === 0) {
      recommendations.push(
        `Increase progress on ${category.name} requirements to reach 80% compliance threshold`,
      );
    }

    return {
      categoryId: category.id,
      name: category.name,
      aesiaRef: category.aesiaRef,
      status,
      completeness,
      matchedRequirements: matchingReqs.length,
      totalRequired: category.requiredRequirementCodes.length,
      estimatedEffort,
      recommendations,
    };
  },

  // Build prioritised action plan from evaluated categories
  buildActionPlan: function(evaluatedCategories) {
    const URGENCY_WEIGHT = { red: 3, yellow: 2, green: 1 };
    const IMPACT_WEIGHT = {
      risk_management: 5,
      human_oversight: 5,
      incident_management: 4,
      data_governance: 4,
      transparency: 4,
      post_market_monitoring: 3,
      logging: 3,
      accuracy: 3,
      robustness: 3,
      cybersecurity: 3,
      qms: 2,
      technical_documentation: 2,
    };

    // Sort by priority: urgency * impact descending
    const scored = evaluatedCategories
      .filter((c) => c.status !== 'green')
      .map((c) => ({
        ...c,
        urgency: URGENCY_WEIGHT[c.status] || 1,
        impact: IMPACT_WEIGHT[c.categoryId] || 2,
        priority: (URGENCY_WEIGHT[c.status] || 1) * (IMPACT_WEIGHT[c.categoryId] || 2),
      }))
      .sort((a, b) => b.priority - a.priority);

    const criticalPath = scored.map((c) => ({
      categoryId: c.categoryId,
      name: c.name,
      aesiaRef: c.aesiaRef,
      status: c.status,
      priority: c.priority,
      estimatedEffort: c.estimatedEffort,
      recommendations: c.recommendations,
    }));

    const totalEffort = criticalPath.reduce(
      (sum, c) => sum + c.estimatedEffort,
      0,
    );

    // Suggested deadline: 2 weeks per 40 hours of effort, minimum 2 weeks
    const weeksNeeded = Math.max(2, Math.ceil(totalEffort / 40) * 2);
    const suggestedDeadline = new Date();
    suggestedDeadline.setDate(suggestedDeadline.getDate() + weeksNeeded * 7);

    return {
      criticalPath,
      totalEffort,
      suggestedDeadlineWeeks: weeksNeeded,
      suggestedDeadline: suggestedDeadline.toISOString().split('T')[0],
    };
  },
})
