/**
 * Public Documentation Grader — v4 Registry Metrics.
 *
 * Pure checklist-based grading: 9-item role-specific checklist → A+ to F.
 * No tier bonuses. No coverage ceiling. No unknown=25. Pure signal matching.
 *
 * VM sandbox compatible — IIFE factory, config injected.
 */
(() => {
  const GRADE_MAP = {
    9: 'A+', 8: 'A', 7: 'A-', 6: 'B+', 5: 'B',
    4: 'B-', 3: 'C', 2: 'D', 1: 'D-', 0: 'F',
  };

  const PROVIDER_CHECKLIST = [
    { id: 'ai_disclosure', label: 'AI System Disclosure', signal: 'disclosure.visible' },
    { id: 'model_card', label: 'Model Card Published', signal: 'model_card.has_model_card' },
    { id: 'model_limitations', label: 'Limitations & Risks', signal: 'model_card.has_limitations AND model_card.has_bias_info' },
    { id: 'training_data_info', label: 'Training Data Description', signal: 'model_card.has_training_data' },
    { id: 'privacy_ai', label: 'Privacy Policy Addresses AI', signal: 'privacy_policy.mentions_ai' },
    { id: 'eu_ai_act_page', label: 'EU AI Act Compliance Page', signal: 'trust.has_eu_ai_act_page' },
    { id: 'responsible_ai', label: 'Responsible AI Program', signal: 'trust.has_responsible_ai_page' },
    { id: 'transparency_report', label: 'Transparency Report', signal: 'web_search.has_transparency_report' },
    { id: 'content_marking', label: 'Output Marking', signal: 'content_marking.c2pa OR content_marking.watermark' },
  ];

  const DEPLOYER_PRODUCT_CHECKLIST = [
    { id: 'ai_disclosure', label: 'AI Usage Disclosure', signal: 'disclosure.visible' },
    { id: 'privacy_ai', label: 'Privacy Policy Addresses AI', signal: 'privacy_policy.mentions_ai' },
    { id: 'privacy_eu', label: 'EU Data Compliance', signal: 'privacy_policy.mentions_eu' },
    { id: 'eu_ai_act_page', label: 'EU AI Act Compliance Page', signal: 'trust.has_eu_ai_act_page' },
    { id: 'responsible_ai', label: 'Responsible AI Program', signal: 'trust.has_responsible_ai_page' },
    { id: 'terms_ai', label: 'Terms Address AI Use', signal: 'privacy_policy.training_opt_out' },
    { id: 'bias_audit', label: 'Public Bias Audit', signal: 'web_search.has_public_bias_audit' },
    { id: 'transparency_report', label: 'Transparency Report', signal: 'web_search.has_transparency_report' },
    { id: 'certifications', label: 'Certifications', signal: 'trust.certifications.length > 0' },
  ];

  const CHECKLIST_MAP = {
    provider: PROVIDER_CHECKLIST,
    deployer_product: DEPLOYER_PRODUCT_CHECKLIST,
    hybrid: PROVIDER_CHECKLIST,
    infrastructure: PROVIDER_CHECKLIST,
    ai_feature: DEPLOYER_PRODUCT_CHECKLIST,
  };

  /**
   * Resolve a dot-path signal expression against passive_scan evidence.
   * Supports: simple paths, AND, OR operators.
   */
  const resolveSignal = (ps, signalExpr) => {
    if (!ps || !signalExpr) return false;

    // Handle OR expressions: "a.b OR c.d"
    if (signalExpr.includes(' OR ')) {
      return signalExpr.split(' OR ').some((part) => resolveSignal(ps, part.trim()));
    }

    // Handle AND expressions: "a.b AND c.d"
    if (signalExpr.includes(' AND ')) {
      return signalExpr.split(' AND ').every((part) => resolveSignal(ps, part.trim()));
    }

    // Handle special: "trust.certifications.length > 0"
    if (signalExpr.includes('.length > 0')) {
      const arrPath = signalExpr.replace('.length > 0', '');
      const arr = getNestedValue(ps, arrPath);
      return Array.isArray(arr) && arr.length > 0;
    }

    // Simple dot-path: "disclosure.visible"
    const val = getNestedValue(ps, signalExpr);
    return !!val;
  };

  const getNestedValue = (obj, path) => {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined;
      current = current[part];
    }
    return current;
  };

  /**
   * Grade a tool's public documentation based on passive_scan evidence.
   *
   * @param {object} tool - Registry tool with evidence.passive_scan
   * @param {string|null} [roleOverride] - Force a specific role checklist
   * @returns {object} { grade, score, total, percent, items, checklist, gradedAt }
   */
  const grade = (tool, roleOverride) => {
    const ps = (tool.evidence && tool.evidence.passive_scan) || {};
    const role = roleOverride || tool.aiActRole || null;
    const checklistKey = role && CHECKLIST_MAP[role] ? role : 'provider';
    const checklist = CHECKLIST_MAP[checklistKey];

    let found = 0;
    const items = checklist.map((item) => {
      const isFound = resolveSignal(ps, item.signal);
      if (isFound) found++;
      return {
        id: item.id,
        label: item.label,
        found: isFound,
        signal: item.signal,
      };
    });

    const total = checklist.length;
    const percent = total > 0 ? Math.round((found / total) * 100) : 0;

    return {
      grade: GRADE_MAP[found] || 'F',
      score: found,
      total,
      percent,
      items,
      checklist: checklistKey,
      gradedAt: new Date().toISOString(),
    };
  };

  return () => ({ grade });
})()
