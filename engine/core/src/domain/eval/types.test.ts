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
  resolveIncludes,
  resolveTierLabel,
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
  it('has 4 tiers', () => {
    expect(EVAL_TIERS).toHaveLength(4);
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

  it('security = probes only', () => {
    expect(TIER_INCLUDES.security).toEqual({ deterministic: false, llm: false, security: true });
  });
});

describe('resolveIncludes', () => {
  it('no flags → deterministic only', () => {
    expect(resolveIncludes({})).toEqual({ deterministic: true, llm: false, security: false });
  });

  it('--llm → llm-judge only', () => {
    expect(resolveIncludes({ llm: true })).toEqual({ deterministic: false, llm: true, security: false });
  });

  it('--security → security only', () => {
    expect(resolveIncludes({ security: true })).toEqual({ deterministic: false, llm: false, security: true });
  });

  it('--full → everything', () => {
    expect(resolveIncludes({ full: true })).toEqual({ deterministic: true, llm: true, security: true });
  });

  it('--det --llm → deterministic + llm', () => {
    expect(resolveIncludes({ det: true, llm: true })).toEqual({ deterministic: true, llm: true, security: false });
  });

  it('--llm --security → llm + security (no det)', () => {
    expect(resolveIncludes({ llm: true, security: true })).toEqual({ deterministic: false, llm: true, security: true });
  });

  it('--det --security → deterministic + security', () => {
    expect(resolveIncludes({ det: true, security: true })).toEqual({ deterministic: true, llm: false, security: true });
  });

  it('--det alone → same as default', () => {
    expect(resolveIncludes({ det: true })).toEqual({ deterministic: true, llm: false, security: false });
  });
});

describe('resolveTierLabel', () => {
  it('maps includes to tier labels', () => {
    expect(resolveTierLabel({ deterministic: true, llm: false, security: false })).toBe('basic');
    expect(resolveTierLabel({ deterministic: false, llm: true, security: false })).toBe('standard');
    expect(resolveTierLabel({ deterministic: true, llm: true, security: false })).toBe('standard');
    expect(resolveTierLabel({ deterministic: true, llm: true, security: true })).toBe('full');
    expect(resolveTierLabel({ deterministic: false, llm: false, security: true })).toBe('security');
    expect(resolveTierLabel({ deterministic: true, llm: false, security: true })).toBe('security');
  });
});

describe('EvalOptionsSchema', () => {
  it('parses valid options', () => {
    const result = EvalOptionsSchema.parse({
      target: 'http://localhost:4000/api/chat',
    });
    expect(result.target).toBe('http://localhost:4000/api/chat');
  });

  it('parses with flag booleans', () => {
    const result = EvalOptionsSchema.parse({
      target: 'http://localhost:4000',
      llm: true,
      security: true,
    });
    expect(result.llm).toBe(true);
    expect(result.security).toBe(true);
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
      full: true,
      categories: ['bias', 'transparency'],
      agent: 'my-agent',
      model: 'gpt-4o',
      apiKey: 'sk-test',
      threshold: 80,
      json: true,
      ci: true,
    });
    expect(result.full).toBe(true);
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
