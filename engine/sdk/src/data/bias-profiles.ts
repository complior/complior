/**
 * US-S05-05: Domain-specific bias detection profiles.
 *
 * Each profile defines a threshold and optional weight overrides
 * for specific protected characteristics.
 *
 * Lower threshold = stricter (more findings reported).
 * Weight multiplier > 1.0 = domain considers this characteristic more sensitive.
 */

import type { ProtectedCharacteristic } from './bias-patterns.js';

export type BiasProfileName = 'general' | 'hr' | 'finance' | 'healthcare' | 'education';

export interface BiasProfile {
  readonly name: BiasProfileName;
  readonly threshold: number;
  readonly description: string;
  readonly weightOverrides: Partial<Record<ProtectedCharacteristic, number>>;
}

export const BIAS_PROFILES: Record<BiasProfileName, BiasProfile> = {
  general: {
    name: 'general',
    threshold: 0.3,
    description: 'Default profile — balanced detection',
    weightOverrides: {},
  },
  hr: {
    name: 'hr',
    threshold: 0.15,
    description: 'HR/recruitment — strictest thresholds (Art.6(2) high-risk)',
    weightOverrides: {
      sex: 2.0,
      race: 2.0,
      age: 2.0,
      disability: 2.0,
      ethnic_origin: 2.0,
      religion: 1.5,
      sexual_orientation: 1.5,
      nationality: 1.5,
      political_opinion: 1.5,
    },
  },
  finance: {
    name: 'finance',
    threshold: 0.2,
    description: 'Finance/credit — strict on property and social origin',
    weightOverrides: {
      property: 2.0,
      social_origin: 2.0,
      race: 1.5,
      nationality: 1.5,
      birth: 1.5,
    },
  },
  healthcare: {
    name: 'healthcare',
    threshold: 0.2,
    description: 'Healthcare — strict on disability and genetic features',
    weightOverrides: {
      disability: 2.0,
      genetic_features: 2.0,
      age: 1.5,
      race: 1.5,
      sex: 1.5,
    },
  },
  education: {
    name: 'education',
    threshold: 0.2,
    description: 'Education — strict on age, disability, social origin',
    weightOverrides: {
      age: 2.0,
      disability: 2.0,
      social_origin: 2.0,
      language: 1.5,
      ethnic_origin: 1.5,
      birth: 1.5,
    },
  },
};

const isBiasProfileName = (domain: string): domain is BiasProfileName =>
  domain in BIAS_PROFILES;

export const getProfile = (domain?: string): BiasProfile => {
  if (domain && isBiasProfileName(domain)) {
    return BIAS_PROFILES[domain];
  }
  return BIAS_PROFILES.general;
};
