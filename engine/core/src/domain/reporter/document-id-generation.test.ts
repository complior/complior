/**
 * V1-M22 / A-5 (H-5): RED test — Document IDs must be generated, not template placeholders.
 *
 * Background (V1-M21 review):
 *   Generated HTML contains literal placeholder strings:
 *     TDD-[YYYY]-[NNN]
 *     INC-[YYYY]-[NNN]
 *     DOC-[YYYY]-[NNN]
 *     WRK-[YYYY]-[NNN]
 *     DGP-[YYYY]-[NNN]
 *   Document IDs should be populated with real values when documents are
 *   generated (e.g., TDD-2026-001, INC-2026-001, ...).
 *
 * Specification:
 *   - `generateDocumentId(prefix, year, counter)` — pure fn
 *   - Returns `${prefix}-${year}-${counter3digits}` (e.g. `TDD-2026-001`)
 *   - Counter zero-padded to 3 digits
 *   - Supports: TDD (Technical Docs), INC (Incident), DOC (Declaration of Conformity),
 *     WRK (Worker Notification), DGP (Data Governance Policy), FRIA, AIL (AI Literacy), MON (Monitoring), QMS
 *
 * Architecture:
 *   - Pure function
 *   - Deterministic for same input
 *   - Counter persistence via `.complior/doc-counter.json` (separate concern)
 */

import { describe, it, expect } from 'vitest';

describe('V1-M22 / A-5: Document ID generation', () => {
  it('generateDocumentId produces prefix-year-number format', async () => {
    const { generateDocumentId } = await import('./document-id.js');
    const id = generateDocumentId('TDD', 2026, 1);
    expect(id).toBe('TDD-2026-001');
  });

  it('counter is zero-padded to 3 digits', async () => {
    const { generateDocumentId } = await import('./document-id.js');
    expect(generateDocumentId('INC', 2026, 1)).toBe('INC-2026-001');
    expect(generateDocumentId('INC', 2026, 42)).toBe('INC-2026-042');
    expect(generateDocumentId('INC', 2026, 999)).toBe('INC-2026-999');
  });

  it('accepts all v1.0 document ID prefixes', async () => {
    const { generateDocumentId } = await import('./document-id.js');
    const prefixes = ['TDD', 'INC', 'DOC', 'WRK', 'DGP', 'FRIA', 'AIL', 'MON', 'QMS'];
    for (const prefix of prefixes) {
      const id = generateDocumentId(prefix, 2026, 1);
      expect(id).toBe(`${prefix}-2026-001`);
    }
  });

  it('is deterministic (same input → same output)', async () => {
    const { generateDocumentId } = await import('./document-id.js');
    expect(generateDocumentId('TDD', 2026, 5)).toBe(generateDocumentId('TDD', 2026, 5));
  });

  it('rejects non-positive counter', async () => {
    const { generateDocumentId } = await import('./document-id.js');
    expect(() => generateDocumentId('TDD', 2026, 0)).toThrow();
    expect(() => generateDocumentId('TDD', 2026, -1)).toThrow();
  });

  it('rejects counter > 999 (outside 3-digit format)', async () => {
    const { generateDocumentId } = await import('./document-id.js');
    expect(() => generateDocumentId('TDD', 2026, 1000)).toThrow();
  });
});

describe('V1-M22 / A-5: HTML report contains real document IDs, not placeholders', () => {
  it('generated HTML has no `[YYYY]-[NNN]` placeholder patterns', async () => {
    const { buildHtmlReport } = await import('./html-report.js');
    const html = buildHtmlReport(mockReportWithDocuments());

    expect(html).not.toMatch(/\[YYYY\]-\[NNN\]/);
    expect(html).not.toMatch(/\[NNN\]/);
    expect(html).not.toMatch(/\[YYYY\]/);
  });

  it('generated HTML contains at least one real document ID', async () => {
    const { buildHtmlReport } = await import('./html-report.js');
    const html = buildHtmlReport(mockReportWithDocuments());

    // Matches TDD-2026-001 etc.
    expect(html).toMatch(/[A-Z]{3,4}-20\d{2}-\d{3}/);
  });
});

function mockReportWithDocuments(): unknown {
  // documents must be a DocumentInventory object, not a raw array.
  // buildHtmlReport does {...defaults.documents, ...inp.documents}
  // → if inp.documents is a bare array, spread makes {0: doc, 1: doc, documents: []}
  //   which means docs.documents (the array) is [] → no IDs rendered.
  return Object.freeze({
    projectPath: '/tmp/test-project',
    scannedAt: '2026-04-24T12:00:00Z',
    score: { totalScore: 72, zone: 'yellow' },
    findings: [],
    documents: {
      total: 2,
      byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 2 },
      score: 100,
      documents: [
        Object.freeze({
          id: 'TDD-2026-001',
          docType: 'technical-documentation',
          article: 'Art. 11',
          description: 'Technical Documentation',
          outputFile: 'docs/TECH-DOCUMENTATION.md',
          status: 'reviewed' as const,
          scoreImpact: 0,
          prefilledPercent: null,
          lastModified: null,
          templateFile: null,
        }),
        Object.freeze({
          id: 'FRIA-2026-001',
          docType: 'fria',
          article: 'Art. 27',
          description: 'Fundamental Rights Impact Assessment',
          outputFile: '.complior/fria/test-fria.md',
          status: 'reviewed' as const,
          scoreImpact: 0,
          prefilledPercent: null,
          lastModified: null,
          templateFile: null,
        }),
      ],
    },
    obligations: [],
    disclaimer: { summary: 'test', limitations: [] },
  });
}
