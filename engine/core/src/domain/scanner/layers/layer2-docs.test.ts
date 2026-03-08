import { describe, it, expect, beforeEach } from 'vitest';
import { runLayer2, validateDocument, loadValidators, measureSectionDepth } from './layer2-docs.js';
import { createScanFile, createScanCtx } from '../../../test-helpers/factories.js';
import type { DocumentValidator } from './layer2-docs.js';

describe('loadValidators', () => {
  it('loads all 8 YAML validators', () => {
    const validators = loadValidators();
    expect(validators).toHaveLength(8);

    const documents = validators.map((v) => v.document).sort();
    expect(documents).toEqual([
      'ai-literacy',
      'art5-screening',
      'declaration-conformity',
      'fria',
      'incident-report',
      'monitoring-policy',
      'tech-documentation',
      'worker-notification',
    ]);
  });
});

describe('validateDocument', () => {
  const validator: DocumentValidator = {
    document: 'ai-literacy',
    obligation: 'OBL-001',
    article: 'Art. 4',
    file_patterns: ['AI-LITERACY.md'],
    required_sections: [
      { title: 'Training Program', required: true },
      { title: 'Training Levels', required: true },
      { title: 'Assessment Methods', required: true },
      { title: 'Record Keeping', required: false },
    ],
  };

  it('returns VALID when all required sections present with substantive content', () => {
    const content = `# AI Literacy Policy

## Training Program
The company has established a comprehensive AI literacy training program that covers all employees
who interact with AI systems in their daily work. The training covers EU AI Act obligations,
risk assessment procedures, and practical compliance measures. Training sessions are conducted
quarterly with updated materials reflecting the latest regulatory guidance from August 2026.
- Module 1: AI fundamentals and EU AI Act overview
- Module 2: Risk classification and prohibited practices
- Module 3: Transparency and disclosure requirements

## Training Levels
Training is delivered at three levels based on the employee's role and interaction with AI systems.
Level 1 is for general staff awareness, Level 2 for technical teams who develop or maintain AI,
and Level 3 for compliance officers and management who oversee AI governance. Each level has
specific learning objectives, materials, and certification requirements documented in the HR system.
Completion rates are tracked monthly and reported to the compliance committee.

## Assessment Methods
Assessment is conducted through a combination of online quizzes, practical exercises, and
scenario-based evaluations. Pass threshold is 80% for all levels. Employees who fail are
given additional training and must re-test within 30 days. Records of all assessments
are maintained for a minimum of 5 years as required by Art. 4 of the EU AI Act.
`;
    const result = validateDocument(validator, content);

    expect(result.status).toBe('VALID');
    expect(result.matchedRequired).toBe(3);
    expect(result.totalRequired).toBe(3);
    expect(result.missingSections).toHaveLength(0);
    expect(result.obligationId).toBe('eu-ai-act-OBL-001');
  });

  it('returns PARTIAL when some required sections missing', () => {
    const content = `# AI Literacy Policy

## Training Program
Details here.

## Record Keeping
Some records.
`;
    const result = validateDocument(validator, content);

    expect(result.status).toBe('PARTIAL');
    expect(result.matchedRequired).toBe(1);
    expect(result.missingSections).toContain('Training Levels');
    expect(result.missingSections).toContain('Assessment Methods');
  });

  it('returns EMPTY when document has no content', () => {
    const result = validateDocument(validator, '');

    expect(result.status).toBe('EMPTY');
    expect(result.matchedRequired).toBe(0);
    expect(result.missingSections).toHaveLength(3);
  });

  it('returns EMPTY when document has no headings', () => {
    const content = 'Some text without any headings whatsoever.';
    const result = validateDocument(validator, content);

    expect(result.status).toBe('EMPTY');
    expect(result.matchedRequired).toBe(0);
  });
});

