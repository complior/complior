/**
 * Public Documentation Grader — v4.1 Registry Metrics.
 *
 * Weighted checklist grading: required items = 90% weight, best practice = 10% bonus.
 * Formula: weightedPercent = (reqFound/reqTotal) * 90 + (bpFound/bpTotal) * 10
 *
 * Key property: you CANNOT get grade A without 5+ legally required items,
 * even with all best practices checked.
 *
 * VM sandbox compatible — IIFE factory, config injected.
 */
(() => {
  const GRADE_THRESHOLDS = [
    { min: 95, grade: 'A+' },
    { min: 85, grade: 'A' },
    { min: 78, grade: 'A-' },
    { min: 72, grade: 'B+' },
    { min: 60, grade: 'B' },
    { min: 50, grade: 'B-' },
    { min: 40, grade: 'C' },
    { min: 25, grade: 'D' },
    { min: 15, grade: 'D-' },
    { min: 0, grade: 'F' },
  ];

  const PROVIDER_CHECKLIST = [
    { id: 'ai_disclosure', label: 'AI System Disclosure', signal: 'disclosure.visible', tier: 'required', legalBasis: 'Art. 50 §1' },
    { id: 'model_card', label: 'Model Card Published', signal: 'model_card.has_model_card', tier: 'required', legalBasis: 'Art. 53 §1(b)' },
    { id: 'model_limitations', label: 'Limitations & Risks', signal: 'model_card.has_limitations AND model_card.has_bias_info', tier: 'required', legalBasis: 'Art. 53, Annex XI §2' },
    { id: 'training_data_info', label: 'Training Data Description', signal: 'model_card.has_training_data', tier: 'required', legalBasis: 'Art. 53 §1(d)' },
    { id: 'privacy_ai', label: 'Privacy Policy Addresses AI', signal: 'privacy_policy.mentions_ai', tier: 'required', legalBasis: 'GDPR Art. 13-14' },
    { id: 'content_marking', label: 'Output Marking', signal: 'content_marking.c2pa OR content_marking.watermark', tier: 'required', legalBasis: 'Art. 50 §2' },
    { id: 'eu_ai_act_page', label: 'EU AI Act Compliance Page', signal: 'trust.has_eu_ai_act_page', tier: 'best_practice', legalBasis: null },
    { id: 'responsible_ai', label: 'Responsible AI Program', signal: 'trust.has_responsible_ai_page', tier: 'best_practice', legalBasis: null },
    { id: 'transparency_report', label: 'Transparency Report', signal: 'web_search.has_transparency_report', tier: 'best_practice', legalBasis: null },
  ];

  const DEPLOYER_PRODUCT_CHECKLIST = [
    { id: 'ai_disclosure', label: 'AI Usage Disclosure', signal: 'disclosure.visible', tier: 'required', legalBasis: 'Art. 50 §4-5' },
    { id: 'privacy_ai', label: 'Privacy Policy Addresses AI', signal: 'privacy_policy.mentions_ai', tier: 'required', legalBasis: 'GDPR Art. 13-14' },
    { id: 'privacy_eu', label: 'EU Data Compliance', signal: 'privacy_policy.mentions_eu', tier: 'required', legalBasis: 'GDPR Art. 13-14' },
    { id: 'terms_ai', label: 'Terms Address AI Use', signal: 'privacy_policy.training_opt_out', tier: 'required', legalBasis: 'Art. 50, GDPR Art. 22' },
    { id: 'eu_ai_act_page', label: 'EU AI Act Compliance Page', signal: 'trust.has_eu_ai_act_page', tier: 'best_practice', legalBasis: null },
    { id: 'responsible_ai', label: 'Responsible AI Program', signal: 'trust.has_responsible_ai_page', tier: 'best_practice', legalBasis: null },
    { id: 'bias_audit', label: 'Public Bias Audit', signal: 'web_search.has_public_bias_audit', tier: 'best_practice', legalBasis: null },
    { id: 'transparency_report', label: 'Transparency Report', signal: 'web_search.has_transparency_report', tier: 'best_practice', legalBasis: null },
    { id: 'certifications', label: 'Certifications', signal: 'trust.certifications.length > 0', tier: 'best_practice', legalBasis: null },
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
    return Boolean(val);
  };

  const getNestedValue = (obj, path) => {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || typeof current !== 'object') return undefined;
      current = current[part];
    }
    return current;
  };

  /**
   * Compute weighted grade from threshold table.
   */
  const computeGrade = (weightedPercent) => {
    for (const t of GRADE_THRESHOLDS) {
      if (weightedPercent >= t.min) return t.grade;
    }
    return 'F';
  };

  /**
   * Grade a tool's public documentation based on passive_scan evidence.
   *
   * @param {object} tool - Registry tool with evidence.passive_scan
   * @param {string|null} [roleOverride] - Force a specific role checklist
   * @returns {object} { grade, score, total, percent,
   *   weightedPercent, requiredFound, requiredTotal,
   *   bpFound, bpTotal, items, checklist, gradedAt }
   */
  const grade = (tool, roleOverride) => {
    const ps = (tool.evidence && tool.evidence.passive_scan) || {};
    const role = roleOverride || tool.aiActRole || null;
    const checklistKey = role && CHECKLIST_MAP[role] ? role : 'provider';
    const checklist = CHECKLIST_MAP[checklistKey];

    let found = 0;
    let requiredFound = 0;
    let requiredTotal = 0;
    let bpFound = 0;
    let bpTotal = 0;

    const items = checklist.map((item) => {
      const isFound = resolveSignal(ps, item.signal);
      if (isFound) found++;

      if (item.tier === 'required') {
        requiredTotal++;
        if (isFound) requiredFound++;
      } else {
        bpTotal++;
        if (isFound) bpFound++;
      }

      return {
        id: item.id,
        label: item.label,
        found: isFound,
        signal: item.signal,
        tier: item.tier,
        legalBasis: item.legalBasis || null,
      };
    });

    const total = checklist.length;
    const percent = total > 0 ? Math.round((found / total) * 100) : 0;

    // Weighted scoring: required = 90%, best practice = 10%
    const reqPortion = requiredTotal > 0 ? (requiredFound / requiredTotal) * 90 : 0;
    const bpPortion = bpTotal > 0 ? (bpFound / bpTotal) * 10 : 0;
    const weightedPercent = Math.round(reqPortion + bpPortion);

    return {
      grade: computeGrade(weightedPercent),
      score: found,
      total,
      percent,
      weightedPercent,
      requiredFound,
      requiredTotal,
      bpFound,
      bpTotal,
      items,
      checklist: checklistKey,
      gradedAt: new Date().toISOString(),
    };
  };

  return () => ({ grade });
})()
