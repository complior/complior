import { describe, it, expect } from 'vitest';
import { QUESTION_BLOCKS, getAllBlockIds } from './questions.js';
import { buildProfile, computeRiskLevel, computeApplicableObligations, validateProfile } from './profile.js';
import type { AutoDetectResult } from './auto-detect.js';

const mockAutoDetect: AutoDetectResult = {
  language: 'TypeScript',
  framework: 'Next.js',
  cicd: 'github-actions',
  deployment: 'Docker',
  aiLibraries: ['OpenAI SDK', 'Vercel AI SDK'],
  hasDockerCompose: true,
  hasEnvExample: true,
  detectedModels: ['gpt-4o'],
  confidence: 0.83,
};

describe('Onboarding Questions', () => {
  it('has 6 question blocks', () => {
    expect(QUESTION_BLOCKS).toHaveLength(6);
    expect(getAllBlockIds()).toEqual(['ai_system', 'jurisdiction', 'role', 'business', 'data', 'goals']);
  });

  it('every block has at least one question', () => {
    for (const block of QUESTION_BLOCKS) {
      expect(block.questions.length).toBeGreaterThan(0);
      for (const q of block.questions) {
        expect(q.id).toBeTruthy();
        expect(q.text).toBeTruthy();
      }
    }
  });
});

describe('Profile Builder', () => {
  it('builds complete profile with computed fields', () => {
    const profile = buildProfile(mockAutoDetect, {
      system_type: 'feature',
      output_types: ['text', 'code'],
      primary_jurisdiction: 'EU',
      org_role: 'deployer',
      domain: 'healthcare',
      company_size: 'startup',
      data_types: ['personal', 'health'],
      data_storage: 'eu',
      priority: 'full',
      budget: 'moderate',
    });

    expect(profile.version).toBe('1.0');
    expect(profile.autoDetected.language).toBe('TypeScript');
    expect(profile.aiSystem.type).toBe('feature');
    expect(profile.jurisdiction.primary).toBe('EU');
    expect(profile.business.domain).toBe('healthcare');
    expect(profile.computed.riskLevel).toBe('high');
    expect(profile.computed.applicableObligations.length).toBeGreaterThan(15);
    expect(profile.computed.estimatedScore).toBe(25);
  });

  it('validates correct profile', () => {
    const profile = buildProfile(mockAutoDetect, { domain: 'general' });
    const result = validateProfile(profile);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid profile', () => {
    const result = validateProfile({ version: '2.0', invalid: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });
});

describe('Risk Level Computation', () => {
  it('healthcare domain → high', () => {
    expect(computeRiskLevel('healthcare', ['personal'], 'feature')).toBe('high');
  });

  it('biometric data → high', () => {
    expect(computeRiskLevel('general', ['biometric'], 'feature')).toBe('high');
  });

  it('general + public data → limited', () => {
    expect(computeRiskLevel('general', ['public'], 'feature')).toBe('limited');
  });

  it('internal + public data → minimal', () => {
    expect(computeRiskLevel('general', ['public'], 'internal')).toBe('minimal');
  });

  it('high-risk adds extra obligations', () => {
    const high = computeApplicableObligations('healthcare', 'high');
    const limited = computeApplicableObligations('general', 'limited');
    expect(high.length).toBeGreaterThan(limited.length);
  });
});
