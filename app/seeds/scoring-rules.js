'use strict';

const scoringRules = [
  // Art. 4 — AI Literacy (5 rules)
  { regulation: 'eu_ai_act', checkId: 'art4_literacy_program', weight: 3, maxScore: 15, riskLevel: 'minimal', description: 'AI literacy training program established for all staff' },
  { regulation: 'eu_ai_act', checkId: 'art4_ceo_training', weight: 2, maxScore: 10, riskLevel: 'minimal', description: 'Executive leadership AI competence verified' },
  { regulation: 'eu_ai_act', checkId: 'art4_hr_training', weight: 2, maxScore: 10, riskLevel: 'minimal', description: 'HR department trained on high-risk AI in employment' },
  { regulation: 'eu_ai_act', checkId: 'art4_dev_training', weight: 2, maxScore: 10, riskLevel: 'minimal', description: 'Developer team trained on AI Act technical requirements' },
  { regulation: 'eu_ai_act', checkId: 'art4_general_training', weight: 1, maxScore: 5, riskLevel: 'minimal', description: 'General staff AI awareness training completed' },

  // Art. 5 — Prohibited Practices (2 rules)
  { regulation: 'eu_ai_act', checkId: 'art5_prohibited_check', weight: 5, maxScore: 25, riskLevel: 'prohibited', description: 'Verified no prohibited AI practices in use' },
  { regulation: 'eu_ai_act', checkId: 'art5_social_scoring', weight: 5, maxScore: 25, riskLevel: 'prohibited', description: 'Confirmed no social scoring systems deployed' },

  // Art. 26 — Deployer Obligations (7 rules)
  { regulation: 'eu_ai_act', checkId: 'art26_intended_use', weight: 3, maxScore: 15, riskLevel: 'high', description: 'High-risk AI used according to instructions for use' },
  { regulation: 'eu_ai_act', checkId: 'art26_human_oversight', weight: 4, maxScore: 20, riskLevel: 'high', description: 'Human oversight personnel assigned and trained' },
  { regulation: 'eu_ai_act', checkId: 'art26_input_data', weight: 3, maxScore: 15, riskLevel: 'high', description: 'Input data relevance and quality assured' },
  { regulation: 'eu_ai_act', checkId: 'art26_monitoring', weight: 3, maxScore: 15, riskLevel: 'high', description: 'Operational monitoring plan in place' },
  { regulation: 'eu_ai_act', checkId: 'art26_log_retention', weight: 2, maxScore: 10, riskLevel: 'high', description: 'Automatic logs retained for minimum 6 months' },
  { regulation: 'eu_ai_act', checkId: 'art26_worker_info', weight: 2, maxScore: 10, riskLevel: 'high', description: 'Workers and representatives informed of AI deployment' },
  { regulation: 'eu_ai_act', checkId: 'art26_registration', weight: 2, maxScore: 10, riskLevel: 'high', description: 'Registered in EU database before deployment' },

  // Art. 27 — FRIA (2 rules)
  { regulation: 'eu_ai_act', checkId: 'art27_fria_completed', weight: 4, maxScore: 20, riskLevel: 'high', description: 'Fundamental rights impact assessment completed' },
  { regulation: 'eu_ai_act', checkId: 'art27_affected_persons', weight: 3, maxScore: 15, riskLevel: 'high', description: 'Affected persons and groups identified and documented' },

  // Art. 50 — Transparency (3 rules)
  { regulation: 'eu_ai_act', checkId: 'art50_disclosure', weight: 3, maxScore: 15, riskLevel: 'limited', description: 'Users informed of AI system interaction' },
  { regulation: 'eu_ai_act', checkId: 'art50_chatbot_label', weight: 2, maxScore: 10, riskLevel: 'limited', description: 'Chatbot interactions labeled as AI-generated' },
  { regulation: 'eu_ai_act', checkId: 'art50_content_marking', weight: 2, maxScore: 10, riskLevel: 'limited', description: 'AI-generated content marked appropriately' },
];

module.exports = scoringRules;
