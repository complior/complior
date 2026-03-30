/**
 * Pre-fill FRIA from Registry — Auto-fill FRIA sections from Registry tool data.
 *
 * Saves deployers 30-60 minutes per FRIA by pre-populating fields from
 * registry evidence, assessments, and vendor reports.
 *
 * VM sandbox compatible — IIFE, no require().
 */
(() => {
  return {
    /**
     * Generate pre-filled FRIA sections from a registry tool.
     *
     * @param {Object} ctx - { db, console }
     * @param {string} toolSlug - Registry tool slug
     * @returns {Object} - Pre-filled FRIA sections
     */
    async prefillFromRegistry({ db, console }, toolSlug) {
      // 1. Load tool from registry
      const result = await db.query(
        `SELECT slug, name, website, categories, "riskLevel",
                evidence, assessments, "trustLevel",
                "vendorVerified", "vendorReport", "dataResidency",
                "vendorCountry", provider, description
         FROM "RegistryTool" WHERE slug = $1`,
        [toolSlug],
      );

      if (result.rows.length === 0) {
        return { found: false, sections: {} };
      }

      const tool = result.rows[0];

      // Parse JSON fields
      if (typeof tool.evidence === 'string') {
        try { tool.evidence = JSON.parse(tool.evidence); } catch { tool.evidence = {}; }
      }
      if (typeof tool.assessments === 'string') {
        try { tool.assessments = JSON.parse(tool.assessments); } catch { tool.assessments = {}; }
      }
      if (typeof tool.vendorReport === 'string') {
        try {
          tool.vendorReport = JSON.parse(tool.vendorReport);
        } catch { tool.vendorReport = null; }
      }
      if (typeof tool.provider === 'string') {
        try { tool.provider = JSON.parse(tool.provider); } catch { tool.provider = null; }
      }
      if (typeof tool.categories === 'string') {
        try { tool.categories = JSON.parse(tool.categories); } catch { tool.categories = []; }
      }

      const assessment = (tool.assessments && tool.assessments['eu-ai-act']) || {};
      const ps = (tool.evidence && tool.evidence.passive_scan) || {};
      const privacy = ps.privacy || {};
      const vr = tool.vendorReport || {};

      // 2. Build pre-filled sections
      const sections = {};

      // Section 1: AI System Description
      sections.systemDescription = {
        toolName: tool.name,
        provider: tool.provider ? tool.provider.name : null,
        providerWebsite: tool.website,
        description: tool.description || null,
        categories: tool.categories || [],
        riskLevel: tool.riskLevel || assessment.risk_level || null,
        dataResidency: tool.dataResidency || vr.data_residency || null,
        vendorCountry: tool.vendorCountry || null,
        confidenceNote: tool.vendorVerified
          ? 'Data verified by vendor'
          : 'Data from automated assessment — verify with vendor',
      };

      // Section 2: Purpose & Necessity
      sections.purposeNecessity = {
        intendedPurpose: tool.description || null,
        suggestedCategories: tool.categories || [],
        riskClassification: assessment.risk_level || tool.riskLevel || null,
        riskClassificationSource: assessment.scored_at
          ? `Auto-assessed on ${assessment.scored_at}`
          : null,
      };

      // Section 3: Data Processing
      sections.dataProcessing = {
        dataResidency: vr.data_residency || tool.dataResidency || null,
        dataResidencyDetails: vr.data_residency_details || null,
        gdprMention: Boolean(privacy.gdpr_mention),
        dpoListed: Boolean(privacy.dpo_listed),
        privacyPolicyUrl: privacy.privacy_url || tool.website || null,
        dataRetention: Boolean(privacy.data_retention || privacy.retention_specified),
        deletionRight: Boolean(privacy.deletion_right),
        trainingOptOut: Boolean(privacy.training_opt_out),
      };

      // Section 4: Transparency & Explainability
      sections.transparency = {
        aiDisclosure: Boolean(ps.disclosure && ps.disclosure.visible),
        transparencyUrl: vr.transparency_url || null,
        technicalDocUrl: vr.technical_documentation_url || null,
        hasModelCard: Boolean(ps.model_card && ps.model_card.has_model_card),
        hasEuAiActPage: Boolean(
          (ps.trust_signals || {}).has_eu_ai_act_page,
        ),
      };

      // Section 5: Human Oversight
      sections.humanOversight = {
        vendorClaimed: vr.human_oversight || null,
        vendorDetails: vr.human_oversight_details || null,
        autonomyLevel: vr.autonomy_level || null,
      };

      // Section 6: Vendor Compliance Status
      sections.vendorCompliance = {
        vendorVerified: Boolean(tool.vendorVerified),
        trustLevel: tool.trustLevel || 'auto_assessed',
        complianceStatus: vr.ai_act_compliance_status || null,
        complianceContact: vr.compliance_contact || null,
        lastAuditDate: vr.last_audit_date || null,
        certifications: vr.certifications || [],
      };

      // Section 7: Known Risks (from assessment)
      const obligations = assessment.deployer_obligations || [];
      sections.knownRisks = {
        deployerObligations: obligations.map((o) => ({
          id: o.obligation_id,
          title: o.title,
          status: o.status || 'unknown',
        })),
        riskLevel: assessment.risk_level || null,
        score: assessment.score || null,
        grade: assessment.grade || null,
      };

      console.log(`FRIA pre-fill generated for ${toolSlug}: ${Object.keys(sections).length} sections`);

      return {
        found: true,
        toolSlug,
        toolName: tool.name,
        sections,
        generatedAt: new Date().toISOString(),
        dataSource: tool.vendorVerified ? 'vendor_verified' : 'auto_assessed',
      };
    },
  };
})()
