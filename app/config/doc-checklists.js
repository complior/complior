'use strict';

/**
 * Public Documentation Checklists — v4.1 Registry Metrics.
 *
 * Two role-based checklists (9 items each) mapping to passive_scan evidence signals.
 * Each item has a `tier` ('required' | 'best_practice') and optional `legalBasis`.
 *
 * Scoring:
 *   - Required items account for 90% of the grade (legally mandated by EU AI Act / GDPR)
 *   - Best practice items add up to 10% bonus
 *   - Formula: weightedPercent = (reqFound/reqTotal) * 90 + (bpFound/bpTotal) * 10
 *
 * Used by public-doc-grader.js to compute a transparent A+-to-F grade.
 */

const PROVIDER_CHECKLIST = [
  // ── Required (6 items) — 90% of grade ──
  {
    id: 'ai_disclosure',
    label: 'AI System Disclosure',
    signal: 'disclosure.visible',
    description: 'Publicly declares the product is an AI system',
    tier: 'required',
    legalBasis: 'Art. 50 §1',
  },
  {
    id: 'model_card',
    label: 'Model Card Published',
    signal: 'model_card.has_model_card',
    description: 'Technical model documentation available',
    tier: 'required',
    legalBasis: 'Art. 53 §1(b)',
  },
  {
    id: 'model_limitations',
    label: 'Limitations & Risks',
    signal: 'model_card.has_limitations AND model_card.has_bias_info',
    description: 'Documents known limitations and bias risks',
    tier: 'required',
    legalBasis: 'Art. 53 §1(b)(ii), Annex XI §2',
  },
  {
    id: 'training_data_info',
    label: 'Training Data Description',
    signal: 'model_card.has_training_data',
    description: 'Describes training data sources or methodology',
    tier: 'required',
    legalBasis: 'Art. 53 §1(d)',
  },
  {
    id: 'privacy_ai',
    label: 'Privacy Policy Addresses AI',
    signal: 'privacy_policy.mentions_ai',
    description: 'Privacy policy explicitly covers AI processing',
    tier: 'required',
    legalBasis: 'GDPR Art. 13-14',
  },
  {
    id: 'content_marking',
    label: 'Output Marking',
    signal: 'content_marking.c2pa OR content_marking.watermark',
    description: 'AI-generated content marking (C2PA/watermark)',
    tier: 'required',
    legalBasis: 'Art. 50 §2',
  },
  // ── Best Practice (3 items) — 10% bonus ──
  {
    id: 'eu_ai_act_page',
    label: 'EU AI Act Compliance Page',
    signal: 'trust.has_eu_ai_act_page',
    description: 'Dedicated EU AI Act compliance documentation',
    tier: 'best_practice',
    legalBasis: null,
  },
  {
    id: 'responsible_ai',
    label: 'Responsible AI Program',
    signal: 'trust.has_responsible_ai_page',
    description: 'Published responsible AI principles or program',
    tier: 'best_practice',
    legalBasis: null,
  },
  {
    id: 'transparency_report',
    label: 'Transparency Report',
    signal: 'web_search.has_transparency_report',
    description: 'Regular transparency reporting',
    tier: 'best_practice',
    legalBasis: null,
  },
];

const DEPLOYER_PRODUCT_CHECKLIST = [
  // ── Required (4 items) — 90% of grade ──
  {
    id: 'ai_disclosure',
    label: 'AI Usage Disclosure',
    signal: 'disclosure.visible',
    description: 'Discloses AI usage to end users',
    tier: 'required',
    legalBasis: 'Art. 50 §4-5',
  },
  {
    id: 'privacy_ai',
    label: 'Privacy Policy Addresses AI',
    signal: 'privacy_policy.mentions_ai',
    description: 'Privacy policy covers AI data processing',
    tier: 'required',
    legalBasis: 'GDPR Art. 13-14',
  },
  {
    id: 'privacy_eu',
    label: 'EU Data Compliance',
    signal: 'privacy_policy.mentions_eu',
    description: 'Privacy addresses EU-specific requirements',
    tier: 'required',
    legalBasis: 'GDPR Art. 13-14',
  },
  {
    id: 'terms_ai',
    label: 'Terms Address AI Use',
    signal: 'privacy_policy.training_opt_out',
    description: 'Terms/policies address AI-specific rights',
    tier: 'required',
    legalBasis: 'Art. 50, GDPR Art. 22',
  },
  // ── Best Practice (5 items) — 10% bonus ──
  {
    id: 'eu_ai_act_page',
    label: 'EU AI Act Compliance Page',
    signal: 'trust.has_eu_ai_act_page',
    description: 'Dedicated EU AI Act compliance docs',
    tier: 'best_practice',
    legalBasis: null,
  },
  {
    id: 'responsible_ai',
    label: 'Responsible AI Program',
    signal: 'trust.has_responsible_ai_page',
    description: 'Published responsible AI principles',
    tier: 'best_practice',
    legalBasis: null,
  },
  {
    id: 'bias_audit',
    label: 'Public Bias Audit',
    signal: 'web_search.has_public_bias_audit',
    description: 'Published bias or fairness audit',
    tier: 'best_practice',
    legalBasis: null,
  },
  {
    id: 'transparency_report',
    label: 'Transparency Report',
    signal: 'web_search.has_transparency_report',
    description: 'Regular transparency reporting',
    tier: 'best_practice',
    legalBasis: null,
  },
  {
    id: 'certifications',
    label: 'Certifications',
    signal: 'trust.certifications.length > 0',
    description: 'Holds relevant certifications (ISO 42001, etc.)',
    tier: 'best_practice',
    legalBasis: null,
  },
];

/**
 * Weighted grade thresholds.
 * Score range 0-100 where required items = 90% weight, best practice = 10%.
 */
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

/** Legacy grade mapping (kept for reference) */
const GRADE_MAP = {
  9: 'A+', 8: 'A', 7: 'A-', 6: 'B+', 5: 'B',
  4: 'B-', 3: 'C', 2: 'D', 1: 'D-', 0: 'F',
};

module.exports = {
  PROVIDER_CHECKLIST,
  DEPLOYER_PRODUCT_CHECKLIST,
  GRADE_MAP,
  GRADE_THRESHOLDS,
};
