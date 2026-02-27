'use strict';

/**
 * Public Documentation Checklists — v4 Registry Metrics.
 *
 * Two role-based checklists (9 items each) mapping to passive_scan evidence signals.
 * Used by public-doc-grader.js to compute a transparent A+-to-F grade.
 */

const PROVIDER_CHECKLIST = [
  {
    id: 'ai_disclosure',
    label: 'AI System Disclosure',
    signal: 'disclosure.visible',
    description: 'Publicly declares the product is an AI system',
  },
  {
    id: 'model_card',
    label: 'Model Card Published',
    signal: 'model_card.has_model_card',
    description: 'Technical model documentation available',
  },
  {
    id: 'model_limitations',
    label: 'Limitations & Risks',
    signal: 'model_card.has_limitations AND model_card.has_bias_info',
    description: 'Documents known limitations and bias risks',
  },
  {
    id: 'training_data_info',
    label: 'Training Data Description',
    signal: 'model_card.has_training_data',
    description: 'Describes training data sources or methodology',
  },
  {
    id: 'privacy_ai',
    label: 'Privacy Policy Addresses AI',
    signal: 'privacy_policy.mentions_ai',
    description: 'Privacy policy explicitly covers AI processing',
  },
  {
    id: 'eu_ai_act_page',
    label: 'EU AI Act Compliance Page',
    signal: 'trust.has_eu_ai_act_page',
    description: 'Dedicated EU AI Act compliance documentation',
  },
  {
    id: 'responsible_ai',
    label: 'Responsible AI Program',
    signal: 'trust.has_responsible_ai_page',
    description: 'Published responsible AI principles or program',
  },
  {
    id: 'transparency_report',
    label: 'Transparency Report',
    signal: 'web_search.has_transparency_report',
    description: 'Regular transparency reporting',
  },
  {
    id: 'content_marking',
    label: 'Output Marking',
    signal: 'content_marking.c2pa OR content_marking.watermark',
    description: 'AI-generated content marking (C2PA/watermark)',
  },
];

const DEPLOYER_PRODUCT_CHECKLIST = [
  {
    id: 'ai_disclosure',
    label: 'AI Usage Disclosure',
    signal: 'disclosure.visible',
    description: 'Discloses AI usage to end users',
  },
  {
    id: 'privacy_ai',
    label: 'Privacy Policy Addresses AI',
    signal: 'privacy_policy.mentions_ai',
    description: 'Privacy policy covers AI data processing',
  },
  {
    id: 'privacy_eu',
    label: 'EU Data Compliance',
    signal: 'privacy_policy.mentions_eu',
    description: 'Privacy addresses EU-specific requirements',
  },
  {
    id: 'eu_ai_act_page',
    label: 'EU AI Act Compliance Page',
    signal: 'trust.has_eu_ai_act_page',
    description: 'Dedicated EU AI Act compliance docs',
  },
  {
    id: 'responsible_ai',
    label: 'Responsible AI Program',
    signal: 'trust.has_responsible_ai_page',
    description: 'Published responsible AI principles',
  },
  {
    id: 'terms_ai',
    label: 'Terms Address AI Use',
    signal: 'privacy_policy.training_opt_out',
    description: 'Terms/policies address AI-specific rights',
  },
  {
    id: 'bias_audit',
    label: 'Public Bias Audit',
    signal: 'web_search.has_public_bias_audit',
    description: 'Published bias or fairness audit',
  },
  {
    id: 'transparency_report',
    label: 'Transparency Report',
    signal: 'web_search.has_transparency_report',
    description: 'Regular transparency reporting',
  },
  {
    id: 'certifications',
    label: 'Certifications',
    signal: 'trust.certifications.length > 0',
    description: 'Holds relevant certifications (ISO 42001, etc.)',
  },
];

/** Grade mapping: found count (0-9) → letter grade */
const GRADE_MAP = {
  9: 'A+',
  8: 'A',
  7: 'A-',
  6: 'B+',
  5: 'B',
  4: 'B-',
  3: 'C',
  2: 'D',
  1: 'D-',
  0: 'F',
};

module.exports = {
  PROVIDER_CHECKLIST,
  DEPLOYER_PRODUCT_CHECKLIST,
  GRADE_MAP,
};
