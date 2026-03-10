import { describe, it, expect } from 'vitest';
import { REGISTRY_CARDS, findRegistryCard, findRegistryCardsByProvider, REGISTRY_SLUG_PATTERN, isGpaiSystemic, getProviderName } from '../../data/registry-cards.js';
import { analyzeSupplyChain, SUPPLY_CHAIN_OBLIGATIONS } from './dependency-analyzer.js';
import type { ParsedDependency } from '../scanner/layers/layer3-parsers.js';

// --- Registry Cards Tests ---

describe('RegistryToolCards', () => {
  it('contains 10 registry cards', () => {
    expect(REGISTRY_CARDS).toHaveLength(10);
  });

  it('all cards have required fields', () => {
    for (const card of REGISTRY_CARDS) {
      expect(card.slug).toBeTruthy();
      expect(card.name).toBeTruthy();
      expect(card.provider.name).toBeTruthy();
      expect(card.capabilities!.length).toBeGreaterThan(0);
      expect(card.assessments?.['eu-ai-act']?.training_cutoff).toBeTruthy();
      expect(card.assessments?.['eu-ai-act']?.license).toBeTruthy();
      expect(card.assessments?.['eu-ai-act']?.limitations!.length).toBeGreaterThan(0);
      expect(card.assessments?.['eu-ai-act']?.known_risks!.length).toBeGreaterThan(0);
      expect(card.assessments?.['eu-ai-act']?.risk_reasoning).toBeTruthy();
    }
  });

  it('findRegistryCard returns card by slug', () => {
    const card = findRegistryCard('gpt-4o');
    expect(card).toBeDefined();
    expect(card!.name).toBe('GPT-4o');
    expect(card!.provider.name).toBe('OpenAI');
  });

  it('findRegistryCard returns undefined for unknown slug', () => {
    expect(findRegistryCard('nonexistent-model')).toBeUndefined();
  });

  it('findRegistryCardsByProvider filters correctly', () => {
    const anthropicCards = findRegistryCardsByProvider('Anthropic');
    expect(anthropicCards).toHaveLength(2);
    for (const card of anthropicCards) {
      expect(card.provider.name).toBe('Anthropic');
    }
  });

  it('REGISTRY_SLUG_PATTERN matches known model slugs', () => {
    const text = 'Using gpt-4o and claude-sonnet-4 models';
    const matches = [...text.matchAll(new RegExp(REGISTRY_SLUG_PATTERN.source, 'g'))].map((m) => m[0]);
    expect(matches).toContain('gpt-4o');
    expect(matches).toContain('claude-sonnet-4');
  });

  it('REGISTRY_SLUG_PATTERN does not false-positive on embedded substrings', () => {
    const text = 'ratio1 protocol1 foo1bar';
    const matches = [...text.matchAll(new RegExp(REGISTRY_SLUG_PATTERN.source, 'g'))];
    expect(matches).toHaveLength(0);
  });

  it('REGISTRY_SLUG_PATTERN is derived from REGISTRY_CARDS data', () => {
    for (const card of REGISTRY_CARDS) {
      const text = `model: ${card.slug}`;
      const matches = [...text.matchAll(new RegExp(REGISTRY_SLUG_PATTERN.source, 'g'))].map((m) => m[0]);
      expect(matches).toContain(card.slug);
    }
  });

  it('isGpaiSystemic correctly identifies systemic risk', () => {
    const gpt4o = findRegistryCard('gpt-4o')!;
    expect(isGpaiSystemic(gpt4o)).toBe(true);

    const gpt4oMini = findRegistryCard('gpt-4o-mini')!;
    expect(isGpaiSystemic(gpt4oMini)).toBe(false);
  });

  it('getProviderName extracts provider name', () => {
    const card = findRegistryCard('gpt-4o')!;
    expect(getProviderName(card)).toBe('OpenAI');

    const mistral = findRegistryCard('mistral-large')!;
    expect(getProviderName(mistral)).toBe('Mistral AI');
  });
});

// --- Analyzer Tests ---

