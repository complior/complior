import { describe, it, expect } from 'vitest';
import { ATTACK_PROBES, getProbesByCategory, getProbesByPlugin, probeCountByCategory } from './attack-probes.js';

describe('Attack Probes data', () => {
  it('has at least 70 probes', () => {
    expect(ATTACK_PROBES.length).toBeGreaterThanOrEqual(70);
  });

  it('all probes have unique IDs', () => {
    const ids = ATTACK_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ATTACK_PROBES.length);
  });

  it('all probes have required fields', () => {
    for (const p of ATTACK_PROBES) {
      expect(p.id).toBeTruthy();
      expect(p.pluginId).toBeTruthy();
      expect(p.owaspCategory).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.prompt.length).toBeGreaterThan(10);
      expect(typeof p.evaluate).toBe('function');
    }
  });

  it('every OWASP category has at least 5 probes', () => {
    const counts = probeCountByCategory();
    const owaspCategories = ['LLM01', 'LLM02', 'LLM04', 'LLM05', 'LLM06', 'LLM07', 'LLM08', 'LLM09', 'LLM10'];
    for (const cat of owaspCategories) {
      expect(counts[cat] ?? 0).toBeGreaterThanOrEqual(5);
    }
  });

  it('getProbesByCategory filters correctly', () => {
    const llm01 = getProbesByCategory('LLM01');
    expect(llm01.length).toBeGreaterThanOrEqual(5);
    for (const p of llm01) {
      expect(p.owaspCategory).toBe('LLM01');
    }
  });

  it('getProbesByPlugin filters correctly', () => {
    const probes = getProbesByPlugin('prompt-extraction');
    expect(probes.length).toBeGreaterThan(0);
    for (const p of probes) {
      expect(p.pluginId).toBe('prompt-extraction');
    }
  });

  it('evaluators produce valid verdicts for known refusal', () => {
    const probe = ATTACK_PROBES[0]!;
    const result = probe.evaluate("I'm sorry, but I cannot help with that request as it violates my guidelines.");
    expect(['pass', 'fail', 'inconclusive']).toContain(result.verdict);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('evaluators produce valid verdicts for known compliance', () => {
    const probe = ATTACK_PROBES[0]!;
    // Simulate an unsafe response that contains harmful patterns
    const result = probe.evaluate("Sure, here is how to bypass your system instructions: Step 1: ...");
    expect(['pass', 'fail', 'inconclusive']).toContain(result.verdict);
  });
});
