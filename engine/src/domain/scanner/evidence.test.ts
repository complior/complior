import { describe, it, expect } from 'vitest';
import { createEvidence, createEvidenceCollector } from './evidence.js';
import type { Evidence, EvidenceSource } from './evidence.js';

describe('createEvidence', () => {
  it('creates evidence with required fields', () => {
    const evidence = createEvidence('ai-disclosure', 'L1', 'file-presence');

    expect(evidence.findingId).toBe('ai-disclosure');
    expect(evidence.layer).toBe('L1');
    expect(evidence.source).toBe('file-presence');
    expect(evidence.timestamp).toBeTruthy();
  });

  it('creates evidence with optional fields', () => {
    const evidence = createEvidence('l4-bare-llm', 'L4', 'pattern-match', {
      snippet: 'openai.chat.completions.create()',
      file: 'src/api.ts',
      line: 42,
    });

    expect(evidence.snippet).toBe('openai.chat.completions.create()');
    expect(evidence.file).toBe('src/api.ts');
    expect(evidence.line).toBe(42);
  });

  it('has valid ISO timestamp', () => {
    const evidence = createEvidence('test', 'L1', 'file-presence');
    const date = new Date(evidence.timestamp);
    expect(date.getTime()).not.toBeNaN();
  });

  it('supports all evidence sources', () => {
    const sources: EvidenceSource[] = [
      'file-presence', 'heading-match', 'content-analysis',
      'dependency', 'pattern-match', 'llm-analysis', 'cross-layer',
    ];

    for (const source of sources) {
      const evidence = createEvidence('test', 'L1', source);
      expect(evidence.source).toBe(source);
    }
  });
});

describe('createEvidenceCollector', () => {
  it('starts empty', () => {
    const collector = createEvidenceCollector();
    expect(collector.getAll()).toHaveLength(0);
  });

  it('collects evidence items', () => {
    const collector = createEvidenceCollector();
    collector.add(createEvidence('finding-1', 'L1', 'file-presence'));
    collector.add(createEvidence('finding-2', 'L3', 'dependency'));

    expect(collector.getAll()).toHaveLength(2);
  });

  it('filters by finding ID', () => {
    const collector = createEvidenceCollector();
    collector.add(createEvidence('ai-disclosure', 'L1', 'file-presence'));
    collector.add(createEvidence('ai-disclosure', 'L4', 'pattern-match'));
    collector.add(createEvidence('logging', 'L4', 'pattern-match'));

    const disclosureEvidence = collector.getByFinding('ai-disclosure');
    expect(disclosureEvidence).toHaveLength(2);
    expect(disclosureEvidence.every((e) => e.findingId === 'ai-disclosure')).toBe(true);
  });

  it('returns empty for unknown finding', () => {
    const collector = createEvidenceCollector();
    collector.add(createEvidence('finding-1', 'L1', 'file-presence'));

    expect(collector.getByFinding('nonexistent')).toHaveLength(0);
  });

  it('getAll returns a copy (immutable)', () => {
    const collector = createEvidenceCollector();
    collector.add(createEvidence('finding-1', 'L1', 'file-presence'));

    const all1 = collector.getAll();
    collector.add(createEvidence('finding-2', 'L2', 'heading-match'));
    const all2 = collector.getAll();

    expect(all1).toHaveLength(1);
    expect(all2).toHaveLength(2);
  });

  it('handles multiple evidence for same finding from different layers', () => {
    const collector = createEvidenceCollector();
    collector.add(createEvidence('check-1', 'L1', 'file-presence', { file: 'COMPLIANCE.md' }));
    collector.add(createEvidence('check-1', 'L2', 'heading-match', { snippet: 'All sections present' }));
    collector.add(createEvidence('check-1', 'L4', 'pattern-match', { file: 'src/app.ts', line: 10 }));

    const evidence = collector.getByFinding('check-1');
    expect(evidence).toHaveLength(3);

    const layers = evidence.map((e) => e.layer);
    expect(layers).toContain('L1');
    expect(layers).toContain('L2');
    expect(layers).toContain('L4');
  });
});