describe('analyzeSupplyChain', () => {
  it('returns zero risk for empty dependencies', () => {
    const report = analyzeSupplyChain('/test', [], []);
    expect(report.totalDependencies).toBe(0);
    expect(report.aiSdkCount).toBe(0);
    expect(report.bannedCount).toBe(0);
    expect(report.risks).toHaveLength(0);
    expect(report.riskScore).toBe(0);
  });

  it('detects banned packages as critical risk', () => {
    const deps: ParsedDependency[] = [
      { name: 'clearview-ai', version: '1.0.0', ecosystem: 'npm' },
    ];
    const report = analyzeSupplyChain('/test', deps, []);
    expect(report.bannedCount).toBe(1);
    expect(report.risks.length).toBeGreaterThanOrEqual(1);
    const bannedRisk = report.risks.find((r) => r.type === 'banned-package');
    expect(bannedRisk).toBeDefined();
    expect(bannedRisk!.severity).toBe('critical');
    expect(bannedRisk!.articleRef).toBe('Art.5');
  });

  it('counts AI SDK packages', () => {
    const deps: ParsedDependency[] = [
      { name: 'openai', version: '4.0.0', ecosystem: 'npm' },
      { name: '@anthropic-ai/sdk', version: '1.0.0', ecosystem: 'npm' },
      { name: 'express', version: '4.18.0', ecosystem: 'npm' },
    ];
    const report = analyzeSupplyChain('/test', deps, []);
    expect(report.aiSdkCount).toBe(2);
    expect(report.totalDependencies).toBe(3);
  });

  it('flags missing bias testing when AI SDKs present', () => {
    const deps: ParsedDependency[] = [
      { name: 'openai', version: '4.0.0', ecosystem: 'npm' },
    ];
    const report = analyzeSupplyChain('/test', deps, []);
    const biasRisk = report.risks.find((r) => r.type === 'missing-bias-testing');
    expect(biasRisk).toBeDefined();
    expect(biasRisk!.severity).toBe('medium');
  });

  it('no bias testing warning when bias package present', () => {
    const deps: ParsedDependency[] = [
      { name: 'openai', version: '4.0.0', ecosystem: 'npm' },
      { name: 'fairlearn', version: '0.9.0', ecosystem: 'pip' },
    ];
    const report = analyzeSupplyChain('/test', deps, []);
    const biasRisk = report.risks.find((r) => r.type === 'missing-bias-testing');
    expect(biasRisk).toBeUndefined();
  });

  it('matches detected models to cards', () => {
    const report = analyzeSupplyChain('/test', [], ['gpt-4o', 'claude-sonnet-4']);
    expect(report.registryCards).toHaveLength(2);
    expect(report.detectedModels).toEqual(['gpt-4o', 'claude-sonnet-4']);
  });

  it('flags GPAI systemic models as high risk', () => {
    const report = analyzeSupplyChain('/test', [], ['gpt-4o']);
    const systemicRisk = report.risks.find((r) => r.type === 'gpai-systemic');
    expect(systemicRisk).toBeDefined();
    expect(systemicRisk!.severity).toBe('high');
    expect(systemicRisk!.articleRef).toBe('Art.51');
  });

  it('computes risk score correctly (capped at 100)', () => {
    // 5 banned packages = 5 × 25 = 125 → capped at 100
    const deps: ParsedDependency[] = [
      { name: 'clearview-ai', version: '1.0', ecosystem: 'npm' },
      { name: 'social-credit-score', version: '1.0', ecosystem: 'npm' },
      { name: 'predictive-policing', version: '1.0', ecosystem: 'npm' },
      { name: 'emotion-recognition', version: '1.0', ecosystem: 'npm' },
      { name: 'subliminal-ai', version: '1.0', ecosystem: 'npm' },
    ];
    const report = analyzeSupplyChain('/test', deps, []);
    expect(report.riskScore).toBe(100);
  });

  it('flags AI SDKs without registry cards', () => {
    const deps: ParsedDependency[] = [
      { name: 'replicate', version: '1.0.0', ecosystem: 'npm' },
    ];
    const report = analyzeSupplyChain('/test', deps, []);
    const noCardRisk = report.risks.find((r) => r.type === 'ai-sdk-no-card');
    expect(noCardRisk).toBeDefined();
    expect(noCardRisk!.severity).toBe('low');
    expect(noCardRisk!.packageName).toBe('replicate');
  });
});

// --- Integration Tests ---

describe('SupplyChain integration', () => {
  it('report is frozen', () => {
    const report = analyzeSupplyChain('/test', [], []);
    expect(Object.isFrozen(report)).toBe(true);
  });

  it('obligation refs include OBL-026', () => {
    const report = analyzeSupplyChain('/test', [], []);
    expect(report.obligationRefs).toContain('OBL-026');
    expect(report.obligationRefs).toContain('OBL-005');
  });

  it('report has valid structure', () => {
    const deps: ParsedDependency[] = [
      { name: 'openai', version: '4.0.0', ecosystem: 'npm' },
    ];
    const report = analyzeSupplyChain('/test', deps, ['gpt-4o']);
    expect(report.projectPath).toBe('/test');
    expect(report.timestamp).toBeTruthy();
    expect(typeof report.duration).toBe('number');
    expect(report.totalDependencies).toBe(1);
    expect(report.aiSdkCount).toBe(1);
    expect(report.registryCards.length).toBeGreaterThan(0);
    expect(report.riskScore).toBeGreaterThanOrEqual(0);
    expect(report.riskScore).toBeLessThanOrEqual(100);
  });

  it('SUPPLY_CHAIN_OBLIGATIONS is correct', () => {
    expect(SUPPLY_CHAIN_OBLIGATIONS).toEqual(['OBL-026', 'OBL-005']);
  });
});
