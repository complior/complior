import { describe, it, expect } from 'vitest';
import { DOCUMENT_CHECKLISTS, buildDocValidationPrompt, docValidationToFindings, getChecklist, detectDocType } from './layer5-docs.js';
import type { DocValidationResult } from './layer5-docs.js';

describe('DOCUMENT_CHECKLISTS', () => {
  it('has checklists for 4 document types', () => {
    expect(DOCUMENT_CHECKLISTS.length).toBe(4);
    expect(DOCUMENT_CHECKLISTS.map((c) => c.docType)).toEqual([
      'fria', 'technical-documentation', 'transparency-notice', 'risk-management',
    ]);
  });

  it('FRIA has 8 elements with 5 required', () => {
    const fria = DOCUMENT_CHECKLISTS.find((c) => c.docType === 'fria')!;
    expect(fria.elements.length).toBe(8);
    expect(fria.elements.filter((e) => e.required).length).toBe(5);
  });
});

describe('buildDocValidationPrompt', () => {
  it('includes document content and checklist', () => {
    const checklist = DOCUMENT_CHECKLISTS[0]!;
    const prompt = buildDocValidationPrompt('# FRIA\n## Risk Assessment\nHigh risk identified.', checklist);
    expect(prompt).toContain('FRIA');
    expect(prompt).toContain('affected-rights');
    expect(prompt).toContain('REQUIRED');
    expect(prompt).toContain('Risk Assessment');
  });

  it('truncates very long documents', () => {
    const longDoc = 'x'.repeat(20000);
    const checklist = DOCUMENT_CHECKLISTS[0]!;
    const prompt = buildDocValidationPrompt(longDoc, checklist);
    expect(prompt.length).toBeLessThan(15000); // truncated to 8000 chars
  });
});

describe('docValidationToFindings', () => {
  it('creates pass finding for high quality docs', () => {
    const results: DocValidationResult[] = [{
      docType: 'fria',
      file: 'docs/fria.md',
      qualityScore: 85,
      elementsPresent: 7,
      elementsTotal: 8,
      missingElements: ['consultation'],
      feedback: [],
      severity: 'info',
    }];
    const findings = docValidationToFindings(results);
    expect(findings[0]?.type).toBe('pass');
    expect(findings[0]?.checkId).toBe('l5-doc-fria');
  });

  it('creates fail finding for low quality docs', () => {
    const results: DocValidationResult[] = [{
      docType: 'fria',
      file: 'docs/fria.md',
      qualityScore: 40,
      elementsPresent: 3,
      elementsTotal: 8,
      missingElements: ['quantitative-assessment', 'affected-population', 'monitoring-plan', 'proportionality', 'alternatives'],
      feedback: ['Add quantitative risk assessment', 'Describe affected population'],
      severity: 'high',
    }];
    const findings = docValidationToFindings(results);
    expect(findings[0]?.type).toBe('fail');
    expect(findings[0]?.message).toContain('quantitative-assessment');
  });
});

describe('getChecklist', () => {
  it('returns checklist by doc type', () => {
    expect(getChecklist('fria')?.article).toBe('Art. 27');
    expect(getChecklist('risk-management')?.article).toBe('Art. 9');
    expect(getChecklist('unknown')).toBeUndefined();
  });
});

describe('detectDocType', () => {
  it('detects FRIA from filename', () => {
    expect(detectDocType('docs/fria.md')).toBe('fria');
    expect(detectDocType('docs/FRIA.md')).toBe('fria');
  });

  it('detects technical documentation', () => {
    expect(detectDocType('docs/technical-documentation.md')).toBe('technical-documentation');
    expect(detectDocType('docs/tech-documentation.md')).toBe('technical-documentation');
  });

  it('detects risk management', () => {
    expect(detectDocType('docs/risk-management.md')).toBe('risk-management');
    expect(detectDocType('docs/risk-assessment.md')).toBe('risk-management');
  });

  it('returns undefined for unknown docs', () => {
    expect(detectDocType('docs/readme.md')).toBeUndefined();
  });
});
