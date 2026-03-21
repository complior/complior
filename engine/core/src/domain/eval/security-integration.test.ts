import { describe, it, expect } from 'vitest';
import { ATTACK_PROBES, getProbesByCategory, probeCountByCategory } from '../../data/security/attack-probes.js';
import {
  adaptProbesForEval,
  createSecurityProbeLoader,
  countByOwaspCategory,
  filterByOwaspCategory,
  filterBySeverity,
  calculateEvalSecurityScore,
  OWASP_LLM_CATEGORIES,
  OWASP_LLM_LABELS,
} from './security-integration.js';

describe('ATTACK_PROBES — extended (300)', () => {
  it('has exactly 300 probes', () => {
    expect(ATTACK_PROBES.length).toBe(300);
  });

  it('all probes have unique IDs (PROBE-001..PROBE-300)', () => {
    const ids = ATTACK_PROBES.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(300);
    expect(ids[0]).toBe('PROBE-001');
    expect(ids[299]).toBe('PROBE-300');
  });

  it('covers all 10 OWASP LLM categories + ART5', () => {
    const categories = new Set(ATTACK_PROBES.map((p) => p.owaspCategory));
    expect(categories.has('LLM01')).toBe(true);
    expect(categories.has('LLM02')).toBe(true);
    expect(categories.has('LLM03')).toBe(true);
    expect(categories.has('LLM04')).toBe(true);
    expect(categories.has('LLM05')).toBe(true);
    expect(categories.has('LLM06')).toBe(true);
    expect(categories.has('LLM07')).toBe(true);
    expect(categories.has('LLM08')).toBe(true);
    expect(categories.has('LLM09')).toBe(true);
    expect(categories.has('LLM10')).toBe(true);
    expect(categories.has('ART5')).toBe(true);
  });

  it('all probes have non-empty prompt and evaluate function', () => {
    for (const probe of ATTACK_PROBES) {
      expect(probe.prompt.length).toBeGreaterThan(10);
      expect(typeof probe.evaluate).toBe('function');
    }
  });

  it('evaluate returns proper structure', () => {
    const probe = ATTACK_PROBES[0]!;
    const result = probe.evaluate('I cannot help with that.');
    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('reasoning');
    expect(['pass', 'fail', 'inconclusive']).toContain(result.verdict);
  });

  it('per-category counts are reasonable', () => {
    const counts = probeCountByCategory();
    // LLM01 should be the largest (40)
    expect(counts['LLM01']).toBe(40);
    // ART5 should have 20
    expect(counts['ART5']).toBe(20);
    // LLM03 is new with 20
    expect(counts['LLM03']).toBe(20);
  });
});

describe('adaptProbesForEval', () => {
  it('converts all 300 probes', () => {
    const adapted = adaptProbesForEval(ATTACK_PROBES);
    expect(adapted.length).toBe(300);
  });

  it('preserves id, prompt, owaspCategory, severity', () => {
    const adapted = adaptProbesForEval(ATTACK_PROBES);
    const first = adapted[0]!;
    const original = ATTACK_PROBES[0]!;
    expect(first.id).toBe(original.id);
    expect(first.prompt).toBe(original.prompt);
    expect(first.owaspCategory).toBe(original.owaspCategory);
    expect(first.severity).toBe(original.severity);
  });

  it('evaluate returns { verdict, confidence, reasoning }', () => {
    const adapted = adaptProbesForEval(ATTACK_PROBES);
    const result = adapted[0]!.evaluate('I refuse to comply.');
    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('reasoning');
    // Should NOT have matchedPatterns (stripped in adapter)
    expect(result).not.toHaveProperty('matchedPatterns');
  });
});

describe('createSecurityProbeLoader', () => {
  it('returns lazy loader that caches', () => {
    const loader = createSecurityProbeLoader(ATTACK_PROBES);
    const first = loader();
    const second = loader();
    expect(first).toBe(second); // Same reference (cached)
    expect(first.length).toBe(300);
  });
});

describe('countByOwaspCategory', () => {
  it('counts adapted probes by category', () => {
    const adapted = adaptProbesForEval(ATTACK_PROBES);
    const counts = countByOwaspCategory(adapted);
    expect(counts['LLM01']).toBe(40);
    expect(counts['ART5']).toBe(20);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(300);
  });
});

describe('filterByOwaspCategory', () => {
  it('filters by category', () => {
    const adapted = adaptProbesForEval(ATTACK_PROBES);
    const art5 = filterByOwaspCategory(adapted, 'ART5');
    expect(art5.length).toBe(20);
    for (const p of art5) {
      expect(p.owaspCategory).toBe('ART5');
    }
  });
});

describe('filterBySeverity', () => {
  it('filters by severity', () => {
    const adapted = adaptProbesForEval(ATTACK_PROBES);
    const critical = filterBySeverity(adapted, 'critical');
    expect(critical.length).toBeGreaterThan(0);
    for (const p of critical) {
      expect(p.severity).toBe('critical');
    }
  });
});

describe('calculateEvalSecurityScore', () => {
  it('returns 100% when all pass', () => {
    const results = [
      { verdict: 'pass', owaspCategory: 'LLM01' },
      { verdict: 'pass', owaspCategory: 'LLM02' },
    ];
    const score = calculateEvalSecurityScore(results);
    expect(score.overall).toBe(100);
    expect(score.byCategory['LLM01']!.score).toBe(100);
  });

  it('returns 0% when all fail', () => {
    const results = [
      { verdict: 'fail', owaspCategory: 'LLM01' },
      { verdict: 'fail', owaspCategory: 'LLM01' },
    ];
    const score = calculateEvalSecurityScore(results);
    expect(score.overall).toBe(0);
  });

  it('returns 50% for mixed results', () => {
    const results = [
      { verdict: 'pass', owaspCategory: 'LLM01' },
      { verdict: 'fail', owaspCategory: 'LLM01' },
    ];
    const score = calculateEvalSecurityScore(results);
    expect(score.overall).toBe(50);
  });

  it('handles empty results', () => {
    const score = calculateEvalSecurityScore([]);
    expect(score.overall).toBe(0);
  });

  it('calculates per-category breakdown', () => {
    const results = [
      { verdict: 'pass', owaspCategory: 'LLM01' },
      { verdict: 'pass', owaspCategory: 'LLM01' },
      { verdict: 'fail', owaspCategory: 'LLM02' },
    ];
    const score = calculateEvalSecurityScore(results);
    expect(score.byCategory['LLM01']!.score).toBe(100);
    expect(score.byCategory['LLM02']!.score).toBe(0);
    expect(score.overall).toBe(67); // 2/3
  });
});

describe('OWASP_LLM_CATEGORIES', () => {
  it('has 11 categories', () => {
    expect(OWASP_LLM_CATEGORIES.length).toBe(11);
  });

  it('all have labels', () => {
    for (const cat of OWASP_LLM_CATEGORIES) {
      expect(OWASP_LLM_LABELS[cat]).toBeTruthy();
    }
  });
});
