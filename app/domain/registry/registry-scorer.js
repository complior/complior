/**
 * Registry Scorer v3.1 — Hybrid Observable Score (Credibility Fix).
 *
 * 11-step pipeline:
 *  1. Load weights + obligation map (cached)
 *  2. Prepare obligations (merge, dedup, enrich from evidence + bonus obligations)
 *  3. Parent→child cascade
 *  4. Obligation-level scoring (severity + penalty-weighted) — unknown = 25/100
 *  5. Category aggregation + completeness bonus
 *  6. Weighted category total
 *  7. Penalties (critical cap, high-severity, GDPR, security) + coverage ceiling
 *  8. Bonuses (EU AI Act page, model card, privacy, ISO 42001, provider tier)
 *  9. Compliance maturity model (5 levels) + coverage gate
 * 10. Confidence interval (unknown 0..75, partially_met 0..100)
 * 11. Percentile ranking (batch mode only)
 *
 * v3.1 fixes: denominator exploit (unknown=25), min obligation gate (<3→null),
 * coverage ceiling, evidence-bonus obligations, provider tier bonuses.
 *
 * 3 metrics: Compliance Score (0-100 | null), Coverage (0-100%), Transparency Grade (A-F)
 *
 * VM sandbox compatible — factory function, all deps injected.
 */
