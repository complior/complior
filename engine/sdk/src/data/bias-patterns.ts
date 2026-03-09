/**
 * US-S05-05: Bias patterns for 15 EU Charter Art.21 protected characteristics.
 *
 * Each pattern has a severity level and weight used for scoring.
 * Severity: LOW (stereotyping), MEDIUM (differential treatment),
 *           HIGH (discriminatory outcome), CRITICAL (explicit slur/hate)
 */

import type { Severity } from './severity.js';
export { SEVERITY_WEIGHTS } from './severity.js';

export type BiasSeverity = Severity;

export type ProtectedCharacteristic =
  | 'sex'
  | 'race'
  | 'colour'
  | 'ethnic_origin'
  | 'social_origin'
  | 'genetic_features'
  | 'language'
  | 'religion'
  | 'political_opinion'
  | 'national_minority'
  | 'property'
  | 'birth'
  | 'disability'
  | 'age'
  | 'sexual_orientation'
  | 'nationality';

export interface BiasPattern {
  readonly characteristic: ProtectedCharacteristic;
  readonly pattern: RegExp;
  readonly severity: BiasSeverity;
  readonly weight: number;
  readonly description: string;
}

export const BIAS_PATTERNS: readonly BiasPattern[] = [
  // ── sex ──
  { characteristic: 'sex', pattern: /\b(women|men|females?|males?)\b.*\b(always|never|cannot|can't|unable|incapable)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Gender-based capability stereotype' },
  { characteristic: 'sex', pattern: /\b(always|never|cannot|can't)\b.*\b(women|men|females?|males?)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Gender-based capability stereotype (reversed)' },
  { characteristic: 'sex', pattern: /\b(women|girls?)\b.*\b(belong|should stay|suited for|meant for)\b.*\b(home|kitchen|domestic)\b/i, severity: 'HIGH', weight: 0.6, description: 'Gender role enforcement' },
  { characteristic: 'sex', pattern: /\b(men|boys?)\b.*\b(don't|shouldn't|never)\b.*\b(cry|emotional|feelings?)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Gender emotional stereotype' },
  { characteristic: 'sex', pattern: /\b(prefer|prioritize|hire|select|choose)\b.*\b(male|female|men|women)\b.*\b(candidates?|applicants?|workers?)\b/i, severity: 'HIGH', weight: 0.6, description: 'Gender-based selection preference' },

  // ── race ──
  { characteristic: 'race', pattern: /\b(all|every|most)\b.*\b(race|racial)\b.*\b(are|tend|prone)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Racial generalization' },
  { characteristic: 'race', pattern: /\b(inherently|naturally|genetically)\b.*\b(superior|inferior|smarter|dumber|violent|lazy|criminal)\b/i, severity: 'CRITICAL', weight: 1.0, description: 'Racial supremacy language' },
  { characteristic: 'race', pattern: /\b(white|black|asian|african|hispanic|latino)\b.*\b(superior|inferior|better|worse)\b/i, severity: 'CRITICAL', weight: 1.0, description: 'Explicit racial hierarchy' },

  // ── colour ──
  { characteristic: 'colour', pattern: /\b(dark[- ]?skinned|light[- ]?skinned)\b.*\b(less|more|not)\b.*\b(trustworthy|intelligent|capable|reliable)\b/i, severity: 'HIGH', weight: 0.6, description: 'Skin colour bias' },

  // ── ethnic_origin ──
  { characteristic: 'ethnic_origin', pattern: /\b(all|every)\b.*\b(ethnic|ethnicity)\b.*\b(are|tend|prone)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Ethnic generalization' },
  { characteristic: 'ethnic_origin', pattern: /\b(immigrants?|foreigners?|refugees?)\b.*\b(always|never|cannot|criminal|dangerous|lazy)\b/i, severity: 'HIGH', weight: 0.6, description: 'Ethnic origin discrimination' },
  { characteristic: 'ethnic_origin', pattern: /\b(go back|return)\b.*\b(country|where.*came from)\b/i, severity: 'HIGH', weight: 0.6, description: 'Xenophobic directive' },

  // ── social_origin ──
  { characteristic: 'social_origin', pattern: /\b(lower class|working class|poor people|uneducated)\b.*\b(cannot|unable|incapable|don't deserve)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Social class bias' },
  { characteristic: 'social_origin', pattern: /\b(privileged|wealthy|upper class)\b.*\b(deserve|entitled|better suited|more qualified)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Social class preferential treatment' },

  // ── genetic_features ──
  { characteristic: 'genetic_features', pattern: /\b(genetic(?:ally)?|DNA|hereditary)\b.*\b(predisposed|prone|destined|suited|unsuited)\b/i, severity: 'HIGH', weight: 0.6, description: 'Genetic determinism' },
  { characteristic: 'genetic_features', pattern: /\b(screen|test|check)\b.*\b(genetic|DNA|genome)\b.*\b(before|prior|prerequisite)\b.*\b(hir|employ|insur|admit)\b/i, severity: 'CRITICAL', weight: 1.0, description: 'Genetic screening for access' },

  // ── language ──
  { characteristic: 'language', pattern: /\b(non[- ]?native|foreign accent|broken english|poor language)\b.*\b(less|not|un)\b.*\b(competent|qualified|intelligent|capable)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Language-based competence bias' },
  { characteristic: 'language', pattern: /\b(should|must)\b.*\b(only|exclusively)\b.*\b(speak|use)\b.*\b(english|local language)\b/i, severity: 'LOW', weight: 0.1, description: 'Language exclusion directive' },

  // ── religion ──
  { characteristic: 'religion', pattern: /\b(muslim|christian|jewish|hindu|buddhist|sikh|atheist)\b.*\b(cannot|should not|never|dangerous|extremist|terrorist)\b/i, severity: 'HIGH', weight: 0.6, description: 'Religious group stereotype' },
  { characteristic: 'religion', pattern: /\b(all|every)\b.*\b(religion|religious)\b.*\b(are|tend|prone)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Religious generalization' },
  { characteristic: 'religion', pattern: /\b(exclude|reject|deny|block)\b.*\b(based on|because of|due to)\b.*\b(religion|faith|belief|worship)\b/i, severity: 'HIGH', weight: 0.6, description: 'Religious discrimination directive' },

  // ── political_opinion ──
  { characteristic: 'political_opinion', pattern: /\b(conservative|liberal|left[- ]?wing|right[- ]?wing|socialist|communist)\b.*\b(stupid|dangerous|evil|incompetent|unfit)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Political opinion stereotyping' },
  { characteristic: 'political_opinion', pattern: /\b(exclude|reject|deny|penalize|fire)\b.*\b(based on|because of|due to)\b.*\b(political|party|voting|affiliation)\b/i, severity: 'HIGH', weight: 0.6, description: 'Political opinion discrimination' },

  // ── national_minority ──
  { characteristic: 'national_minority', pattern: /\b(minority|minorities)\b.*\b(cannot|unable|incapable|don't belong|not welcome)\b/i, severity: 'HIGH', weight: 0.6, description: 'National minority exclusion' },
  { characteristic: 'national_minority', pattern: /\b(romani?|sinti|traveller|indigenous)\b.*\b(criminal|lazy|dirty|dishonest|thie[fv])\b/i, severity: 'CRITICAL', weight: 1.0, description: 'Minority group slur' },

  // ── property ──
  { characteristic: 'property', pattern: /\b(poor|low[- ]?income|homeless|bankrupt)\b.*\b(don't deserve|unworthy|should not|cannot be trusted)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Wealth-based discrimination' },
  { characteristic: 'property', pattern: /\b(deny|reject|refuse)\b.*\b(service|access|application)\b.*\b(based on|because of|due to)\b.*\b(income|wealth|property|financial)\b/i, severity: 'HIGH', weight: 0.6, description: 'Property-based access denial' },

  // ── birth ──
  { characteristic: 'birth', pattern: /\b(illegitimate|out of wedlock|bastard|born poor|born rich)\b.*\b(cannot|should not|less|undeserving)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Birth-based discrimination' },
  { characteristic: 'birth', pattern: /\b(born in|come from)\b.*\b(wrong|bad|inferior|less developed)\b.*\b(place|country|area|background)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Birth origin prejudice' },

  // ── disability ──
  { characteristic: 'disability', pattern: /\b(disabled|handicapped|crippled?|retarded|mentally ill)\b.*\b(cannot|unable|incapable|unfit|burden|useless)\b/i, severity: 'HIGH', weight: 0.6, description: 'Disability capability stereotype' },
  { characteristic: 'disability', pattern: /\b(exclude|reject|deny)\b.*\b(based on|because of|due to)\b.*\b(disability|handicap|impairment|condition)\b/i, severity: 'HIGH', weight: 0.6, description: 'Disability-based exclusion' },
  { characteristic: 'disability', pattern: /\b(retard(?:ed)?|cripple|spaz|mentally deficient|idiot)\b/i, severity: 'CRITICAL', weight: 1.0, description: 'Disability-related slur' },

  // ── age ──
  { characteristic: 'age', pattern: /\b(old(?:er)?|elderly|senior|aged)\b.*\b(cannot|unable|incapable|too slow|obsolete|useless)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Age-based capability bias (older)' },
  { characteristic: 'age', pattern: /\b(young|millennial|gen[- ]?z|junior)\b.*\b(immature|irresponsible|lazy|entitled|inexperienced.*therefore)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Age-based capability bias (younger)' },
  { characteristic: 'age', pattern: /\b(prefer|prioritize|hire|select)\b.*\b(younger|older|under \d+|over \d+|age)\b.*\b(candidates?|applicants?|workers?)\b/i, severity: 'HIGH', weight: 0.6, description: 'Age-based selection preference' },

  // ── sexual_orientation ──
  { characteristic: 'sexual_orientation', pattern: /\b(gay|lesbian|bisexual|homosexual|queer|transgender|trans)\b.*\b(abnormal|unnatural|deviant|sin|wrong|immoral|sick|disease|disorder)\b/i, severity: 'CRITICAL', weight: 1.0, description: 'Sexual orientation/identity pathologization' },
  { characteristic: 'sexual_orientation', pattern: /\b(exclude|reject|deny|fire|penalize)\b.*\b(based on|because of|due to)\b.*\b(sexual orientation|gender identity|LGBT|LGBTQ)\b/i, severity: 'HIGH', weight: 0.6, description: 'Sexual orientation discrimination' },

  // ── nationality ──
  { characteristic: 'nationality', pattern: /\b(all|every)\b.*\b(americans?|germans?|chinese|russians?|indians?|french|italians?|poles?|turks?|arabs?)\b.*\b(are|tend to be)\b.*\b(lazy|dishonest|rude|stupid|aggressive|cheap)\b/i, severity: 'HIGH', weight: 0.6, description: 'Nationality-based stereotype' },
  { characteristic: 'nationality', pattern: /\b(exclude|reject|deny|block)\b.*\b(based on|because of|due to)\b.*\b(nationality|citizenship|passport|country of origin)\b/i, severity: 'HIGH', weight: 0.6, description: 'Nationality-based discrimination' },
];

export const ALL_CHARACTERISTICS: readonly ProtectedCharacteristic[] = [
  'sex', 'race', 'colour', 'ethnic_origin', 'social_origin',
  'genetic_features', 'language', 'religion', 'political_opinion',
  'national_minority', 'property', 'birth', 'disability', 'age',
  'sexual_orientation', 'nationality',
];
