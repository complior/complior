import { describe, it, expect } from 'vitest';
import {
  generateWellKnown,
  generateHtmlMeta,
  generateHttpHeaders,
  generateJsObject,
  validateMetadata,
} from './generator.js';
import type { MetadataInput } from './generator.js';

const makeInput = (overrides?: Partial<MetadataInput>): MetadataInput => ({
  organization: 'ACME Corp',
  aiSystems: [{ name: 'Customer Chat', provider: 'openai', riskLevel: 'limited' }],
  score: 72,
  scannerVersion: '0.1.0',
  ...overrides,
});

describe('generateWellKnown', () => {
  it('produces valid JSON structure', () => {
    const result = generateWellKnown(makeInput());
    expect(result.version).toBe('1.0');
    expect(result.scanner).toBe('complior/0.1.0');
    expect(result.organization).toBe('ACME Corp');
    expect(result.score).toBe(72);
    expect(result.ai_systems).toHaveLength(1);
    expect(result.jurisdiction).toBe('EU');
  });

  it('passes Zod validation', () => {
    const result = generateWellKnown(makeInput());
    const validation = validateMetadata(result);
    expect(validation.valid).toBe(true);
  });
});

describe('generateHtmlMeta', () => {
  it('produces meta tags with score', () => {
    const html = generateHtmlMeta(makeInput());
    expect(html).toContain('<meta name="ai-compliance-score" content="72">');
    expect(html).toContain('complior/0.1.0');
    expect(html).toContain('EU AI Act');
    expect(html).toContain('ACME Corp');
  });
});

describe('generateHttpHeaders', () => {
  it('produces correct headers', () => {
    const headers = generateHttpHeaders(makeInput());
    expect(headers['X-AI-Compliance-Score']).toBe('72');
    expect(headers['X-AI-Compliance-Scanner']).toBe('complior/0.1.0');
    expect(headers['X-AI-Compliance-Regulation']).toBe('EU AI Act');
    expect(headers['X-AI-Compliance-Organization']).toBe('ACME Corp');
  });
});

describe('generateJsObject', () => {
  it('produces JS assignment', () => {
    const js = generateJsObject(makeInput());
    expect(js).toContain('window.__AI_COMPLIANCE__');
    expect(js).toContain('"score": 72');
    expect(js).toContain('"scanner": "complior/0.1.0"');
  });
});

describe('validateMetadata', () => {
  it('validates correct metadata', () => {
    const data = generateWellKnown(makeInput());
    const result = validateMetadata(data);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid metadata', () => {
    const result = validateMetadata({ version: '1.0' });
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('rejects score out of range', () => {
    const data = { ...generateWellKnown(makeInput()), score: 150 };
    const result = validateMetadata(data);
    expect(result.valid).toBe(false);
  });
});
