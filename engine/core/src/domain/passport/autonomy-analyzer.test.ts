import { describe, it, expect } from 'vitest';
import type { L4CheckResult } from '../scanner/layers/layer4-patterns.js';
import type { PatternCategory } from '../scanner/rules/pattern-rules.js';
import { analyzeAutonomy } from './autonomy-analyzer.js';

// --- Helpers ---

const createL4Result = (
  category: PatternCategory,
  patternType: 'positive' | 'negative',
  status: 'FOUND' | 'NOT_FOUND',
): L4CheckResult => ({
  obligationId: 'OBL-001',
  article: 'Art.14',
  category,
  patternType,
  status,
  matchedPattern: 'test-pattern',
  recommendation: 'test recommendation',
});

// --- Tests ---

describe('analyzeAutonomy', () => {
  it('returns L1 when no gates and no unsupervised', () => {
    const results: readonly L4CheckResult[] = [];

    const analysis = analyzeAutonomy(results);

    expect(analysis.level).toBe('L1');
  });

  it('returns L2 when human gates but no unsupervised', () => {
    const results: readonly L4CheckResult[] = [
      createL4Result('human-oversight', 'positive', 'FOUND'),
    ];

    const analysis = analyzeAutonomy(results);

    expect(analysis.level).toBe('L2');
  });

  it('returns L3 when both human gates and unsupervised', () => {
    const results: readonly L4CheckResult[] = [
      createL4Result('human-oversight', 'positive', 'FOUND'),
      createL4Result('bare-llm', 'negative', 'FOUND'),
    ];

    const analysis = analyzeAutonomy(results);

    expect(analysis.level).toBe('L3');
  });

  it('returns L4 when unsupervised with logging', () => {
    const results: readonly L4CheckResult[] = [
      createL4Result('bare-llm', 'negative', 'FOUND'),
      createL4Result('logging', 'positive', 'FOUND'),
    ];

    const analysis = analyzeAutonomy(results);

    expect(analysis.level).toBe('L4');
  });

  it('returns L5 when unsupervised without logging', () => {
    const results: readonly L4CheckResult[] = [
      createL4Result('bare-llm', 'negative', 'FOUND'),
    ];

    const analysis = analyzeAutonomy(results);

    expect(analysis.level).toBe('L5');
  });

  it('maps L1/L2 to assistive, L3 to hybrid, L4/L5 to autonomous', () => {
    // L1 → assistive
    const l1 = analyzeAutonomy([]);
    expect(l1.agentType).toBe('assistive');

    // L2 → assistive
    const l2 = analyzeAutonomy([
      createL4Result('human-oversight', 'positive', 'FOUND'),
    ]);
    expect(l2.agentType).toBe('assistive');

    // L3 → hybrid
    const l3 = analyzeAutonomy([
      createL4Result('human-oversight', 'positive', 'FOUND'),
      createL4Result('bare-llm', 'negative', 'FOUND'),
    ]);
    expect(l3.agentType).toBe('hybrid');

    // L4 → autonomous
    const l4 = analyzeAutonomy([
      createL4Result('bare-llm', 'negative', 'FOUND'),
      createL4Result('logging', 'positive', 'FOUND'),
    ]);
    expect(l4.agentType).toBe('autonomous');

    // L5 → autonomous
    const l5 = analyzeAutonomy([
      createL4Result('bare-llm', 'negative', 'FOUND'),
    ]);
    expect(l5.agentType).toBe('autonomous');
  });

  it('tracks evidence correctly', () => {
    const results: readonly L4CheckResult[] = [
      createL4Result('human-oversight', 'positive', 'FOUND'),
      createL4Result('human-oversight', 'positive', 'FOUND'),
      createL4Result('bare-llm', 'negative', 'FOUND'),
    ];

    const analysis = analyzeAutonomy(results);

    expect(analysis.evidence.human_approval_gates).toBe(2);
    expect(analysis.evidence.unsupervised_actions).toBe(1);
    expect(analysis.evidence.no_logging_actions).toBe(1);
    expect(analysis.evidence.auto_rated).toBe(true);
  });
});
