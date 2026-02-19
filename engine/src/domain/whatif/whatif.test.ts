import { describe, it, expect } from 'vitest';
import { analyzeScenario } from './scenario-engine.js';
import { generateAllConfigs, generateDockerCompose, generateEnvExample } from './config-fixer.js';
import type { OnboardingProfile } from '../../onboarding/profile.js';
import type { ScoreBreakdown } from '../../types/common.types.js';

const mockProfile: OnboardingProfile = {
  version: '1.0',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  autoDetected: {
    language: 'TypeScript', framework: 'Next.js', cicd: 'github-actions',
    deployment: 'Docker', aiLibraries: ['OpenAI SDK'], hasDockerCompose: false,
    hasEnvExample: false, detectedModels: ['gpt-4o'], confidence: 0.8,
  },
  aiSystem: { type: 'feature', outputTypes: ['text'] },
  jurisdiction: { primary: 'EU', regulations: ['eu-ai-act'] },
  organization: { role: 'deployer' },
  business: { domain: 'healthcare', companySize: 'startup' },
  data: { types: ['personal', 'health'], storage: 'eu' },
  goals: { priority: 'full', budget: 'moderate' },
  computed: { riskLevel: 'high', applicableObligations: ['OBL-001'], estimatedScore: 25 },
};

const mockScore: ScoreBreakdown = {
  totalScore: 52,
  zone: 'yellow',
  categoryScores: [],
  criticalCapApplied: false,
  totalChecks: 30,
  passedChecks: 15,
  failedChecks: 12,
  skippedChecks: 3,
};

describe('What-If Scenario Engine', () => {
  it('jurisdiction scenario — EU + UK', () => {
    const result = analyzeScenario({
      type: 'jurisdiction',
      params: { jurisdiction: 'UK' },
      currentProfile: mockProfile,
      currentScore: mockScore,
    });

    expect(result.scoreDelta).toBeLessThan(0);
    expect(result.projectedScore).toBeLessThan(52);
    expect(result.newObligations.length).toBeGreaterThan(0);
    expect(result.scenario).toContain('UK');
    expect(result.effort.estimatedWeeks).toBeGreaterThan(0);
  });

  it('tool scenario — add Whisper', () => {
    const result = analyzeScenario({
      type: 'tool',
      params: { tool: 'whisper' },
      currentProfile: mockProfile,
      currentScore: mockScore,
    });

    expect(result.scoreDelta).toBe(-5);
    expect(result.projectedScore).toBe(47);
    expect(result.newObligations).toContain('Audio data retention');
  });

  it('tool scenario — add DALL-E', () => {
    const result = analyzeScenario({
      type: 'tool',
      params: { tool: 'dall-e' },
      currentProfile: mockProfile,
      currentScore: mockScore,
    });

    expect(result.scoreDelta).toBe(-8);
    expect(result.newObligations).toContain('Art. 50.2 content marking');
  });

  it('risk level scenario — limited to high', () => {
    const limitedProfile = { ...mockProfile, computed: { ...mockProfile.computed, riskLevel: 'limited' as const } };
    const result = analyzeScenario({
      type: 'risk_level',
      params: { level: 'high' },
      currentProfile: limitedProfile,
      currentScore: mockScore,
    });

    expect(result.scoreDelta).toBe(-20);
    expect(result.newObligations.length).toBeGreaterThan(0);
    expect(result.recommendation).toContain('high');
  });

  it('unknown scenario type returns neutral result', () => {
    const result = analyzeScenario({
      type: 'unknown' as any,
      params: {},
      currentProfile: mockProfile,
      currentScore: mockScore,
    });

    expect(result.scoreDelta).toBe(0);
    expect(result.projectedScore).toBe(52);
  });
});

describe('Config Fixer', () => {
  it('generates all 3 config types', () => {
    const configs = generateAllConfigs(mockProfile);
    expect(configs).toHaveLength(3);
    expect(configs.map((c) => c.type)).toEqual(['docker-compose', 'env', 'ci-cd']);
  });

  it('docker-compose includes audit-db for all profiles', () => {
    const config = generateDockerCompose(mockProfile);
    expect(config.content).toContain('audit-db');
    expect(config.content).toContain('AI_DISCLOSURE_ENABLED=true');
  });

  it('docker-compose includes monitoring for high-risk', () => {
    const config = generateDockerCompose(mockProfile);
    expect(config.content).toContain('monitoring');
    expect(config.content).toContain('prometheus');
  });

  it('env includes data protection for health data', () => {
    const config = generateEnvExample(mockProfile);
    expect(config.content).toContain('DATA_RETENTION_DAYS');
    expect(config.content).toContain('DATA_ENCRYPTION_AT_REST');
  });

  it('CI workflow uses correct threshold for risk level', () => {
    const configs = generateAllConfigs(mockProfile);
    const ciConfig = configs.find((c) => c.type === 'ci-cd')!;
    expect(ciConfig.content).toContain('--threshold 70'); // high-risk = 70
    expect(ciConfig.filename).toBe('.github/workflows/compliance-check.yml');
  });
});