(() => {
  const SEVERITY_POINTS = { critical: 15, high: 10, medium: 5, low: 2 };

  const STATUS_SCORES = {
    met_verified: 100,
    met_unverified: 75,
    met_low_confidence: 65,
    partially_met_high: 60,
    partially_met: 50,
    partially_met_low: 40,
    unknown: 15,
    not_met: 0,
  };

  const GRADE_SCALE = [
    { grade: 'A+', min: 95 }, { grade: 'A', min: 90 }, { grade: 'A-', min: 85 },
    { grade: 'B+', min: 80 }, { grade: 'B', min: 75 }, { grade: 'B-', min: 70 },
    { grade: 'C+', min: 65 }, { grade: 'C', min: 60 }, { grade: 'C-', min: 55 },
    { grade: 'D+', min: 50 }, { grade: 'D', min: 40 }, { grade: 'D-', min: 30 },
    { grade: 'F', min: 0 },
  ];

  const MATURITY_LEVELS = {
    exemplary: { level: 4, label: 'Exemplary' },
    compliant: { level: 3, label: 'Compliant' },
    implementing: { level: 2, label: 'Implementing' },
    aware: { level: 1, label: 'Aware' },
    unaware: { level: 0, label: 'Unaware' },
  };

  // Provider reputation tiers (matches app/config/enrichment.js providerTiers)
  const PROVIDER_TIERS = {
    tier1: new Set([
      'anthropic', 'openai', 'google', 'microsoft', 'meta',
      'amazon', 'nvidia', 'ibm', 'apple', 'samsung',
    ]),
    tier2: new Set([
      'stability ai', 'mistral', 'cohere', 'hugging face', 'adobe',
      'salesforce', 'databricks', 'deepseek', 'bytedance', 'alibaba',
      'baidu', 'tencent', 'sap', 'oracle', 'palantir',
    ]),
  };

  const getProviderTierBonus = (providerName) => {
    if (!providerName) return 0;
    const normalized = providerName.toLowerCase().trim();
    if (PROVIDER_TIERS.tier1.has(normalized)) return 20;
    if (PROVIDER_TIERS.tier2.has(normalized)) return 10;
    return 0;
  };

  const SECTOR_MAP = {
    'hr': 'HR', 'human-resources': 'HR', 'recruiting': 'HR',
    'credit-scoring': 'FIN', 'insurance': 'FIN', 'finance': 'FIN', 'fintech': 'FIN',
    'medical': 'MED', 'health': 'MED', 'healthcare': 'MED',
    'education': 'EDU', 'edtech': 'EDU',
    'biometric': 'BIO', 'face-recognition': 'BIO',
    'law-enforcement': 'LAW',
  };

  const getGrade = (score) => {
    for (const entry of GRADE_SCALE) {
      if (score >= entry.min) return entry.grade;
    }
    return 'F';
  };

  const getZone = (score) => score < 50 ? 'red' : score < 80 ? 'yellow' : 'green';

  const getPenaltyMultiplier = (penaltyText) => {
    if (!penaltyText) return 1.0;
    const text = String(penaltyText);
    if (text.includes('7%') || text.includes('€35') || text.includes('35M')) return 1.3;
    if (text.includes('3%') || text.includes('€15') || text.includes('15M')) return 1.15;
    return 1.0;
  };

  const getUrgencyMultiplier = (deadline) => {
    if (!deadline) return 1.0;
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) return 1.0;
    const today = new Date();
    const daysDiff = (today - deadlineDate) / (1000 * 60 * 60 * 24);

    if (daysDiff > 365) return 1.5;
    if (daysDiff > 180) return 1.3;
    if (daysDiff > 0) return 1.15;
    if (daysDiff > -180) return 1.1;
    return 1.0;
  };

  const getSectorForTool = (categories) => {
    if (!categories || !Array.isArray(categories)) return null;
    for (const cat of categories) {
      for (const [pattern, sector] of Object.entries(SECTOR_MAP)) {
        if (cat.includes(pattern)) return sector;
      }
    }
    return null;
  };

  const computeTransparencySignals = (ps) => {
    const disclosure = ps.disclosure || {};
    const trust = ps.trust || {};
    const privacy = ps.privacy_policy || {};
    const ws = ps.web_search || {};
    const mc = ps.model_card || {};
    const cm = ps.content_marking || {};
    let score = 0;
    if (disclosure.visible) score += 15;
    if (privacy.mentions_ai && privacy.mentions_eu) score += 10;
    const mcSections = [
      mc.has_limitations, mc.has_bias_info,
      mc.has_training_data, mc.has_evaluation,
    ].filter(Boolean).length;
    if (mc.has_model_card && mcSections >= 3) score += 15;
    if (trust.has_responsible_ai_page) score += 10;
    if (trust.has_eu_ai_act_page) score += 15;
    if (ws.has_transparency_report) score += 10;
    if (cm.c2pa || cm.watermark) score += 10;
    if (ws.has_public_bias_audit) score += 10;
    const certs = trust.certifications || [];
    if (certs.includes('ISO 42001')) score += 5;
    return Math.min(score, 100);
  };

  const computeStatusScore = (obl) => {
    const status = obl.status || 'unknown';
    const confidence = typeof obl.confidence === 'number' ? obl.confidence : null;

    if (status === 'met') {
      if (
        obl.evidence_summary
        && confidence !== null && confidence >= 0.8
      ) return STATUS_SCORES.met_verified;
      if (confidence !== null && confidence < 0.5) return STATUS_SCORES.met_low_confidence;
      if (obl.evidence_summary) return STATUS_SCORES.met_verified;
      return STATUS_SCORES.met_unverified;
    }
    if (status === 'partially_met') {
      if (confidence !== null && confidence >= 0.8) return STATUS_SCORES.partially_met_high;
      if (confidence !== null && confidence < 0.3) return STATUS_SCORES.partially_met_low;
      return STATUS_SCORES.partially_met;
    }
    if (status === 'not_met') return STATUS_SCORES.not_met;
    return STATUS_SCORES.unknown; // Unknown = included in denominator at 25/100
  };

  return ({ weights, obligationMap }) => {

    // ── Step 2: Merge obligations with conservative dedup ────────────

    const mergeObligations = (assessment, enrichedObligations) => {
      const merged = {};
      const deployer = assessment.deployer_obligations || [];
      const provider = assessment.provider_obligations || [];

      // Process all obligations
      for (const obl of [...deployer, ...provider]) {
        if (!obl.obligation_id) continue;

        if (!merged[obl.obligation_id]) {
          merged[obl.obligation_id] = { ...obl };
        } else {
          const existing = merged[obl.obligation_id];
          // Conservative merge: take WORST status
          const statusOrder = { not_met: 0, unknown: 1, partially_met: 2, met: 3 };
          const existingOrder = statusOrder[existing.status || 'unknown'] ?? 1;
          const newOrder = statusOrder[obl.status || 'unknown'] ?? 1;

          if (newOrder < existingOrder) {
            // New status is worse — use it, but keep evidence if the other had it
            const evidenceSummary = existing.evidence_summary || obl.evidence_summary;
            merged[obl.obligation_id] = { ...obl, evidence_summary: evidenceSummary };
            if (existing.evidence_summary && obl.evidence_summary) {
              // Both have evidence but disagree — penalty
              merged[obl.obligation_id].confidence =
                (merged[obl.obligation_id].confidence || 0.5) * 0.8;
            }
          } else if (obl.evidence_summary && !existing.evidence_summary) {
            // Same or better status but new has evidence — take it
            merged[obl.obligation_id] = { ...obl };
          }
        }
      }

      // Add missing from applicable_obligation_ids
      const applicableIds = assessment.applicable_obligation_ids || [];
      for (const id of applicableIds) {
        if (!merged[id]) {
          merged[id] = { obligation_id: id, status: 'unknown', evidence_summary: null };
        }
      }

      // Apply evidence-derived statuses
      if (enrichedObligations) {
        for (const [oblId, derived] of Object.entries(enrichedObligations)) {
          const existing = merged[oblId];

          // Evidence-bonus: obligations not in applicable list but with non-unknown evidence
          if (!existing) {
            if (derived.status && derived.status !== 'unknown') {
              merged[oblId] = {
                obligation_id: oblId,
                status: derived.status,
                confidence: (derived.confidence || 0.5) * 0.8,
                evidence_summary: derived.evidence_summary,
                statusSource: 'evidence_bonus',
                evidenceSignals: derived.signals || [],
                isBonus: true,
              };
            }
            continue;
          }

          const existingStatus = existing.status || 'unknown';
          const derivedConfidence = derived.confidence || 0;
          const existingConfidence = existing.confidence || 0;

          // Safety downgrade is always allowed
          if (derived.isDowngrade) {
            merged[oblId] = {
              ...existing,
              status: derived.status,
              confidence: derivedConfidence,
              evidence_summary: derived.evidence_summary,
              statusSource: 'evidence_derived',
              evidenceSignals: derived.signals || [],
              contradictions: derived.contradictions || null,
            };
            continue;
          }

          // Otherwise: upgrade only, or higher confidence wins
          if (derivedConfidence > existingConfidence || (existingStatus === 'unknown' && derived.status !== 'unknown')) {
            const statusOrderMap = { unknown: 0, partially_met: 1, met: 2 };
            const canUpgrade =
              (statusOrderMap[derived.status] ?? 0)
              >= (statusOrderMap[existingStatus] ?? 0);

            if (canUpgrade || derivedConfidence > existingConfidence) {
              merged[oblId] = {
                ...existing,
                status: derived.status,
                confidence: derivedConfidence,
                evidence_summary: derived.evidence_summary || existing.evidence_summary,
                statusSource: 'evidence_derived',
                evidenceSignals: derived.signals || [],
                contradictions: derived.contradictions || null,
              };
            }
          }
        }
      }

      return merged;
    };

    // ── Step 3: Parent→Child Cascade ────────────────────────────────

    const applyParentChildCascade = (merged, obligationMap) => {
      for (const [oblId, obl] of Object.entries(merged)) {
        const meta = obligationMap[oblId] || obligationMap['eu-ai-act-' + oblId];
        if (!meta || !meta.parentObligation) continue;

        const parentId = meta.parentObligation;
        const parent = merged[parentId];
        if (!parent) continue;

        const parentStatus = parent.status || 'unknown';

        if (parentStatus === 'not_met') {
          // Child cannot be 'met' if parent is not_met
          if (obl.status === 'met') {
            obl.status = 'partially_met';
            obl.confidence = (obl.confidence || 0.5) * 0.5;
            obl.parentCascade = `Parent ${parentId} is not_met — capped`;
          }
        } else if (parentStatus === 'met') {
          // Child inherits confidence boost
          obl.confidence = Math.min(1.0, (obl.confidence || 0.5) + 0.1);
          obl.parentCascade = `Parent ${parentId} is met — boosted`;
        }

        obl.parentId = parentId;
        obl.parentStatus = parentStatus;
      }
    };

    // ── Core calculate ──────────────────────────────────────────────

    return {
      calculate(tool, enrichedObligations, providerCorrelation) {

        const assessment = (tool.assessments && tool.assessments['eu-ai-act']) || {};

        // Derive applicable obligations from obligationMap + riskLevel if not pre-set
        let applicableIds = assessment.applicable_obligation_ids;
        if (!applicableIds || applicableIds.length === 0) {
          const toolRisk = (assessment.risk_level || tool.riskLevel || 'limited').toLowerCase();
          applicableIds = Object.keys(obligationMap).filter((oblId) => {
            const obl = obligationMap[oblId];
            if (!obl.appliesToRiskLevel) return true; // universal obligation
            const appliesTo = obl.appliesToRiskLevel.toLowerCase();
            if (appliesTo === 'all') return true;
            if (toolRisk === 'high') return true; // high-risk tools get ALL obligations
            if (toolRisk === 'limited' && (appliesTo === 'limited' || appliesTo === 'minimal')) return true;
            if (toolRisk === 'minimal' && appliesTo === 'minimal') return true;
            return appliesTo === toolRisk;
          });
        }

        if (applicableIds.length === 0) {
          return { score: null, reason: 'no_applicable_obligations' };
        }

        // Ensure assessment has applicable_obligation_ids for mergeObligations
        if (!assessment.applicable_obligation_ids) {
          assessment.applicable_obligation_ids = applicableIds;
        }

        const evidence = tool.evidence || {};
        const ps = evidence.passive_scan || {};
        const trust = ps.trust || {};
        const privacy = ps.privacy_policy || {};
        const ws = ps.web_search || {};
        const mc = ps.model_card || {};

        // Extract provider name early (needed for min gate + tier bonus)
        let providerName = null;
        if (tool.provider) {
          if (typeof tool.provider === 'string') {
            try {
              providerName = JSON.parse(tool.provider).name;
            } catch {
              providerName = tool.provider;
            }
          } else {
            providerName = tool.provider.name;
          }
        }

        // Step 2: Merge + enrich
        const derivedOblMap = enrichedObligations
          ? enrichedObligations.derivedObligations || {}
          : {};
        const merged = mergeObligations(assessment, derivedOblMap);

        // Step 3: Parent→Child cascade
        applyParentChildCascade(merged, obligationMap);

        // Step 4: Obligation-level scoring
        const toolSector = getSectorForTool(tool.categories);
        const categoryGroups = {};
        const counts = { total: 0, met: 0, not_met: 0, unknown: 0, partially_met: 0, bonus: 0 };
        let criticalCapApplied = false;
        const obligationDetails = [];

        for (const [oblId, obl] of Object.entries(merged)) {
          const meta = obligationMap[oblId] || obligationMap['eu-ai-act-' + oblId];
          if (!meta || !meta.category) continue;

          const status = obl.status || 'unknown';
          const baseScore = computeStatusScore(obl);
          const severityWeight = SEVERITY_POINTS[meta.severity] || 2;

          // Deadline urgency (only for not_met/unknown)
          let urgencyMultiplier = 1.0;
          if ((status === 'not_met' || status === 'unknown') && meta.deadline) {
            urgencyMultiplier = getUrgencyMultiplier(meta.deadline);
          }

          // Sector multiplier
          let sectorMultiplier = 1.0;
          if (toolSector && oblId.includes('OBL-' + toolSector)) {
            sectorMultiplier = 1.25;
          }

          // Penalty multiplier
          const penaltyMultiplier = getPenaltyMultiplier(meta.penaltyForNonCompliance);

          const effectiveSeverityWeight =
            severityWeight * urgencyMultiplier
            * sectorMultiplier * penaltyMultiplier;
          const weightedScore = baseScore * effectiveSeverityWeight;
          const maxScore = 100 * effectiveSeverityWeight;

          counts.total++;
          if (status === 'met') counts.met++;
          else if (status === 'not_met') counts.not_met++;
          else if (status === 'partially_met') counts.partially_met++;
          else counts.unknown++;
          if (obl.isBonus) counts.bonus++;

          if (!categoryGroups[meta.category]) {
            categoryGroups[meta.category] = {
              earned: 0, max: 0,
              weight: weights[meta.category] || 0,
              obligations: [],
            };
          }

          // Always add to category math (unknowns count as 25/100)
          categoryGroups[meta.category].earned += weightedScore;
          categoryGroups[meta.category].max += maxScore;
          categoryGroups[meta.category].obligations.push({ oblId, status });

          // Critical cap check
          if (meta.severity === 'critical' && status === 'not_met') {
            criticalCapApplied = true;
          }

          // Compute deadline info
          let isOverdue = false;
          let daysOverdue = null;
          if (meta.deadline) {
            const deadlineDate = new Date(meta.deadline);
            if (!isNaN(deadlineDate.getTime())) {
              const daysDiff = (new Date() - deadlineDate) / (1000 * 60 * 60 * 24);
              if (daysDiff > 0) {
                isOverdue = true;
                daysOverdue = Math.round(daysDiff);
              }
            }
          }

          obligationDetails.push({
            id: oblId,
            severity: meta.severity,
            category: meta.category,
            originalStatus: (obl.statusSource === 'evidence_derived') ? (obl._originalStatus || status) : status,
            derivedStatus: status,
            statusSource: obl.statusSource || 'original',
            confidence: obl.confidence || null,
            baseScore,
            severityWeight,
            urgencyMultiplier,
            sectorMultiplier,
            penaltyMultiplier,
            effectiveWeight: effectiveSeverityWeight,
            weightedScore,
            maxWeightedScore: maxScore,
            evidenceSignals: obl.evidenceSignals || [],
            contradictions: obl.contradictions || null,
            parentId: obl.parentId || null,
            parentStatus: obl.parentStatus || null,
            deadline: meta.deadline || null,
            isOverdue,
            daysOverdue,
          });
        }

        if (counts.total === 0) {
          return { score: null, reason: 'no_mapped_obligations' };
        }

        // Coverage: assessed applicable (non-bonus) vs applicable count (floor 5)
        // Bonus obligations are extra credit — they don't inflate the compliance surface
        counts.assessed = counts.met + counts.partially_met + counts.not_met;
        const applicableAssessed = counts.assessed - counts.bonus;
        const coverageDenom = Math.max(applicableIds.length, 5);
        const coverage = coverageDenom > 0
          ? Math.min(100, Math.round(
            (applicableAssessed / coverageDenom) * 100,
          ))
          : 0;

        // Compute transparency regardless
        const transparencyScore = computeTransparencySignals(ps);
        const transparencyGrade = getGrade(transparencyScore);

        const nullScoreResult = (reason) => ({
          score: null,
          reason,
          grade: null,
          zone: null,
          coverage,
          transparencyScore,
          transparencyGrade,
          algorithm: 'deterministic-v3.1',
          counts,
          obligationDetails,
          maturity: { level: 0, label: 'Unaware', criteria: 'unaware' },
          confidenceInterval: null,
          penalties: null,
          bonuses: null,
          categoryScores: {},
          scoredAt: new Date().toISOString(),
        });

        // Minimum obligation gate: need at least 3 applicable obligations
        // Tiered providers (tier 1/2) exempt — known tools with compliance investment
        const providerTier = getProviderTierBonus(providerName);
        if (applicableIds.length < 3 && providerTier === 0) {
          return nullScoreResult('too_few_obligations');
        }

        // Insufficient data gate: 0 assessed → null score (tiered providers exempt)
        if (counts.assessed === 0 && providerTier === 0) {
          return nullScoreResult('insufficient_data');
        }

        // Step 5: Category aggregation + completeness bonus
        const categoryScores = {};
        for (const [cat, group] of Object.entries(categoryGroups)) {
          let percent = group.max > 0 ? (group.earned / group.max) * 100 : 0;

          // Category completeness bonus
          const metCount = group.obligations.filter((o) => o.status === 'met').length;
          const totalInCat = group.obligations.length;
          const metRatio = totalInCat > 0 ? metCount / totalInCat : 0;
          let completenessBonus = false;

          if (metRatio === 1.0 && totalInCat > 0) {
            percent = Math.min(100, percent * 1.05);
            completenessBonus = true;
          } else if (metRatio >= 0.8) {
            percent = Math.min(100, percent * 1.02);
            completenessBonus = true;
          }

          categoryScores[cat] = {
            earned: Math.round(group.earned * 100) / 100,
            maxPossible: Math.round(group.max * 100) / 100,
            percent: Math.round(percent * 100) / 100,
            weight: group.weight,
            obligationCount: totalInCat,
            completenessBonus,
          };
        }

        // Step 6: Weighted total
        let weightedSum = 0;
        let activeWeightSum = 0;
        for (const [, cs] of Object.entries(categoryScores)) {
          const w = cs.weight;
          if (w > 0) {
            weightedSum += cs.percent * w;
            activeWeightSum += w;
          }
        }

        let rawScore = activeWeightSum > 0 ? weightedSum / activeWeightSum : 0;

        // Step 7: Penalties
        const penalties = {
          criticalCap: false,
          highSeverityPenalty: 0,
          gdprEnforcement: 0,
          securityIncidents: 0,
          lowCoverage: false,
          total: 0,
        };

        // 7a: Critical cap
        if (criticalCapApplied) {
          rawScore = Math.min(rawScore, 40);
          penalties.criticalCap = true;
        }

        // 7b: High-severity penalty
        const highObls = obligationDetails.filter((o) => o.severity === 'high');
        const highNotMet = highObls.filter((o) => o.derivedStatus === 'not_met').length;
        if (highObls.length > 0 && highNotMet > highObls.length * 0.5) {
          rawScore = Math.max(0, rawScore - 10);
          penalties.highSeverityPenalty = 10;
        }

        // 7c: GDPR enforcement history
        const gdprHistory = ws.gdpr_enforcement_history;
        if (gdprHistory && Array.isArray(gdprHistory) && gdprHistory.length > 0) {
          const penalty = Math.min(gdprHistory.length * 3, 8);
          rawScore = Math.max(0, rawScore - penalty);
          penalties.gdprEnforcement = penalty;
        }

        // 7d: Security incidents
        const incidents = ws.security_incidents;
        if (incidents && Array.isArray(incidents) && incidents.length > 0) {
          const penalty = Math.min(incidents.length * 2, 5);
          rawScore = Math.max(0, rawScore - penalty);
          penalties.securityIncidents = penalty;
        }

        // 7e: Coverage ceiling — score cannot exceed 25 + coverage × 1.5
        const coverageCeiling = Math.min(100, 25 + coverage * 1.5);
        if (rawScore > coverageCeiling) {
          rawScore = coverageCeiling;
          penalties.lowCoverage = true;
        }

        penalties.total = (penalties.criticalCap ? Math.max(0, 40 - rawScore) : 0) +
          penalties.highSeverityPenalty + penalties.gdprEnforcement + penalties.securityIncidents;

        // Step 8: Bonuses
        const bonuses = {
          euAiActPage: 0, aiActMention: 0, modelCard: 0,
          privacyExcellence: 0, transparencyReport: 0, iso42001: 0,
          providerTier: 0,
          total: 0,
        };
        let evidenceBonus = 0;

        if (trust.has_eu_ai_act_page) { bonuses.euAiActPage = 3; evidenceBonus += 3; }
        if (trust.mentions_ai_act) { bonuses.aiActMention = 2; evidenceBonus += 2; }

        const mcSections = [
          mc.has_limitations, mc.has_bias_info,
          mc.has_training_data, mc.has_evaluation,
        ].filter(Boolean).length;
        if (mc.has_model_card && mcSections >= 3) { bonuses.modelCard = 3; evidenceBonus += 3; }

        if (privacy.training_opt_out && privacy.deletion_right && privacy.retention_specified) {
          bonuses.privacyExcellence = 2; evidenceBonus += 2;
        }

        if (ws.has_transparency_report) { bonuses.transparencyReport = 1; evidenceBonus += 1; }

        const certs = trust.certifications || [];
        if (certs.includes('ISO 42001')) { bonuses.iso42001 = 2; evidenceBonus += 2; }

        // Provider tier bonus (providerName extracted earlier)
        bonuses.providerTier = providerTier;

        // Cap: evidence bonuses max 10, provider tier max 20, total max 30
        const cappedEvidenceBonus = Math.min(evidenceBonus, 10);
        bonuses.total = cappedEvidenceBonus + bonuses.providerTier;
        rawScore = Math.min(100, rawScore + bonuses.total);

        const finalScore = Math.round(rawScore);
        const grade = getGrade(finalScore);
        const zone = getZone(finalScore);

        // Step 9: Maturity Model
        const metAndPartialRatio = counts.total > 0
          ? (counts.met + counts.partially_met) / counts.total
          : 0;
        const metRatioTotal = counts.total > 0 ? counts.met / counts.total : 0;
        const evidenceRatio = obligationDetails.filter((o) =>
          o.derivedStatus === 'met' && (o.evidenceSignals.length > 0 || o.statusSource !== 'original'),
        ).length / Math.max(1, counts.met);

        const hasDisclosure = Boolean(ps.disclosure && ps.disclosure.visible);
        const hasResponsibleAiPage = Boolean(trust.has_responsible_ai_page);
        const privacyMentionsAi = Boolean(privacy.mentions_ai);
        const hasAnyEvidence = (
          enrichedObligations
          && enrichedObligations.evidenceQuality > 0
        ) || false;

        let maturityKey = 'unaware';
        if (
          bonuses.euAiActPage && bonuses.iso42001
          && metRatioTotal >= 0.9 && !criticalCapApplied
        ) {
          maturityKey = 'exemplary';
        } else if (metAndPartialRatio >= 0.75 && !criticalCapApplied && evidenceRatio >= 0.6) {
          maturityKey = 'compliant';
        } else if (metAndPartialRatio >= 0.4 && hasAnyEvidence) {
          maturityKey = 'implementing';
        } else if (hasDisclosure || hasResponsibleAiPage || privacyMentionsAi) {
          maturityKey = 'aware';
        }

        // Coverage gate: cannot be "compliant" with <30% coverage
        if (coverage < 30 && maturityKey === 'compliant') maturityKey = 'implementing';
        if (coverage < 30 && maturityKey === 'exemplary') maturityKey = 'compliant';

        const maturity = {
          level: MATURITY_LEVELS[maturityKey].level,
          label: MATURITY_LEVELS[maturityKey].label,
          criteria: maturityKey,
        };

        // Step 10: Confidence Interval — unknowns vary 0..75, partially_met vary 0..100
        const unknownRatio = counts.total > 0 ? counts.unknown / counts.total : 0;

        let optimisticEarned = 0;
        let optimisticMax = 0;
        let pessimisticEarned = 0;
        let pessimisticMax = 0;

        for (const [cat, group] of Object.entries(categoryGroups)) {
          let optEarned = 0;
          let pesEarned = 0;
          let max = 0;

          for (const oblInfo of group.obligations) {
            const detail = obligationDetails.find((d) => d.id === oblInfo.oblId);
            if (!detail) continue;

            if (oblInfo.status === 'unknown') {
              // Optimistic: unknown could be met_unverified (75)
              optEarned += 75 * detail.effectiveWeight;
              // Pessimistic: unknown could be not_met (0)
              pesEarned += 0;
            } else if (oblInfo.status === 'partially_met') {
              // Optimistic: treat partially_met as met (100)
              optEarned += 100 * detail.effectiveWeight;
              // Pessimistic: treat partially_met as not_met (0)
              pesEarned += 0;
            } else {
              optEarned += detail.weightedScore;
              pesEarned += detail.weightedScore;
            }
            max += detail.maxWeightedScore;
          }

          const w = categoryScores[cat] ? categoryScores[cat].weight : 0;
          if (w > 0 && max > 0) {
            optimisticEarned += (optEarned / max) * 100 * w;
            optimisticMax += w;
            pessimisticEarned += (pesEarned / max) * 100 * w;
            pessimisticMax += w;
          }
        }

        const optimisticScore = optimisticMax > 0
          ? Math.min(100, Math.round(optimisticEarned / optimisticMax))
          : finalScore;
        const pessimisticScore = pessimisticMax > 0
          ? Math.max(0, Math.round(pessimisticEarned / pessimisticMax))
          : finalScore;

        const confidenceInterval = {
          low: pessimisticScore,
          mid: finalScore,
          high: optimisticScore,
          width: optimisticScore - pessimisticScore,
          unknownRatio: Math.round(unknownRatio * 100) / 100,
        };

        // Numerical confidence
        const baseConfidence = { verified: 0.9, scanned: 0.6, classified: 0.2 }[tool.level] || 0.3;
        const evidenceQuality = enrichedObligations ? enrichedObligations.evidenceQuality || 0 : 0;
        const evidenceAdj = evidenceQuality * 0.1;

        // Reputation score
        let reputationScore = 0;
        if (ws.has_transparency_report) reputationScore += 1;
        if ((ps.social || {}).estimated_company_size === 'enterprise') reputationScore += 0.5;
        if (certs.length >= 2) reputationScore += 1;
        if ((ws.eu_ai_act_media_mentions || 0) > 10) reputationScore += 0.5;
        if (gdprHistory && gdprHistory.length > 0) {
          reputationScore -= Math.min(gdprHistory.length, 2);
        }
        if (incidents && incidents.length > 0) {
          reputationScore -= Math.min(incidents.length * 0.5, 1.5);
        }
        reputationScore = Math.max(-3, Math.min(3, reputationScore));
        const reputationAdj = reputationScore * 0.05;

        const confidence = Math.max(
          0.05, Math.min(1.0, baseConfidence + evidenceAdj + reputationAdj),
        );

        return {
          score: finalScore,
          grade,
          zone,
          coverage,
          transparencyScore,
          transparencyGrade,
          confidence: Math.round(confidence * 100) / 100,
          algorithm: 'deterministic-v3.1',

          maturity,
          confidenceInterval,

          penalties,
          bonuses,
          categoryScores,

          obligationDetails,
          counts,

          evidenceQuality,
          evidenceFreshness: enrichedObligations
            ? enrichedObligations.evidenceFreshness || 1.0
            : 1.0,
          reputationScore: Math.round(reputationScore * 100) / 100,

          providerCorrelation: providerCorrelation || {
            inherited: false,
            referenceToolSlug: null,
            inheritedSignals: [],
          },

          percentiles: null,

          criticalCapApplied,
          scoredAt: new Date().toISOString(),
        };
      },

      // ── Percentile Ranking (batch mode) ─────────────────────────────

      computePercentiles(scoredTools) {
        // Build cohorts
        const byRiskLevel = {};
        const byCategory = {};
        const byProvider = {};

        for (const item of scoredTools) {
          const tool = item.tool || item;
          const score = item.score ?? item._score;
          if (score === null || score === undefined) continue;

          const assessment = tool.assessments && tool.assessments['eu-ai-act'];
          const riskLevel = (assessment && assessment.risk_level) || tool.riskLevel || 'unknown';
          const cats = tool.categories || [];
          let providerName = 'Unknown';
          if (tool.provider) {
            if (typeof tool.provider === 'string') {
              try { providerName = JSON.parse(tool.provider).name || 'Unknown'; } catch { providerName = tool.provider; }
            } else {
              providerName = tool.provider.name || 'Unknown';
            }
          }

          const entry = { slug: tool.slug || tool.name, score };

          if (!byRiskLevel[riskLevel]) byRiskLevel[riskLevel] = [];
          byRiskLevel[riskLevel].push(entry);

          for (const cat of cats) {
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(entry);
          }

          if (!byProvider[providerName]) byProvider[providerName] = [];
          byProvider[providerName].push(entry);
        }

        const computePercentile = (cohort, slug) => {
          if (cohort.length < 2) return null;
          const sorted = [...cohort].sort((a, b) => a.score - b.score);
          const idx = sorted.findIndex((e) => e.slug === slug);
          if (idx === -1) return null;
          return {
            cohort: null,
            rank: cohort.length - idx,
            total: cohort.length,
            percentile: Math.round((idx / (cohort.length - 1)) * 100),
          };
        };

        const results = {};
        for (const item of scoredTools) {
          const tool = item.tool || item;
          const slug = tool.slug || tool.name;
          const assessment = tool.assessments && tool.assessments['eu-ai-act'];
          const riskLevel = (assessment && assessment.risk_level) || tool.riskLevel || 'unknown';
          const cats = tool.categories || [];
          let providerName = 'Unknown';
          if (tool.provider) {
            if (typeof tool.provider === 'string') {
              try { providerName = JSON.parse(tool.provider).name || 'Unknown'; } catch { providerName = tool.provider; }
            } else {
              providerName = tool.provider.name || 'Unknown';
            }
          }

          const rl = computePercentile(byRiskLevel[riskLevel] || [], slug);
          if (rl) rl.cohort = riskLevel;

          const primaryCat = cats[0] || null;
          const cp = primaryCat ? computePercentile(byCategory[primaryCat] || [], slug) : null;
          if (cp) cp.cohort = primaryCat;

          const pp = computePercentile(byProvider[providerName] || [], slug);
          if (pp) pp.cohort = providerName;

          results[slug] = {
            withinRiskLevel: rl,
            withinCategory: cp,
            withinProvider: pp,
          };
        }

        return results;
      },
    };
  };
})()
