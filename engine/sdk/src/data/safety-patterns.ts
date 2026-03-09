/**
 * US-S05-17: Safety patterns for LLM output filtering (OBL-009, Art.15).
 *
 * 5 categories: violence, self_harm, illegal_instructions, pii_leakage, hallucination_indicator
 * Severity: LOW, MEDIUM, HIGH, CRITICAL — weighted scoring like bias-patterns.ts
 */

import type { Severity } from './severity.js';
import { SEVERITY_WEIGHTS } from './severity.js';

export type SafetySeverity = Severity;

export type SafetyCategory =
  | 'violence'
  | 'self_harm'
  | 'illegal_instructions'
  | 'pii_leakage'
  | 'hallucination_indicator';

export interface SafetyPattern {
  readonly category: SafetyCategory;
  readonly pattern: RegExp;
  readonly severity: SafetySeverity;
  readonly weight: number;
  readonly description: string;
}

export { SEVERITY_WEIGHTS };

export const SAFETY_PATTERNS: readonly SafetyPattern[] = [
  // ── violence ──
  { category: 'violence', pattern: /\b(how to|steps to|instructions? for)\b.*\b(kill|murder|assassinate|poison)\b.*\b(person|people|someone|human)\b/i, severity: 'CRITICAL', weight: 1.0, description: 'Instructions for lethal violence' },
  { category: 'violence', pattern: /\b(build|make|create|construct)\b.*\b(bomb|explosive|weapon|firearm)\b/i, severity: 'CRITICAL', weight: 1.0, description: 'Weapon construction instructions' },
  { category: 'violence', pattern: /\b(attack|assault|harm|hurt)\b.*\b(plan|strategy|method|technique)\b/i, severity: 'HIGH', weight: 0.6, description: 'Violence planning language' },
  { category: 'violence', pattern: /\b(torture|mutilate|dismember)\b.*\b(how|method|way|technique)\b/i, severity: 'CRITICAL', weight: 1.0, description: 'Torture/mutilation instructions' },

  // ── self_harm ──
  { category: 'self_harm', pattern: /\b(how to|ways to|methods? (?:of|for))\b.*\b(suicide|kill yourself|end your life|self[- ]?harm)\b/i, severity: 'CRITICAL', weight: 1.0, description: 'Self-harm instructions' },
  { category: 'self_harm', pattern: /\b(cut|cutting|starve|starving)\b.*\b(yourself|oneself)\b.*\b(to|for|as)\b/i, severity: 'HIGH', weight: 0.6, description: 'Self-injury encouragement' },
  { category: 'self_harm', pattern: /\b(you should|you deserve to)\b.*\b(die|suffer|hurt yourself|end it)\b/i, severity: 'CRITICAL', weight: 1.0, description: 'Direct self-harm encouragement' },

  // ── illegal_instructions ──
  { category: 'illegal_instructions', pattern: /\b(how to|steps to|guide to)\b.*\b(hack|breach|exploit|crack)\b.*\b(system|network|server|database|account)\b/i, severity: 'HIGH', weight: 0.6, description: 'Hacking instructions' },
  { category: 'illegal_instructions', pattern: /\b(synthesize|manufacture|produce|cook)\b.*\b(meth|cocaine|heroin|fentanyl|drugs?)\b/i, severity: 'CRITICAL', weight: 1.0, description: 'Drug manufacturing instructions' },
  { category: 'illegal_instructions', pattern: /\b(forge|counterfeit|fake)\b.*\b(passport|identity|document|currency|money)\b/i, severity: 'HIGH', weight: 0.6, description: 'Counterfeiting instructions' },
  { category: 'illegal_instructions', pattern: /\b(evade|avoid|bypass)\b.*\b(law enforcement|police|detection|surveillance)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Law evasion guidance' },

  // ── pii_leakage ──
  { category: 'pii_leakage', pattern: /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/, severity: 'HIGH', weight: 0.6, description: 'SSN-like number in output' },
  { category: 'pii_leakage', pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, severity: 'HIGH', weight: 0.6, description: 'Credit card-like number in output' },
  { category: 'pii_leakage', pattern: /\b[A-Z]{2}\d{2}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{0,2}\b/, severity: 'MEDIUM', weight: 0.3, description: 'IBAN-like number in output' },
  { category: 'pii_leakage', pattern: /\b(?:password|secret|api[_-]?key|token)\s*[:=]\s*\S+/i, severity: 'HIGH', weight: 0.6, description: 'Credential leakage in output' },

  // ── hallucination_indicator ──
  { category: 'hallucination_indicator', pattern: /\bI (?:recall|remember|know for a fact) that\b.*\b(?:in \d{4}|on \w+ \d{1,2})\b/i, severity: 'LOW', weight: 0.1, description: 'False memory claim with date' },
  { category: 'hallucination_indicator', pattern: /\b(?:according to|as stated in|as reported by)\b.*\b(?:study|paper|report|article)\b.*\b(?:published|released|from)\b.*\b\d{4}\b/i, severity: 'LOW', weight: 0.1, description: 'Unverifiable citation' },
  { category: 'hallucination_indicator', pattern: /\b(?:official|confirmed|verified)\b.*\b(?:statistics?|data|numbers?|figures?)\b.*\b(?:show|indicate|prove|confirm)\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Authoritative claim without source' },
  { category: 'hallucination_indicator', pattern: /\bthe (?:law|regulation|statute|act) (?:requires|mandates|states) that\b/i, severity: 'MEDIUM', weight: 0.3, description: 'Unverified legal claim' },
];
