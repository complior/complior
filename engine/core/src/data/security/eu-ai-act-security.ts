/**
 * EU AI Act Security Mappings — extracted from Promptfoo (MIT License).
 * Data source: promptfoo/src/redteam/constants/frameworks.ts
 *
 * Art. 5 (Prohibited practices) + Annex III (High-risk use-cases).
 * Zero runtime dependency on Promptfoo.
 */

import type { Severity } from '../../types/common.types.js';

export interface EuAiActSecurityEntry {
  readonly id: string;
  readonly euId: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'art5-prohibited' | 'annex3-high-risk';
  readonly severity: Severity;
  readonly plugins: readonly string[];
  readonly strategies: readonly string[];
}

export const EU_AI_ACT_SECURITY_ENTRIES: readonly EuAiActSecurityEntry[] = Object.freeze([
  // Art. 5 — Prohibited practices
  { id: 'EU-SEC-01', euId: 'eu:ai-act:art5:subliminal-manipulation', name: 'Subliminal Manipulation', description: 'Art. 5(1)(a) — tests for goal hijacking, intent manipulation, excessive agency, and misinformation.', category: 'art5-prohibited', severity: 'critical', plugins: ['hijacking', 'intent', 'excessive-agency', 'harmful:misinformation-disinformation'], strategies: ['jailbreak', 'jailbreak:tree', 'jailbreak:composite', 'jailbreak-templates'] },
  { id: 'EU-SEC-02', euId: 'eu:ai-act:art5:exploitation-of-vulnerabilities', name: 'Exploitation of Vulnerabilities', description: 'Art. 5(1)(b) — targets age, disability, social/economic situation.', category: 'art5-prohibited', severity: 'critical', plugins: ['hijacking', 'imitation', 'harmful:misinformation-disinformation', 'bias:age', 'bias:disability'], strategies: ['jailbreak'] },
  { id: 'EU-SEC-03', euId: 'eu:ai-act:art5:social-scoring', name: 'Social Scoring', description: 'Art. 5(1)(c) — discriminatory classification of persons.', category: 'art5-prohibited', severity: 'critical', plugins: ['harmful:misinformation-disinformation', 'overreliance', 'bias:age', 'bias:gender', 'bias:race', 'bias:disability'], strategies: [] },
  { id: 'EU-SEC-04', euId: 'eu:ai-act:art5:biometric-categorisation', name: 'Biometric Categorisation', description: 'Art. 5(1)(g) — biometric categorisation by sensitive characteristics.', category: 'art5-prohibited', severity: 'critical', plugins: ['pii:direct', 'pii:session', 'harmful:privacy'], strategies: [] },
  { id: 'EU-SEC-05', euId: 'eu:ai-act:art5:remote-biometric-id-live', name: 'Remote Biometric ID (Live)', description: 'Art. 5(1)(h) — real-time remote biometric identification.', category: 'art5-prohibited', severity: 'critical', plugins: ['pii:session', 'pii:direct', 'harmful:privacy'], strategies: [] },
  { id: 'EU-SEC-06', euId: 'eu:ai-act:art5:remote-biometric-id-post', name: 'Remote Biometric ID (Post)', description: 'Art. 5(1)(h) — post remote biometric identification.', category: 'art5-prohibited', severity: 'critical', plugins: ['pii:api-db', 'pii:direct', 'harmful:privacy'], strategies: [] },

  // Annex III — High-risk use-cases
  { id: 'EU-SEC-07', euId: 'eu:ai-act:annex3:biometric-id', name: 'Biometric Identification', description: 'Annex III §1 — biometric identification and categorisation.', category: 'annex3-high-risk', severity: 'high', plugins: ['pii:direct', 'pii:session', 'harmful:privacy'], strategies: [] },
  { id: 'EU-SEC-08', euId: 'eu:ai-act:annex3:critical-infrastructure', name: 'Critical Infrastructure', description: 'Annex III §2 — management of critical digital infrastructure.', category: 'annex3-high-risk', severity: 'critical', plugins: ['shell-injection', 'sql-injection', 'ssrf', 'excessive-agency'], strategies: ['jailbreak', 'jailbreak-templates'] },
  { id: 'EU-SEC-09', euId: 'eu:ai-act:annex3:education', name: 'Education', description: 'Annex III §3 — access to education, learning outcomes.', category: 'annex3-high-risk', severity: 'high', plugins: ['harmful:misinformation-disinformation', 'hallucination', 'overreliance', 'bias:race', 'bias:gender', 'bias:disability'], strategies: [] },
  { id: 'EU-SEC-10', euId: 'eu:ai-act:annex3:employment', name: 'Employment', description: 'Annex III §4 — recruitment, selection, promotion, termination.', category: 'annex3-high-risk', severity: 'high', plugins: ['imitation', 'pii:direct', 'overreliance', 'bias:gender', 'bias:race', 'bias:age', 'bias:disability'], strategies: [] },
  { id: 'EU-SEC-11', euId: 'eu:ai-act:annex3:essential-services', name: 'Essential Services', description: 'Annex III §5 — creditworthiness, emergency dispatch, public services.', category: 'annex3-high-risk', severity: 'high', plugins: ['pii:direct', 'pii:session', 'excessive-agency', 'bias:race', 'bias:gender'], strategies: [] },
  { id: 'EU-SEC-12', euId: 'eu:ai-act:annex3:law-enforcement', name: 'Law Enforcement', description: 'Annex III §6 — risk assessments, profiling, evidence evaluation.', category: 'annex3-high-risk', severity: 'high', plugins: ['pii:direct', 'pii:api-db', 'harmful:privacy', 'bias:race'], strategies: [] },
  { id: 'EU-SEC-13', euId: 'eu:ai-act:annex3:migration-border', name: 'Migration & Border', description: 'Annex III §7 — verification, risk assessments, document authenticity.', category: 'annex3-high-risk', severity: 'high', plugins: ['pii:direct', 'harmful:hate', 'harmful:privacy', 'bias:race'], strategies: [] },
  { id: 'EU-SEC-14', euId: 'eu:ai-act:annex3:justice-democracy', name: 'Justice & Democracy', description: 'Annex III §8 — interpreting facts/law, applying law to facts.', category: 'annex3-high-risk', severity: 'high', plugins: ['hallucination', 'harmful:misinformation-disinformation', 'pii:direct', 'bias:race', 'bias:gender'], strategies: [] },
]);
