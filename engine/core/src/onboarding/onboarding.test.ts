import { describe, it, expect } from 'vitest';
import { QUESTION_BLOCKS, getAllBlockIds } from './questions.js';
import {
  buildProfile,
  computeRiskLevel,
  computeApplicableObligations,
  computeApplicableObligationsDynamic,
  validateProfile,
  type ObligationFilterParams,
} from './profile.js';
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

// ── V1-M09 T-6: Onboarding Questions (enriched) ────────────

describe('Onboarding Questions', () => {
  it('has 5 question blocks with 9 questions total', () => {
    expect(QUESTION_BLOCKS).toHaveLength(5);
    expect(getAllBlockIds()).toEqual(['role', 'business', 'data', 'system', 'deployment']);

    const totalQuestions = QUESTION_BLOCKS.reduce((sum, b) => sum + b.questions.length, 0);
    expect(totalQuestions).toBe(9);
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

  it('system block has system_type and gpai_model questions', () => {
    const systemBlock = QUESTION_BLOCKS.find((b) => b.id === 'system');
    expect(systemBlock).toBeDefined();
    const ids = systemBlock!.questions.map((q) => q.id);
    expect(ids).toContain('system_type');
    expect(ids).toContain('gpai_model');
  });

  it('deployment block has user_facing, autonomous_decisions, biometric_data', () => {
    const deployBlock = QUESTION_BLOCKS.find((b) => b.id === 'deployment');
    expect(deployBlock).toBeDefined();
    const ids = deployBlock!.questions.map((q) => q.id);
    expect(ids).toContain('user_facing');
    expect(ids).toContain('autonomous_decisions');
    expect(ids).toContain('biometric_data');
  });
});

// ── V1-M09 T-6: Dynamic Obligation Filtering ───────────────

describe('Dynamic Obligation Filtering (computeApplicableObligationsDynamic)', () => {
  it('deployer + limited + no GPAI → 16 obligations', () => {
    const result = computeApplicableObligationsDynamic({
      role: 'deployer',
      riskLevel: 'limited',
      gpaiModel: false,
    });
    expect(result).toHaveLength(16);
    // All obligation IDs should start with eu-ai-act-OBL-
    for (const id of result) {
      expect(id).toMatch(/^eu-ai-act-OBL-/);
    }
  });

  it('deployer + high + GPAI → 46 obligations', () => {
    const result = computeApplicableObligationsDynamic({
      role: 'deployer',
      riskLevel: 'high',
      gpaiModel: true,
    });
    expect(result).toHaveLength(46);
  });

  it('provider + high + GPAI → 77 obligations', () => {
    const result = computeApplicableObligationsDynamic({
      role: 'provider',
      riskLevel: 'high',
      gpaiModel: true,
    });
    expect(result).toHaveLength(77);
  });

  it('both + high + GPAI → 92 obligations', () => {
    const result = computeApplicableObligationsDynamic({
      role: 'both',
      riskLevel: 'high',
      gpaiModel: true,
    });
    expect(result).toHaveLength(92);
  });

  it('excludes GPAI obligations when gpaiModel=false', () => {
    const withGpai = computeApplicableObligationsDynamic({
      role: 'provider',
      riskLevel: 'high',
      gpaiModel: true,
    });
    const withoutGpai = computeApplicableObligationsDynamic({
      role: 'provider',
      riskLevel: 'high',
      gpaiModel: false,
    });
    // GPAI adds 14 extra obligations
    expect(withGpai.length).toBeGreaterThan(withoutGpai.length);
    expect(withGpai.length - withoutGpai.length).toBeGreaterThanOrEqual(10);
  });

  it('deployer sees fewer obligations than provider for same risk+GPAI', () => {
    const deployer = computeApplicableObligationsDynamic({
      role: 'deployer',
      riskLevel: 'high',
      gpaiModel: true,
    });
    const provider = computeApplicableObligationsDynamic({
      role: 'provider',
      riskLevel: 'high',
      gpaiModel: true,
    });
    expect(deployer.length).toBeLessThan(provider.length);
  });

  it('returns no duplicates', () => {
    const result = computeApplicableObligationsDynamic({
      role: 'both',
      riskLevel: 'high',
      gpaiModel: true,
    });
    const unique = new Set(result);
    expect(unique.size).toBe(result.length);
  });
});

// ── V1-M09 T-6: ProfileSchema with new fields ──────────────

describe('ProfileSchema validates new fields', () => {
  it('builds profile with gpaiModel, autonomousDecisions, biometricData, userFacing', () => {
    const profile = buildProfile(mockAutoDetect, {
      org_role: 'provider',
      domain: 'healthcare',
      data_types: ['personal', 'health'],
      data_storage: 'eu',
      system_type: 'standalone',
      gpai_model: 'yes',
      user_facing: 'yes',
      autonomous_decisions: 'yes',
      biometric_data: 'no',
    });

    // New aiSystem fields
    expect(profile.aiSystem.gpaiModel).toBe(true);
    expect(profile.aiSystem.userFacing).toBe(true);
    expect(profile.aiSystem.autonomousDecisions).toBe(true);
    expect(profile.aiSystem.biometricData).toBe(false);

    // New computed fields
    expect(profile.computed.gpaiModel).toBe(true);
    expect(profile.computed.autonomousDecisions).toBe(true);
    expect(profile.computed.biometricData).toBe(false);
    expect(profile.computed.userFacing).toBe(true);
  });

  it('validates profile with new fields', () => {
    const profile = buildProfile(mockAutoDetect, {
      org_role: 'provider',
      domain: 'healthcare',
      data_types: ['health'],
      data_storage: 'eu',
      gpai_model: 'yes',
      user_facing: 'yes',
      autonomous_decisions: 'no',
      biometric_data: 'no',
    });
    const result = validateProfile(profile);
    expect(result.valid).toBe(true);
  });

  it('profile uses dynamic obligations (more than static 36)', () => {
    const profile = buildProfile(mockAutoDetect, {
      org_role: 'provider',
      domain: 'healthcare',
      data_types: ['health'],
      data_storage: 'eu',
      gpai_model: 'yes',
    });
    // Dynamic: provider + high + GPAI = 77 obligations (not static 20-25)
    expect(profile.computed.applicableObligations.length).toBeGreaterThan(36);
  });

  it('biometric_data answer propagates to profile', () => {
    const profile = buildProfile(mockAutoDetect, {
      org_role: 'deployer',
      domain: 'general',
      data_types: ['personal'],
      data_storage: 'eu',
      biometric_data: 'yes',
    });
    expect(profile.aiSystem.biometricData).toBe(true);
    expect(profile.computed.biometricData).toBe(true);
  });

  it('gpai_model=unknown uses auto-detect fallback', () => {
    // mockAutoDetect has no gpaiModelDetected field → default false
    const profile = buildProfile(mockAutoDetect, {
      org_role: 'deployer',
      domain: 'general',
      data_types: ['public'],
      data_storage: 'eu',
      gpai_model: 'unknown',
    });
    expect(profile.aiSystem.gpaiModel).toBe(false);
  });
});

// ── Original tests (kept for backward compat) ──────────────

describe('Profile Builder', () => {
  it('builds complete profile with computed fields', () => {
    const profile = buildProfile(mockAutoDetect, {
      org_role: 'deployer',
      domain: 'healthcare',
      data_types: ['personal', 'health'],
      data_storage: 'eu',
    });

    expect(profile.version).toBe('1.0');
    expect(profile.autoDetected.language).toBe('TypeScript');
    expect(profile.aiSystem.type).toBe('feature'); // default
    expect(profile.jurisdiction.primary).toBe('EU'); // default
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

  it('high-risk adds extra obligations (legacy)', () => {
    const high = computeApplicableObligations('healthcare', 'high');
    const limited = computeApplicableObligations('general', 'limited');
    expect(high.length).toBeGreaterThan(limited.length);
  });
});
