/**
 * Procurement Scorer — "Should I use this tool?" weighted blend.
 *
 * Procurement score = weighted combination of:
 *   - EU AI Act compliance score (40%)
 *   - Vendor transparency grade (25%)
 *   - Data residency (15%)
 *   - Vendor verified status (10%)
 *   - GDPR indicators (10%)
 *
 * VM sandbox compatible — IIFE returns factory function.
 */
(() => {
  const WEIGHTS = {
    compliance: 0.40,
    transparency: 0.25,
    dataResidency: 0.15,
    vendorVerified: 0.10,
    gdpr: 0.10,
  };

  const GRADE_SCORES = {
    'A+': 95, 'A': 90, 'A-': 85,
    'B+': 80, 'B': 75, 'B-': 70,
    'C+': 65, 'C': 60, 'C-': 55,
    'D+': 50, 'D': 45, 'D-': 40,
    'E': 30, 'F': 15,
  };

  const RESIDENCY_SCORES = {
    eu: 100,
    eea: 90,
    adequate: 75,   // Countries with EU adequacy decision
    us: 50,          // US — no adequacy, but DPF
    unknown: 25,
    other: 30,
  };

  /**
   * Classify data residency from tool data.
   */
  const classifyResidency = (tool) => {
    const dr = (tool.dataResidency || '').toLowerCase();
    const vendor = tool.vendorReport || {};
    const vendorDR = (vendor.data_residency || '').toLowerCase();
    const combined = dr || vendorDR;

    if (!combined) return 'unknown';
    if (['eu', 'europe', 'germany', 'france', 'ireland', 'netherlands'].some(
      (r) => combined.includes(r),
    )) return 'eu';
    if (['eea', 'norway', 'iceland', 'liechtenstein'].some(
      (r) => combined.includes(r),
    )) return 'eea';
    if (['us', 'united states', 'usa'].some(
      (r) => combined.includes(r),
    )) return 'us';
    return 'other';
  };

  /**
   * GDPR indicators score.
   */
  const computeGdprScore = (evidence) => {
    if (!evidence) return 0;
    const ps = evidence.passive_scan || {};
    const privacy = ps.privacy || {};
    let score = 0;

    if (privacy.gdpr_mention) score += 25;
    if (privacy.dpo_listed) score += 20;
    if (privacy.data_retention) score += 15;
    if (privacy.deletion_right) score += 20;
    if (privacy.training_opt_out) score += 10;
    if (privacy.retention_specified) score += 10;

    return Math.min(score, 100);
  };

  return () => {
    return {
      /**
       * Calculate procurement safety score.
       *
       * @param {Object} tool - Registry tool with assessments + evidence
       * @param {Object} scoreData - { score, grade, transparencyGrade, confidence }
       * @returns {{ score, breakdown, recommendation }}
       */
      calculateProcurementScore(tool, scoreData) {
        const compliance = scoreData ? scoreData.score || 0 : 0;
        const transparencyGrade = scoreData ? scoreData.transparencyGrade || 'F' : 'F';
        const transparencyScore = GRADE_SCORES[transparencyGrade] || 15;

        const residencyType = classifyResidency(tool);
        const residencyScore = RESIDENCY_SCORES[residencyType] || 25;

        const vendorScore = tool.vendorVerified ? 100 : (
          tool.trustLevel === 'community_reported' ? 50 : 0
        );

        const gdprScore = computeGdprScore(tool.evidence);

        // Weighted blend
        const total = Math.round(
          compliance * WEIGHTS.compliance
          + transparencyScore * WEIGHTS.transparency
          + residencyScore * WEIGHTS.dataResidency
          + vendorScore * WEIGHTS.vendorVerified
          + gdprScore * WEIGHTS.gdpr,
        );

        // Recommendation
        let recommendation;
        if (total >= 75) recommendation = 'recommended';
        else if (total >= 50) recommendation = 'acceptable_with_measures';
        else if (total >= 30) recommendation = 'use_with_caution';
        else recommendation = 'not_recommended';

        return {
          score: total,
          recommendation,
          breakdown: {
            compliance: { score: compliance, weight: WEIGHTS.compliance },
            transparency: {
              grade: transparencyGrade,
              score: transparencyScore,
              weight: WEIGHTS.transparency,
            },
            dataResidency: {
              type: residencyType,
              score: residencyScore,
              weight: WEIGHTS.dataResidency,
            },
            vendorVerified: {
              verified: Boolean(tool.vendorVerified),
              trustLevel: tool.trustLevel || 'auto_assessed',
              score: vendorScore,
              weight: WEIGHTS.vendorVerified,
            },
            gdpr: { score: gdprScore, weight: WEIGHTS.gdpr },
          },
        };
      },
    };
  };
})()
