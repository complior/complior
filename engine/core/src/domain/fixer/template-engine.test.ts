import { describe, it, expect } from 'vitest';
import { fillTemplate, getTemplateForObligation, getAvailableTemplates } from './template-engine.js';

describe('fillTemplate', () => {
  it('replaces [Company Name] placeholder', () => {
    const template = 'Policy for [Company Name]';
    const result = fillTemplate(template, { companyName: 'ACME Corp' });
    expect(result).toBe('Policy for ACME Corp');
  });

  it('replaces multiple placeholders', () => {
    const template = '[Company Name] — Version [X.Y] — [Date]';
    const result = fillTemplate(template, {
      companyName: 'TestCo',
      version: '2.0',
      date: '2026-01-15',
    });
    expect(result).toBe('TestCo — Version 2.0 — 2026-01-15');
  });

  it('uses defaults when no data provided', () => {
    const template = 'Policy for [Company Name]';
    const result = fillTemplate(template);
    expect(result).toBe('Policy for [Company Name]');
  });

  it('replaces German placeholders', () => {
    const template = 'Richtlinie für [Firmenname]';
    const result = fillTemplate(template, { companyName: 'TestGmbH' });
    expect(result).toBe('Richtlinie für TestGmbH');
  });
});

describe('getTemplateForObligation', () => {
  it('returns mapping for known obligation', () => {
    const mapping = getTemplateForObligation('eu-ai-act-OBL-001');
    expect(mapping).toBeDefined();
    expect(mapping!.templateFile).toBe('ai-literacy.md');
    expect(mapping!.article).toBe('Art. 4');
  });

  it('returns undefined for unknown obligation', () => {
    const mapping = getTemplateForObligation('unknown-obl');
    expect(mapping).toBeUndefined();
  });
});

describe('getAvailableTemplates', () => {
  it('returns all 8 templates', () => {
    const templates = getAvailableTemplates();
    expect(templates).toHaveLength(8);
  });

  it('each template has required fields', () => {
    const templates = getAvailableTemplates();
    for (const t of templates) {
      expect(t.obligationId).toBeTruthy();
      expect(t.article).toBeTruthy();
      expect(t.templateFile).toBeTruthy();
      expect(t.outputFile).toBeTruthy();
      expect(t.description).toBeTruthy();
    }
  });
});
