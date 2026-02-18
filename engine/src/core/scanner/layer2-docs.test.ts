import { describe, it, expect, beforeEach } from 'vitest';
import { runLayer2, validateDocument, clearValidatorCache, loadValidators } from './layer2-docs.js';
import type { ScanContext, FileInfo } from './scanner.types.js';
import type { DocumentValidator } from './layer2-docs.js';

const createFile = (relativePath: string, content: string): FileInfo => ({
  path: `/test/project/${relativePath}`,
  content,
  extension: `.${relativePath.split('.').pop()}`,
  relativePath,
});

const createCtx = (files: readonly FileInfo[]): ScanContext => ({
  files,
  projectPath: '/test/project',
});

beforeEach(() => {
  clearValidatorCache();
});

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

  it('returns VALID when all required sections present', () => {
    const content = `# AI Literacy Policy

## Training Program
Details here.

## Training Levels
Level 1, Level 2.

## Assessment Methods
Quizzes and reviews.
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
  it('validates all documents found by L1 (full compliance)', () => {
    const ctx = createCtx([
      createFile('AI-LITERACY.md', `# AI Literacy\n## Training Program\n## Training Levels\n## Assessment Methods`),
      createFile('ART5-SCREENING.md', `# Screening\n## Prohibited Practices\n## Screening Results\n## Mitigations`),
      createFile('FRIA.md', `# FRIA\n## Risk Assessment\n## Impact Analysis\n## Mitigation Measures`),
      createFile('WORKER-NOTIFICATION.md', `# Workers\n## Notification Scope\n## Affected Workers\n## Timeline`),
      createFile('TECH-DOCUMENTATION.md', `# Tech\n## System Description\n## Architecture\n## Data Sources`),
      createFile('INCIDENT-REPORT.md', `# Incident\n## Incident Description\n## Root Cause\n## Corrective Actions`),
      createFile('DECLARATION-OF-CONFORMITY.md', `# DoC\n## Conformity Statement\n## Standards Applied\n## Evidence`),
      createFile('MONITORING-POLICY.md', `# Monitoring\n## Monitoring Scope\n## Frequency\n## Escalation Procedures`),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(8);
    expect(results.every((r) => r.status === 'VALID')).toBe(true);
  });

  it('skips documents not found by L1', () => {
    const ctx = createCtx([
      createFile('AI-LITERACY.md', `# AI Literacy\n## Training Program\n## Training Levels\n## Assessment Methods`),
      createFile('src/app.ts', 'function main() {}'),
    ]);

    const results = runLayer2(ctx);

    // Only AI-LITERACY.md matched a validator
    expect(results).toHaveLength(1);
    expect(results[0].document).toBe('ai-literacy');
    expect(results[0].status).toBe('VALID');
  });

  it('handles partial documents correctly', () => {
    const ctx = createCtx([
      createFile('AI-LITERACY.md', `# AI Literacy\n## Training Program\nContent only.`),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('PARTIAL');
    expect(results[0].matchedRequired).toBe(1);
    expect(results[0].missingSections).toContain('Training Levels');
    expect(results[0].missingSections).toContain('Assessment Methods');
  });

  it('handles empty documents correctly', () => {
    const ctx = createCtx([
      createFile('AI-LITERACY.md', ''),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('EMPTY');
  });

  it('validates documents in nested directories', () => {
    const ctx = createCtx([
      createFile('docs/compliance/AI-LITERACY.md', `# AI Literacy\n## Training Program\n## Training Levels\n## Assessment Methods`),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('VALID');
  });
});
