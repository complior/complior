import { describe, it, expect } from 'vitest';
import {
  EvalCategorySchema,
  EvalTierSchema,
  EvalOptionsSchema,
  AuditOptionsSchema,
  EVAL_CATEGORIES,
  EVAL_TIERS,
  CATEGORY_META,
  TIER_INCLUDES,
} from './types.js';

describe('EvalCategory', () => {
  it('has 11 categories', () => {
    expect(EVAL_CATEGORIES).toHaveLength(11);
  });

  it('validates known categories', () => {
    for (const cat of EVAL_CATEGORIES) {
      expect(EvalCategorySchema.parse(cat)).toBe(cat);
    }
  });

  it('rejects unknown category', () => {
    expect(() => EvalCategorySchema.parse('unknown')).toThrow();
  });
});

describe('CATEGORY_META', () => {
  it('has metadata for all 11 categories', () => {
    expect(CATEGORY_META).toHaveLength(11);
    const ids = CATEGORY_META.map((m) => m.id);
    for (const cat of EVAL_CATEGORIES) {
      expect(ids).toContain(cat);
    }
  });

  it('each entry has CT-N id', () => {
    for (const meta of CATEGORY_META) {
      expect(meta.ctId).toMatch(/^CT-\d+$/);
    }
  });
});

describe('EvalTier', () => {
  it('has 3 tiers', () => {
    expect(EVAL_TIERS).toHaveLength(3);
  });

  it('validates known tiers', () => {
    for (const tier of EVAL_TIERS) {
      expect(EvalTierSchema.parse(tier)).toBe(tier);
    }
  });

  it('basic = deterministic only', () => {
    expect(TIER_INCLUDES.basic).toEqual({ deterministic: true, llm: false, security: false });
  });

  it('full includes everything', () => {
    expect(TIER_INCLUDES.full).toEqual({ deterministic: true, llm: true, security: true });
  });
});

describe('EvalOptionsSchema', () => {
  it('parses valid options', () => {
    const result = EvalOptionsSchema.parse({
      target: 'http://localhost:4000/api/chat',
      tier: 'basic',
    });
    expect(result.target).toBe('http://localhost:4000/api/chat');
    expect(result.tier).toBe('basic');
  });

  it('defaults tier to basic', () => {
    const result = EvalOptionsSchema.parse({ target: 'http://localhost:4000' });
    expect(result.tier).toBe('basic');
  });

  it('rejects missing target', () => {
    expect(() => EvalOptionsSchema.parse({})).toThrow();
  });

  it('rejects invalid URL', () => {
    expect(() => EvalOptionsSchema.parse({ target: 'not-a-url' })).toThrow();
  });

  it('accepts optional fields', () => {
    const result = EvalOptionsSchema.parse({
      target: 'http://localhost:4000',
      tier: 'full',
      categories: ['bias', 'transparency'],
      agent: 'my-agent',
      model: 'gpt-4o',
      apiKey: 'sk-test',
      threshold: 80,
      json: true,
      ci: true,
    });
    expect(result.categories).toEqual(['bias', 'transparency']);
    expect(result.threshold).toBe(80);
  });

  it('rejects threshold > 100', () => {
    expect(() => EvalOptionsSchema.parse({ target: 'http://localhost:4000', threshold: 150 })).toThrow();
  });
});

describe('AuditOptionsSchema', () => {
  it('parses valid audit options', () => {
    const result = AuditOptionsSchema.parse({ target: 'http://localhost:4000' });
    expect(result.target).toBe('http://localhost:4000');
  });

  it('rejects invalid target', () => {
    expect(() => AuditOptionsSchema.parse({ target: '' })).toThrow();
  });
});
