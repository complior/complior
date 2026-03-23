/**
 * Score Validator v3 — Quality validation + anomaly detection for registry scores.
 *
 * VM sandbox compatible — factory function, all deps injected.
 *
 * 11 checks:
 *  1. Family consistency — flag outliers within same provider
 *  2. Risk-score sanity — flag impossible score/risk combinations (v3: null for all-unknown)
 *  3. Evidence completeness — flag tools missing expected evidence
 *  4. Statistical outlier — flag 2σ outliers per cohort
 *  5. Grade-score consistency — grade must match score range
 *  6. Evidence-override audit — flag excessive overrides
 *  7. Deadline urgency audit — flag overdue unknown obligations
 *  8. Confidence floor/ceiling — flag implausible confidence values
 *  9. Confidence interval width — flag overly wide/narrow intervals (v3: threshold 50)
 * 10. Maturity-score coherence — maturity must match score/state
 * 11. Coverage-score coherence — high score with low coverage is suspicious
 */
(() => {
  const GRADE_BOUNDARIES = {
    'A+': 95, A: 90, 'A-': 85,
    'B+': 80, B: 75, 'B-': 70,
    'C+': 65, C: 60, 'C-': 55,
    'D+': 50, D: 40, 'D-': 30,
    F: 0,
  };

  const parseProvider = (provider) => {
    if (!provider) return 'Unknown';
    if (typeof provider === 'string') {
      try { return JSON.parse(provider).name || 'Unknown'; } catch { return provider; }
    }
    return provider.name || 'Unknown';
  };

  const median = (arr) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const mean = (arr) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  const stddev = (arr) => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length;
    return Math.sqrt(variance);
  };

  return ({ db }) => {
    let obligationMapCache = null;

    const loadObligationMap = async () => {
      if (obligationMapCache) return obligationMapCache;
      const result = await db.query(
        `SELECT "obligationIdUnique", category, severity, deadline, "parentObligation"
         FROM "Obligation"`,
      );
      const rows = result.rows || result;
      const map = {};
      for (const row of rows) {
        map[row.obligationIdUnique] = {
          category: row.category,
          severity: row.severity,
          deadline: row.deadline || null,
          parentObligation: row.parentObligation || null,
        };
      }
      obligationMapCache = map;
      return map;
    };

    // ── Check 1: Family Consistency ─────────────────────────────────

    const checkFamilyConsistency = (tools) => {
      const anomalies = [];
      const byProvider = {};

      for (const tool of tools) {
        const prov = parseProvider(tool.provider);
        if (!byProvider[prov]) byProvider[prov] = [];
        byProvider[prov].push(tool);
      }

      for (const [prov, group] of Object.entries(byProvider)) {
        if (group.length < 3) continue;
        const scores = group.map((t) => t._score).filter((s) => s !== null && s !== undefined);
        if (scores.length < 3) continue;
        const med = median(scores);

        for (const tool of group) {
          if (tool._score === null || tool._score === undefined) continue;
          const diff = Math.abs(tool._score - med);
          if (diff > 25) {
            anomalies.push({
              tool: tool.name || tool.slug,
              check: 'family_consistency',
              severity: 'warning',
              message: `${prov}: ${tool.name} (${tool._score}) is ${diff} pts from family median (${med})`,
            });
          }
        }
      }

      return anomalies;
    };

    // ── Check 2: Risk-Score Sanity ──────────────────────────────────

    const checkRiskScoreSanity = (tools, obligationMap) => {
      const anomalies = [];

      for (const tool of tools) {
        if (tool._score === null || tool._score === undefined) continue;
        const assessment = tool.assessments && tool.assessments['eu-ai-act'];
        if (!assessment) continue;

        const riskLevel = assessment.risk_level || tool.riskLevel;
        const allObls = [
          ...(assessment.deployer_obligations || []),
          ...(assessment.provider_obligations || []),
        ];

        if (riskLevel === 'high') {
          const allUnknown = allObls.every((o) => !o.status || o.status === 'unknown');
          if (allUnknown && tool._score !== null) {
            anomalies.push({
              tool: tool.name || tool.slug,
              check: 'risk_score_sanity',
              severity: 'error',
              message: `High-risk tool with all-unknown obligations should have null score, got ${tool._score}`,
            });
          }
        }

        if (tool._score > 80) {
          for (const obl of allObls) {
            const meta = obligationMap[obl.obligation_id] || obligationMap['eu-ai-act-' + obl.obligation_id];
            if (meta && meta.severity === 'critical' && obl.status === 'not_met') {
              anomalies.push({
                tool: tool.name || tool.slug,
                check: 'risk_score_sanity',
                severity: 'error',
                message: `Score ${tool._score} but critical obligation ${obl.obligation_id} is not_met`,
              });
              break;
            }
          }
        }
      }

      return anomalies;
    };

    // ── Check 3: Evidence Completeness ──────────────────────────────

    const checkEvidenceCompleteness = (tools, obligationMap) => {
      const anomalies = [];

      for (const tool of tools) {
        const assessment = tool.assessments && tool.assessments['eu-ai-act'];
        if (!assessment) continue;

        const allObls = [
          ...(assessment.deployer_obligations || []),
          ...(assessment.provider_obligations || []),
        ];
        const metObls = allObls.filter((o) => o.status === 'met');
        if (metObls.length === 0) continue;

        const withEvidence = metObls.filter((o) => o.evidence_summary);
        const ratio = withEvidence.length / metObls.length;

        const level = tool.level || 'classified';
        const threshold = level === 'verified' ? 0.8 : level === 'scanned' ? 0.5 : 0;

        if (threshold > 0 && ratio < threshold) {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'evidence_completeness',
            severity: 'error',
            message: `${level} tool: ${Math.round(ratio * 100)}% of met obligations have evidence (threshold: ${threshold * 100}%)`,
          });
        }

        for (const obl of metObls) {
          const meta = obligationMap[obl.obligation_id] || obligationMap['eu-ai-act-' + obl.obligation_id];
          if (meta && meta.severity === 'critical' && !obl.evidence_summary) {
            anomalies.push({
              tool: tool.name || tool.slug,
              check: 'evidence_completeness',
              severity: 'error',
              message: `Critical obligation ${obl.obligation_id} marked met without evidence`,
            });
          }
        }
      }

      return anomalies;
    };

    // ── Check 4: Statistical Outlier ────────────────────────────────

    const checkStatisticalOutlier = (tools) => {
      const anomalies = [];
      const cohorts = {};

      for (const tool of tools) {
        if (tool._score === null || tool._score === undefined) continue;
        const assessment = tool.assessments && tool.assessments['eu-ai-act'];
        const riskLevel = (assessment && assessment.risk_level) || tool.riskLevel || 'unknown';
        const level = tool.level || 'classified';
        const key = `${riskLevel}:${level}`;

        if (!cohorts[key]) cohorts[key] = [];
        cohorts[key].push(tool);
      }

      for (const [, group] of Object.entries(cohorts)) {
        if (group.length < 5) continue;
        const scores = group.map((t) => t._score);
        const m = mean(scores);
        const sd = stddev(scores);
        if (sd === 0) continue;

        for (const tool of group) {
          if (Math.abs(tool._score - m) > 2 * sd) {
            anomalies.push({
              tool: tool.name || tool.slug,
              check: 'statistical_outlier',
              severity: 'warning',
              message: `Score ${tool._score} is >2σ from cohort mean ${Math.round(m)} (σ=${Math.round(sd)})`,
            });
          }
        }
      }

      return anomalies;
    };

    // ── Check 5: Grade-Score Consistency ─────────────────────────────

    const checkGradeScoreConsistency = (tools) => {
      const anomalies = [];

      for (const tool of tools) {
        const scoring = tool._scoring || {};
        const grade = scoring.grade;
        const score = tool._score;
        if (!grade || score === null || score === undefined) continue;

        const expectedMin = GRADE_BOUNDARIES[grade];
        if (expectedMin === undefined) continue;

        // Find the next grade boundary above
        const grades = Object.entries(GRADE_BOUNDARIES).sort((a, b) => b[1] - a[1]);
        const gradeIdx = grades.findIndex((g) => g[0] === grade);
        const nextMin = gradeIdx > 0 ? grades[gradeIdx - 1][1] : 101;

        if (score < expectedMin || score >= nextMin) {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'grade_score_consistency',
            severity: 'error',
            message: `Grade '${grade}' but score ${score} (expected ${expectedMin}-${nextMin - 1})`,
          });
        }
      }

      return anomalies;
    };

    // ── Check 6: Evidence-Override Audit ─────────────────────────────

    const checkEvidenceOverrideAudit = (tools) => {
      const anomalies = [];

      for (const tool of tools) {
        const scoring = tool._scoring || {};
        const details = scoring.obligationDetails || [];
        if (details.length === 0) continue;

        const overridden = details.filter((d) => d.statusSource === 'evidence_derived');
        const overrideRatio = overridden.length / details.length;

        if (overrideRatio > 0.5) {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'evidence_override_audit',
            severity: 'warning',
            message: `${overridden.length}/${details.length} obligations overridden by evidence analyzer (${Math.round(overrideRatio * 100)}%)`,
          });
        }

        // Flag non-safety downgrades
        for (const d of overridden) {
          const statusOrder = { unknown: 0, partially_met: 1, met: 2 };
          const origOrder = statusOrder[d.originalStatus] ?? 0;
          const derivedOrder = statusOrder[d.derivedStatus] ?? 0;
          if (derivedOrder < origOrder && d.id !== 'OBL-002a') {
            anomalies.push({
              tool: tool.name || tool.slug,
              check: 'evidence_override_audit',
              severity: 'warning',
              message: `${d.id}: evidence downgraded from ${d.originalStatus} to ${d.derivedStatus}`,
            });
          }
        }
      }

      return anomalies;
    };

    // ── Check 7: Deadline Urgency Audit ─────────────────────────────

    const checkDeadlineUrgencyAudit = (tools) => {
      const anomalies = [];

      for (const tool of tools) {
        const scoring = tool._scoring || {};
        const details = scoring.obligationDetails || [];

        const overdueUnknown = details.filter((d) => d.isOverdue && d.derivedStatus === 'unknown');

        for (const d of overdueUnknown) {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'deadline_urgency_audit',
            severity: overdueUnknown.length > 3 ? 'error' : 'warning',
            message: `${d.id} overdue by ${d.daysOverdue} days, status still unknown`,
          });
        }
      }

      return anomalies;
    };

    // ── Check 8: Confidence Floor/Ceiling ───────────────────────────

    const checkConfidenceFloorCeiling = (tools) => {
      const anomalies = [];

      for (const tool of tools) {
        const scoring = tool._scoring || {};
        const confidence = scoring.confidence;
        const level = tool.level || 'classified';

        if (confidence === null || confidence === undefined || typeof confidence !== 'number' || isNaN(confidence)) continue;

        if (level === 'classified' && confidence > 0.35) {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'confidence_floor_ceiling',
            severity: 'warning',
            message: `Classified tool with confidence ${confidence} (expected ≤0.35)`,
          });
        }

        if (level === 'verified' && confidence < 0.65) {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'confidence_floor_ceiling',
            severity: 'warning',
            message: `Verified tool with confidence ${confidence} (expected ≥0.65)`,
          });
        }
      }

      return anomalies;
    };

    // ── Check 9: Confidence Interval Width ──────────────────────────

    const checkConfidenceIntervalWidth = (tools) => {
      const anomalies = [];

      for (const tool of tools) {
        const scoring = tool._scoring || {};
        const ci = scoring.confidenceInterval;
        const level = tool.level || 'classified';
        if (!ci) continue;

        if (ci.width > 50) {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'confidence_interval_width',
            severity: 'warning',
            message: `Score highly uncertain, range: ${ci.low}-${ci.high} (width ${ci.width})`,
          });
        }

        if (ci.width > 40 && level === 'scanned') {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'confidence_interval_width',
            severity: 'warning',
            message: `Scanned tool but still highly uncertain (width ${ci.width})`,
          });
        }

        if (ci.width < 10 && level === 'classified') {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'confidence_interval_width',
            severity: 'error',
            message: `Classified tool impossibly precise (width ${ci.width})`,
          });
        }
      }

      return anomalies;
    };

    // ── Check 10: Maturity-Score Coherence ──────────────────────────

    const checkMaturityScoreCoherence = (tools) => {
      const anomalies = [];

      for (const tool of tools) {
        const scoring = tool._scoring || {};
        const maturity = scoring.maturity;
        const score = tool._score;
        if (!maturity || score === null || score === undefined) continue;

        const label = maturity.criteria || maturity.label;

        if (label === 'exemplary' && score < 85) {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'maturity_score_coherence',
            severity: 'warning',
            message: `Maturity 'exemplary' but score ${score} (expected ≥85)`,
          });
        }

        if (label === 'unaware' && score > 20) {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'maturity_score_coherence',
            severity: 'warning',
            message: `Maturity 'unaware' but score ${score} (expected ≤20)`,
          });
        }

        if (label === 'compliant' && scoring.criticalCapApplied) {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'maturity_score_coherence',
            severity: 'error',
            message: 'Maturity \'compliant\' but critical cap applied (cannot be compliant with critical not_met)',
          });
        }

        if (label === 'implementing' && (scoring.evidenceQuality || 0) < 0.1) {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'maturity_score_coherence',
            severity: 'warning',
            message: `Maturity 'implementing' but evidenceQuality ${scoring.evidenceQuality} (expected ≥0.1)`,
          });
        }
      }

      return anomalies;
    };

    // ── Check 11: Coverage-Score Coherence ──────────────────────────

    const checkCoverageScoreCoherence = (tools) => {
      const anomalies = [];
      for (const tool of tools) {
        const scoring = tool._scoring || {};
        const score = tool._score;
        const coverage = scoring.coverage;
        if (
          score === null || score === undefined
          || coverage === null || coverage === undefined
        ) continue;
        if (score > 80 && coverage < 20) {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'coverage_score_coherence',
            severity: 'error',
            message: `Score ${score} with only ${coverage}% coverage`,
          });
        }
        if (score > 70 && coverage < 40) {
          anomalies.push({
            tool: tool.name || tool.slug,
            check: 'coverage_score_coherence',
            severity: 'warning',
            message: `Score ${score} but only ${coverage}% assessed`,
          });
        }
      }
      return anomalies;
    };

    // ── Main validate ───────────────────────────────────────────────

    return {
      async validate(tools) {
        const obligationMap = await loadObligationMap();
        const allAnomalies = [];

        // Original 4 checks
        allAnomalies.push(...checkFamilyConsistency(tools));
        allAnomalies.push(...checkRiskScoreSanity(tools, obligationMap));
        allAnomalies.push(...checkEvidenceCompleteness(tools, obligationMap));
        allAnomalies.push(...checkStatisticalOutlier(tools));

        // v2 checks
        allAnomalies.push(...checkGradeScoreConsistency(tools));
        allAnomalies.push(...checkEvidenceOverrideAudit(tools));
        allAnomalies.push(...checkDeadlineUrgencyAudit(tools));
        allAnomalies.push(...checkConfidenceFloorCeiling(tools));
        allAnomalies.push(...checkConfidenceIntervalWidth(tools));
        allAnomalies.push(...checkMaturityScoreCoherence(tools));

        // v3 check
        allAnomalies.push(...checkCoverageScoreCoherence(tools));

        const errors = allAnomalies.filter((a) => a.severity === 'error');
        const warnings = allAnomalies.filter((a) => a.severity === 'warning');

        return {
          valid: errors.length === 0,
          warnings: warnings.map((a) => a.message),
          errors: errors.map((a) => a.message),
          anomalies: allAnomalies,
        };
      },
    };
  };
})()