describe('runLayer2', () => {
  // Helper to create doc content that passes depth check (>50 words per section with specifics)
  const makeRichContent = (title: string, sections: readonly string[]): string => {
    const body = sections.map((s) => `## ${s}\nThis section provides comprehensive documentation as required by the EU AI Act regulation.\nThe assessment was conducted on 2026-01-15 and covers all applicable requirements.\nKey findings include a 95% compliance rate across all evaluated criteria.\n- Item 1: Detailed analysis of requirements\n- Item 2: Evidence of compliance measures\n- Item 3: Documented procedures and policies`).join('\n\n');
    return `# ${title}\n\n${body}`;
  };

  it('validates all documents found by L1 (full compliance)', () => {
    const ctx = createScanCtx([
      createScanFile('AI-LITERACY.md', makeRichContent('AI Literacy', ['Training Program', 'Training Levels', 'Assessment Methods'])),
      createScanFile('ART5-SCREENING.md', makeRichContent('Screening', ['Prohibited Practices', 'Screening Results', 'Mitigations'])),
      createScanFile('FRIA.md', makeRichContent('FRIA', ['Risk Assessment', 'Impact Analysis', 'Mitigation Measures'])),
      createScanFile('WORKER-NOTIFICATION.md', makeRichContent('Workers', ['Notification Scope', 'Affected Workers', 'Timeline'])),
      createScanFile('TECH-DOCUMENTATION.md', makeRichContent('Tech', ['System Description', 'Architecture', 'Data Sources'])),
      createScanFile('INCIDENT-REPORT.md', makeRichContent('Incident', ['Incident Description', 'Root Cause', 'Corrective Actions'])),
      createScanFile('DECLARATION-OF-CONFORMITY.md', makeRichContent('DoC', ['Conformity Statement', 'Standards Applied', 'Evidence'])),
      createScanFile('MONITORING-POLICY.md', makeRichContent('Monitoring', ['Monitoring Scope', 'Frequency', 'Escalation Procedures'])),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(8);
    expect(results.every((r) => r.status === 'VALID')).toBe(true);
  });

  it('skips documents not found by L1', () => {
    const ctx = createScanCtx([
      createScanFile('AI-LITERACY.md', makeRichContent('AI Literacy', ['Training Program', 'Training Levels', 'Assessment Methods'])),
      createScanFile('src/app.ts', 'function main() {}'),
    ]);

    const results = runLayer2(ctx);

    // Only AI-LITERACY.md matched a validator
    expect(results).toHaveLength(1);
    expect(results[0].document).toBe('ai-literacy');
    expect(results[0].status).toBe('VALID');
  });

  it('handles partial documents correctly', () => {
    const ctx = createScanCtx([
      createScanFile('AI-LITERACY.md', `# AI Literacy\n## Training Program\nContent only.`),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('PARTIAL');
    expect(results[0].matchedRequired).toBe(1);
    expect(results[0].missingSections).toContain('Training Levels');
    expect(results[0].missingSections).toContain('Assessment Methods');
  });

  it('handles empty documents correctly', () => {
    const ctx = createScanCtx([
      createScanFile('AI-LITERACY.md', ''),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('EMPTY');
  });

  it('validates documents in nested directories', () => {
    const ctx = createScanCtx([
      createScanFile('docs/compliance/AI-LITERACY.md', makeRichContent('AI Literacy', ['Training Program', 'Training Levels', 'Assessment Methods'])),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('VALID');
  });

  it('detects SHALLOW documents with heading-only content', () => {
    const ctx = createScanCtx([
      createScanFile('AI-LITERACY.md', `# AI Literacy\n## Training Program\nBrief.\n## Training Levels\nTODO.\n## Assessment Methods\nPending.`),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('SHALLOW');
    expect(results[0].shallowSections).toBeDefined();
    expect(results[0].shallowSections?.length).toBeGreaterThan(0);
  });

  it('returns VALID when some sections shallow but not over 50%', () => {
    const richSection = `This section provides comprehensive documentation as required by the EU AI Act regulation.
The assessment was conducted on 2026-01-15 and covers all applicable requirements.
Key findings include a 95% compliance rate across all evaluated criteria.
- Item 1: Detailed analysis of requirements
- Item 2: Evidence of compliance measures`;

    const ctx = createScanCtx([
      createScanFile('AI-LITERACY.md', `# AI Literacy\n## Training Program\n${richSection}\n## Training Levels\n${richSection}\n## Assessment Methods\nBrief.`),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    // 1 out of 3 shallow = 33% < 50% → VALID
    expect(results[0].status).toBe('VALID');
  });
});

describe('measureSectionDepth', () => {
  it('detects shallow content (few words, no structure)', () => {
    const depth = measureSectionDepth('Brief content here.');
    expect(depth.isShallow).toBe(true);
    expect(depth.wordCount).toBeLessThan(50);
    expect(depth.hasLists).toBe(false);
    expect(depth.hasTables).toBe(false);
    expect(depth.hasSpecifics).toBe(false);
  });

  it('detects rich content with enough words', () => {
    const words = Array(60).fill('compliance').join(' ');
    const depth = measureSectionDepth(words);
    expect(depth.isShallow).toBe(false);
    expect(depth.wordCount).toBeGreaterThanOrEqual(50);
  });

  it('detects lists as substantive', () => {
    const depth = measureSectionDepth('Overview:\n- Item one\n- Item two\n- Item three');
    expect(depth.hasLists).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('detects numbered lists', () => {
    const depth = measureSectionDepth('Steps:\n1. First step\n2. Second step');
    expect(depth.hasLists).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('detects tables as substantive', () => {
    const depth = measureSectionDepth('| Name | Value |\n| --- | --- |\n| Test | 42 |');
    expect(depth.hasTables).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('detects dates as specifics', () => {
    const depth = measureSectionDepth('Completed on 2026-01-15.');
    expect(depth.hasSpecifics).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('detects percentages as specifics', () => {
    const depth = measureSectionDepth('Achieved 95% compliance rate.');
    expect(depth.hasSpecifics).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('detects article references as specifics', () => {
    const depth = measureSectionDepth('As required by Art. 50 of the EU AI Act.');
    expect(depth.hasSpecifics).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('detects euro amounts as specifics', () => {
    const depth = measureSectionDepth('Maximum fine: €35M or 7% of turnover.');
    expect(depth.hasSpecifics).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('handles empty content', () => {
    const depth = measureSectionDepth('');
    expect(depth.isShallow).toBe(true);
    expect(depth.wordCount).toBe(0);
  });

  it('counts sentences correctly', () => {
    const depth = measureSectionDepth('First sentence. Second sentence! Third sentence?');
    expect(depth.sentenceCount).toBe(3);
  });
});
