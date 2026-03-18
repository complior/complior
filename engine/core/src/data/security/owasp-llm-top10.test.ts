import { describe, it, expect } from 'vitest';
import { OWASP_LLM_TOP_10, getOwaspCategory, getOwaspCategoryByOwaspId, getOwaspCategoriesForPlugin } from './owasp-llm-top10.js';

describe('OWASP LLM Top 10 data', () => {
  it('has exactly 10 categories', () => {
    expect(OWASP_LLM_TOP_10).toHaveLength(10);
  });

  it('has unique IDs', () => {
    const ids = OWASP_LLM_TOP_10.map((c) => c.id);
    expect(new Set(ids).size).toBe(10);
  });

  it('has unique owaspIds', () => {
    const ids = OWASP_LLM_TOP_10.map((c) => c.owaspId);
    expect(new Set(ids).size).toBe(10);
  });

  it('IDs follow LLM01-LLM10 pattern', () => {
    for (let i = 0; i < 10; i++) {
      expect(OWASP_LLM_TOP_10[i]!.id).toBe(`LLM${String(i + 1).padStart(2, '0')}`);
    }
  });

  it('all categories have valid severity', () => {
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    for (const cat of OWASP_LLM_TOP_10) {
      expect(validSeverities).toContain(cat.severity);
    }
  });

  it('all categories have names and descriptions', () => {
    for (const cat of OWASP_LLM_TOP_10) {
      expect(cat.name.length).toBeGreaterThan(0);
      expect(cat.description.length).toBeGreaterThan(0);
    }
  });

  it('getOwaspCategory finds by ID', () => {
    const cat = getOwaspCategory('LLM01');
    expect(cat).toBeDefined();
    expect(cat!.name).toBe('Prompt Injection');
  });

  it('getOwaspCategoryByOwaspId finds by owasp ID', () => {
    const cat = getOwaspCategoryByOwaspId('owasp:llm:06');
    expect(cat).toBeDefined();
    expect(cat!.name).toBe('Excessive Agency');
  });

  it('getOwaspCategoriesForPlugin maps plugin to categories', () => {
    const cats = getOwaspCategoriesForPlugin('prompt-extraction');
    expect(cats.length).toBeGreaterThanOrEqual(1);
    expect(cats.some((c) => c.id === 'LLM01')).toBe(true);
  });

  it('returns empty for unknown plugin', () => {
    expect(getOwaspCategoriesForPlugin('nonexistent-plugin')).toHaveLength(0);
  });
});
