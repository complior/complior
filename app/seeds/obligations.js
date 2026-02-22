'use strict';

const requirements = require('./requirements.js');

const deriveCheckCriteria = (category) => {
  const map = {
    ai_literacy: { type: 'training', evidenceRequired: ['completion_certificate', 'attendance_log'] },
    deployer_obligations: { type: 'process', evidenceRequired: ['policy_document', 'audit_trail'] },
    fria: { type: 'assessment', evidenceRequired: ['fria_report', 'stakeholder_consultation'] },
    transparency: { type: 'disclosure', evidenceRequired: ['user_notification', 'labeling_proof'] },
    human_oversight: { type: 'process', evidenceRequired: ['oversight_plan', 'personnel_assignment'] },
    monitoring: { type: 'technical', evidenceRequired: ['monitoring_logs', 'incident_reports'] },
    risk_management: { type: 'process', evidenceRequired: ['risk_assessment', 'mitigation_plan'] },
    data_governance: { type: 'technical', evidenceRequired: ['data_quality_report', 'bias_assessment'] },
    record_keeping: { type: 'technical', evidenceRequired: ['log_retention_config', 'access_controls'] },
    registration: { type: 'administrative', evidenceRequired: ['registration_number', 'confirmation'] },
    post_market_monitoring: { type: 'process', evidenceRequired: ['feedback_reports', 'provider_communication'] },
  };
  return map[category] || null;
};

const obligations = requirements.map((req) => ({
  code: req.code,
  regulation: 'eu_ai_act',
  name: req.name,
  description: req.description,
  articleReference: req.articleReference,
  riskLevel: req.riskLevel,
  category: req.category,
  checkCriteria: deriveCheckCriteria(req.category),
  sortOrder: req.sortOrder,
}));

module.exports = obligations;
