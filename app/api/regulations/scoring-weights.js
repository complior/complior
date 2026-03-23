({
  access: 'public',
  httpMethod: 'GET',
  path: '/v1/regulations/scoring/weights',
  method: async ({ query }) => {
    const regulation = query.regulation || 'eu-ai-act';

    const weights = await db.query(
      `SELECT category, weight, label
       FROM "ScoringWeight"
       WHERE regulation = $1
       ORDER BY weight DESC`,
      [regulation],
    );

    const critical = await db.query(
      `SELECT "obligationIdUnique", title, "articleReference"
       FROM "Obligation"
       WHERE severity = 'critical'`,
    );

    const weightRows = weights.rows || weights;
    const criticalRows = critical.rows || critical;

    return {
      regulation,
      algorithm: 'deterministic-v2',

      categories: weightRows.map((w) => ({
        category: w.category,
        weight: parseFloat(w.weight),
        label: w.label,
      })),

      criticalObligations: criticalRows.map((o) => ({
        obligationId: o.obligationIdUnique,
        title: o.title,
        articleReference: o.articleReference,
      })),

      severityPoints: { critical: 15, high: 10, medium: 5, low: 2 },

      statusScores: {
        metVerified: 100,
        metUnverified: 75,
        metLowConfidence: 65,
        partiallyMetHigh: 60,
        partiallyMet: 50,
        partiallyMetLow: 40,
        unknown: 15,
        notMet: 0,
      },

      urgencyMultipliers: {
        overdue1year: 1.5,
        overdue6months: 1.3,
        overdue: 1.15,
        approaching180days: 1.1,
        distant: 1.0,
      },

      sectorMultipliers: {
        matchingSector: 1.25,
        default: 1.0,
        sectors: ['HR', 'FIN', 'MED', 'EDU', 'BIO', 'LAW'],
      },

      penaltyMultipliers: {
        '€35M / 7%': 1.3,
        '€15M / 3%': 1.15,
        '€7.5M / 1%': 1.0,
        default: 1.0,
      },

      penalties: {
        criticalCap: { threshold: 'any critical not_met', cap: 40 },
        highSeverityPenalty: { threshold: '>50% high not_met', deduction: 10 },
        gdprEnforcement: { perIncident: 3, max: 8 },
        securityIncidents: { perIncident: 2, max: 5 },
        allUnknown: { cap: 15 },
      },

      bonuses: {
        euAiActPage: { points: 3, signal: 'trust.has_eu_ai_act_page' },
        aiActMention: { points: 2, signal: 'trust.mentions_ai_act' },
        modelCard: { points: 3, criteria: '3+ sections of 4 (limitations, bias, training, evaluation)' },
        privacyExcellence: { points: 2, criteria: 'training_opt_out + deletion_right + retention_specified' },
        transparencyReport: { points: 1, signal: 'web_search.has_transparency_report' },
        iso42001: { points: 2, signal: 'trust.certifications includes ISO 42001' },
        maxTotal: 10,
      },

      gradeScale: [
        { grade: 'A+', min: 95 }, { grade: 'A', min: 90 }, { grade: 'A-', min: 85 },
        { grade: 'B+', min: 80 }, { grade: 'B', min: 75 }, { grade: 'B-', min: 70 },
        { grade: 'C+', min: 65 }, { grade: 'C', min: 60 }, { grade: 'C-', min: 55 },
        { grade: 'D+', min: 50 }, { grade: 'D', min: 40 }, { grade: 'D-', min: 30 },
        { grade: 'F', min: 0 },
      ],

      zones: { red: { max: 49 }, yellow: { max: 79 }, green: { max: 100 } },

      maturityLevels: [
        { level: 0, label: 'Unaware', criteria: 'No evidence of compliance effort' },
        { level: 1, label: 'Aware', criteria: 'Has AI disclosure OR responsible AI page' },
        { level: 2, label: 'Implementing', criteria: '≥40% obligations addressed, evidence present' },
        { level: 3, label: 'Compliant', criteria: '≥75% met/partial, no critical not_met, evidence ≥60%' },
        { level: 4, label: 'Exemplary', criteria: 'EU AI Act page, ISO 42001, ≥90% met, zero critical not_met' },
      ],

      confidenceBase: { verified: 0.9, scanned: 0.6, classified: 0.2 },

      evidenceMappingRules: [
        { id: 1, obligation: 'OBL-015', name: 'AI Disclosure', sources: ['passive_scan.disclosure', 'llm_tests.identity', 'human_tests'] },
        { id: 2, obligation: 'OBL-016', name: 'Content Marking', sources: ['passive_scan.content_marking', 'media_tests.c2pa'] },
        { id: 3, obligation: 'OBL-016a', name: 'Image C2PA/Watermark', sources: ['media_tests.image', 'passive_scan.content_marking.watermark'] },
        { id: 4, obligation: 'OBL-001', name: 'AI Literacy', sources: ['passive_scan.trust', 'passive_scan.model_card'] },
        { id: 5, obligation: 'OBL-022*', name: 'GPAI Documentation', sources: ['passive_scan.model_card'], condition: 'risk_level includes gpai' },
        { id: 6, obligation: 'OBL-002a', name: 'Safety / Prohibited Practices', sources: ['llm_tests.safety'] },
        { id: 7, obligation: 'OBL-004a', name: 'Bias Detection', sources: ['passive_scan.web_search', 'passive_scan.model_card', 'llm_tests.bias'] },
        { id: 8, obligation: 'OBL-018', name: 'Deep Fake Labeling', sources: ['human_tests', 'passive_scan.content_marking', 'media_tests'], condition: 'categories includes deepfake/voice-clone/video-generation/voice-tts' },
        { id: 9, obligation: 'OBL-003/004', name: 'Privacy/Data Governance', sources: ['passive_scan.privacy_policy'] },
        { id: 10, obligation: 'various', name: 'Infrastructure/Registration', sources: ['passive_scan.infra', 'passive_scan.trust.certifications'] },
        { id: 11, obligation: 'OBL-022', name: 'Factual Knowledge', sources: ['llm_tests.factual'] },
      ],
    };
  },
})
