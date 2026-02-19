import { describe, it, expect } from 'vitest';
import { createKnowledgeTools } from './l3-knowledge.js';

const mockRegulationData = {
  obligations: {
    obligations: [
      { id: 'OBL-001', article: 'Art. 4', title: 'AI Literacy', description: 'Training requirement', severity: 'high', deadline: '2025-02-02', role: 'both' },
      { id: 'OBL-002', article: 'Art. 5', title: 'Prohibited Practices', description: 'Screening requirement', severity: 'critical', deadline: '2025-02-02', role: 'both' },
      { id: 'OBL-015', article: 'Art. 50', title: 'AI Disclosure', description: 'Transparency requirement', severity: 'high', deadline: '2026-08-02', role: 'deployer' },
      { id: 'OBL-070', article: 'Art. 9', title: 'Healthcare Bias Testing', description: 'Medical AI testing', severity: 'critical', deadline: '2026-08-02', role: 'provider' },
    ],
  },
  scoring: {},
};

describe('Knowledge Tools', () => {
  it('lookupRegulation finds by article', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData as any });
    const result = tools.lookupRegulation('Art. 50');
    expect(result.found).toBe(true);
    expect(result.obligations).toHaveLength(1);
    expect(result.obligations[0].id).toBe('OBL-015');
  });

  it('lookupRegulation finds by keyword', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData as any });
    const result = tools.lookupRegulation('Literacy');
    expect(result.found).toBe(true);
    expect(result.obligations[0].id).toBe('OBL-001');
  });

  it('lookupObligation finds by ID', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData as any });
    const result = tools.lookupObligation('OBL-002');
    expect(result.found).toBe(true);
    expect(result.obligation?.title).toBe('Prohibited Practices');
    expect(result.obligation?.severity).toBe('critical');
  });

  it('lookupObligation returns not found for unknown ID', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData as any });
    const result = tools.lookupObligation('OBL-999');
    expect(result.found).toBe(false);
  });

  it('getApplicableRules filters by risk level and role', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData as any });

    const highBoth = tools.getApplicableRules('high', 'both');
    expect(highBoth.count).toBe(2); // OBL-001, OBL-002 (role=both)

    const highProvider = tools.getApplicableRules('high', 'provider');
    expect(highProvider.count).toBe(3); // OBL-001, OBL-002 (both) + OBL-070 (provider)
  });

  it('LRU cache works — second call is cached', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData as any });

    tools.lookupRegulation('Art. 50');
    const stats1 = tools.getCacheStats();
    expect(stats1.misses).toBe(1);
    expect(stats1.hits).toBe(0);

    tools.lookupRegulation('Art. 50');
    const stats2 = tools.getCacheStats();
    expect(stats2.hits).toBe(1);
    expect(stats2.size).toBe(1);
  });

  it('clearCache resets stats', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData as any });
    tools.lookupRegulation('Art. 50');
    tools.clearCache();
    const stats = tools.getCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.hits).toBe(0);
  });
});
