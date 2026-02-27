'use strict';

const scoringWeights = [
  { category: 'ai_literacy',            weight: 0.05, label: 'AI Literacy' },
  { category: 'deployer_obligations',   weight: 0.13, label: 'Deployer Obligations' },
  { category: 'fria',                   weight: 0.08, label: 'Fundamental Rights Impact' },
  { category: 'transparency',           weight: 0.17, label: 'Transparency' },
  { category: 'human_oversight',        weight: 0.05, label: 'Human Oversight' },
  { category: 'monitoring',             weight: 0.09, label: 'Monitoring & Reporting' },
  { category: 'risk_management',        weight: 0.17, label: 'Risk Management' },
  { category: 'data_governance',        weight: 0.03, label: 'Data Governance' },
  { category: 'record_keeping',         weight: 0.05, label: 'Record Keeping' },
  { category: 'registration',           weight: 0.05, label: 'Registration' },
  { category: 'post_market_monitoring', weight: 0.13, label: 'Post-Market Monitoring' },
];
// Total: 1.00

module.exports = scoringWeights;
