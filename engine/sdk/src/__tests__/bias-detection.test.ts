import { describe, it, expect } from 'vitest';
import { biasCheckHook } from '../hooks/post/bias-check.js';
import { BiasDetectedError } from '../errors.js';
import type { BiasEvidence } from '../errors.js';
import type { MiddlewareContext, MiddlewareConfig } from '../types.js';
import { BIAS_PATTERNS, ALL_CHARACTERISTICS } from '../data/bias-patterns.js';
import { BIAS_PROFILES, getProfile } from '../data/bias-profiles.js';

const makeCtx = (
  metadata: Record<string, unknown> = {},
  configOverrides: Partial<MiddlewareConfig> = {},
): MiddlewareContext => ({
  provider: 'openai',
  method: 'create',
  config: { jurisdictions: ['EU'], ...configOverrides },
  params: {},
  metadata,
});

const openaiResponse = (content: string) => ({
  choices: [{ message: { content } }],
});

const anthropicResponse = (text: string) => ({
  content: [{ text }],
});

describe('US-S05-05: Bias Detection Hook', () => {
  // ── 15 Protected Characteristics Coverage ──────────────────────

  describe('15 EU Charter Art.21 characteristics', () => {
    it('has patterns defined for all 15 characteristics', () => {
      expect(ALL_CHARACTERISTICS).toHaveLength(16); // 15 + nationality as additional
      const coveredCharacteristics = new Set(BIAS_PATTERNS.map((p) => p.characteristic));
      for (const c of ALL_CHARACTERISTICS) {
        expect(coveredCharacteristics.has(c)).toBe(true);
      }
    });

    it('has at least 35 total patterns', () => {
      expect(BIAS_PATTERNS.length).toBeGreaterThanOrEqual(35);
    });
  });

  // ── Sex bias detection ─────────────────────────────────────────

  describe('sex', () => {
    it('detects gender capability stereotype (MEDIUM — triggers with strict threshold)', async () => {
      const response = openaiResponse('Women always cannot handle leadership positions.');
      // MEDIUM pattern: score 0.09 < default 0.3, but flagged with strict threshold
      const result = await biasCheckHook(makeCtx({}, { biasThreshold: 0.01 }), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
      const findings = result.metadata['biasFindings'] as BiasEvidence[];
      expect(findings.some((f) => f.characteristic === 'sex')).toBe(true);
    });

    it('detects gender-based selection preference (HIGH — exceeds default)', async () => {
      const response = openaiResponse('We should prefer male candidates for this engineering role.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });
  });

  // ── Race bias detection ────────────────────────────────────────

  describe('race', () => {
    it('detects racial supremacy language (CRITICAL)', async () => {
      const response = openaiResponse('Some groups are inherently superior to others.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
      const findings = result.metadata['biasFindings'] as BiasEvidence[];
      expect(findings.some((f) => f.severity === 'CRITICAL')).toBe(true);
    });

    it('detects explicit racial hierarchy (CRITICAL)', async () => {
      const response = openaiResponse('White people are superior to others in this field.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });

    it('detects racial generalization (MEDIUM — with strict threshold)', async () => {
      const response = openaiResponse('All people of that race are prone to certain behaviors.');
      const result = await biasCheckHook(makeCtx({}, { biasThreshold: 0.01 }), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });
  });

  // ── Disability bias ────────────────────────────────────────────

  describe('disability', () => {
    it('detects disability-related slur (CRITICAL)', async () => {
      const response = openaiResponse('That person is a retard and cannot work here.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
      const findings = result.metadata['biasFindings'] as BiasEvidence[];
      expect(findings.some((f) => f.characteristic === 'disability' && f.severity === 'CRITICAL')).toBe(true);
    });

    it('detects disability capability stereotype (HIGH)', async () => {
      const response = openaiResponse('Disabled people are unable to perform this job and are a burden.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });
  });

  // ── Age bias ───────────────────────────────────────────────────

  describe('age', () => {
    it('detects age-based capability bias (MEDIUM — with strict threshold)', async () => {
      const response = openaiResponse('Older employees are too slow and obsolete for modern tech.');
      const result = await biasCheckHook(makeCtx({}, { biasThreshold: 0.01 }), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });

    it('detects age-based selection preference (HIGH)', async () => {
      const response = openaiResponse('We should prefer younger candidates for this role.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });
  });

  // ── Religion bias ──────────────────────────────────────────────

  describe('religion', () => {
    it('detects religious group stereotype', async () => {
      const response = openaiResponse('Muslim people should not be trusted in security positions.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });
  });

  // ── Sexual orientation ─────────────────────────────────────────

  describe('sexual_orientation', () => {
    it('detects LGBTQ+ pathologization (CRITICAL)', async () => {
      const response = openaiResponse('Being gay is abnormal and a disease.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
      const findings = result.metadata['biasFindings'] as BiasEvidence[];
      expect(findings.some((f) => f.characteristic === 'sexual_orientation' && f.severity === 'CRITICAL')).toBe(true);
    });
  });

  // ── Ethnic origin ──────────────────────────────────────────────

  describe('ethnic_origin', () => {
    it('detects xenophobic directives', async () => {
      const response = openaiResponse('Immigrants should go back to their country.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });
  });

  // ── Nationality ────────────────────────────────────────────────

  describe('nationality', () => {
    it('detects nationality-based stereotypes', async () => {
      const response = openaiResponse('All Germans are rude and unfriendly to foreigners.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });
  });

  // ── Safe content ───────────────────────────────────────────────

  describe('safe content', () => {
    it('passes clean technical text', async () => {
      const response = openaiResponse('The algorithm processes data using a convolutional neural network with 3 layers.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(true);
      expect(result.metadata['biasScore']).toBe(0);
      expect(result.headers['X-Bias-Warning']).toBeUndefined();
    });

    it('passes balanced diversity discussion', async () => {
      const response = openaiResponse('Our team includes people from many backgrounds and we value diverse perspectives.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(true);
    });
  });

  // ── Weighted scoring ───────────────────────────────────────────

  describe('weighted scoring', () => {
    it('calculates score as weight × severity', async () => {
      const response = openaiResponse('This group is inherently superior to others.');
      const result = await biasCheckHook(makeCtx(), response);
      const score = result.metadata['biasScore'] as number;
      expect(score).toBeGreaterThan(0);
    });

    it('accumulates scores from multiple findings', async () => {
      const response = openaiResponse('Women always cannot do this. Older employees are too slow and obsolete.');
      const result = await biasCheckHook(makeCtx(), response);
      const findings = result.metadata['biasFindings'] as BiasEvidence[];
      expect(findings.length).toBeGreaterThanOrEqual(2);
      const score = result.metadata['biasScore'] as number;
      const sumOfFindings = findings.reduce((acc, f) => acc + f.score, 0);
      expect(score).toBeCloseTo(sumOfFindings, 5);
    });
  });

  // ── Domain profiles ────────────────────────────────────────────

  describe('domain profiles', () => {
    it('HR domain has stricter threshold (0.15)', () => {
      const profile = getProfile('hr');
      expect(profile.threshold).toBe(0.15);
      expect(profile.weightOverrides['sex']).toBe(2.0);
    });

    it('finance domain boosts property bias weight', () => {
      const profile = getProfile('finance');
      expect(profile.weightOverrides['property']).toBe(2.0);
    });

    it('healthcare domain boosts disability and genetic weights', () => {
      const profile = getProfile('healthcare');
      expect(profile.weightOverrides['disability']).toBe(2.0);
      expect(profile.weightOverrides['genetic_features']).toBe(2.0);
    });

    it('education domain boosts age and social_origin weights', () => {
      const profile = getProfile('education');
      expect(profile.weightOverrides['age']).toBe(2.0);
      expect(profile.weightOverrides['social_origin']).toBe(2.0);
    });

    it('unknown domain falls back to general', () => {
      const profile = getProfile('unknown');
      expect(profile.name).toBe('general');
      expect(profile.threshold).toBe(0.3);
    });

    it('HR domain applies weight multiplier in hook', async () => {
      const response = openaiResponse('Women always cannot handle leadership positions.');
      const generalResult = await biasCheckHook(makeCtx(), response);
      const hrResult = await biasCheckHook(makeCtx({}, { domain: 'hr' }), response);
      const generalScore = generalResult.metadata['biasScore'] as number;
      const hrScore = hrResult.metadata['biasScore'] as number;
      // HR has 2x weight for sex, so score should be higher
      expect(hrScore).toBeGreaterThan(generalScore);
    });

    it('all 5 profiles are defined', () => {
      expect(Object.keys(BIAS_PROFILES)).toEqual(['general', 'hr', 'finance', 'healthcare', 'education']);
    });
  });

  // ── Configurable threshold ─────────────────────────────────────

  describe('configurable threshold', () => {
    it('uses custom biasThreshold from config', async () => {
      // Very low-weight match should pass default (0.3) but fail with ultra-strict threshold
      const response = openaiResponse('Women always cannot handle this.');
      const lenientResult = await biasCheckHook(makeCtx({}, { biasThreshold: 99 }), response);
      expect(lenientResult.metadata['biasCheckPassed']).toBe(true);

      const strictResult = await biasCheckHook(makeCtx({}, { biasThreshold: 0.001 }), response);
      expect(strictResult.metadata['biasCheckPassed']).toBe(false);
    });
  });

  // ── biasAction: block mode ─────────────────────────────────────

  describe('biasAction: block', () => {
    it('throws BiasDetectedError when action=block and bias found', () => {
      const ctx = makeCtx({}, { biasAction: 'block' });
      const response = openaiResponse('This group is inherently superior to others.');

      expect(() => biasCheckHook(ctx, response)).toThrow(BiasDetectedError);
    });

    it('thrown error contains findings, score, threshold, domain', () => {
      const ctx = makeCtx({}, { biasAction: 'block' });
      const response = openaiResponse('This group is inherently superior to others.');

      try {
        biasCheckHook(ctx, response);
        expect.fail('Should have thrown');
      } catch (err) {
        const e = err as BiasDetectedError;
        expect(e.findings.length).toBeGreaterThan(0);
        expect(e.totalScore).toBeGreaterThan(0);
        expect(e.threshold).toBeDefined();
        expect(e.domain).toBe('general');
      }
    });

    it('does not throw in warn mode (default)', async () => {
      const response = openaiResponse('This group is inherently superior to others.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
      // No throw — just metadata
      expect(result.headers['X-Bias-Warning']).toBe('potential-bias-detected');
    });
  });

  // ── Provider format handling ───────────────────────────────────

  describe('provider formats', () => {
    it('works with Anthropic response format', async () => {
      const response = anthropicResponse('Disabled people are unable to work and are a burden.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });

    it('handles null/undefined response', async () => {
      const result = await biasCheckHook(makeCtx(), null);
      expect(result.metadata['biasCheckPassed']).toBe(true);
      expect(result.metadata['biasScore']).toBe(0);
    });

    it('handles string response directly', async () => {
      // CRITICAL pattern: inherently superior
      const result = await biasCheckHook(makeCtx(), 'This group is inherently superior to all others.');
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });
  });

  // ── Metadata output ────────────────────────────────────────────

  describe('metadata output', () => {
    it('includes biasScore, biasFindings, biasThreshold, biasDomain', async () => {
      const response = openaiResponse('Neutral technical content about machine learning.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.metadata).toHaveProperty('biasScore');
      expect(result.metadata).toHaveProperty('biasFindings');
      expect(result.metadata).toHaveProperty('biasThreshold');
      expect(result.metadata).toHaveProperty('biasDomain');
    });

    it('sets X-Bias-Score header when bias detected', async () => {
      const response = openaiResponse('This group is inherently superior to others.');
      const result = await biasCheckHook(makeCtx(), response);
      expect(result.headers['X-Bias-Score']).toBeDefined();
    });
  });
});
