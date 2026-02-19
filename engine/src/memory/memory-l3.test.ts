import { describe, it, expect } from 'vitest';
import { createKnowledgeTools } from './l3-knowledge.js';
import type { RegulationData } from '../data/regulation-loader.js';

const mockRegulationData = {
  obligations: {
    _version: '1.0',
    obligations: [
      { obligation_id: 'OBL-001', article_reference: 'Art. 4', title: 'AI Literacy', description: 'Training requirement', applies_to_role: 'both', applies_to_risk_level: ['high'], obligation_type: 'procedural', what_to_do: [], severity: 'high', deadline: '2025-02-02' },
      { obligation_id: 'OBL-002', article_reference: 'Art. 5', title: 'Prohibited Practices', description: 'Screening requirement', applies_to_role: 'both', applies_to_risk_level: ['high'], obligation_type: 'procedural', what_to_do: [], severity: 'critical', deadline: '2025-02-02' },
      { obligation_id: 'OBL-015', article_reference: 'Art. 50', title: 'AI Disclosure', description: 'Transparency requirement', applies_to_role: 'deployer', applies_to_risk_level: ['limited'], obligation_type: 'transparency', what_to_do: [], severity: 'high', deadline: '2026-08-02' },
      { obligation_id: 'OBL-070', article_reference: 'Art. 9', title: 'Healthcare Bias Testing', description: 'Medical AI testing', applies_to_role: 'provider', applies_to_risk_level: ['high'], obligation_type: 'technical', what_to_do: [], severity: 'critical', deadline: '2026-08-02' },
    ],
  },
  scoring: {},
} as unknown as RegulationData;

describe('Knowledge Tools', () => {
  it('lookupRegulation finds by article', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData });
    const result = tools.lookupRegulation('Art. 50');
    expect(result.found).toBe(true);
    expect(result.obligations).toHaveLength(1);
    expect(result.obligations[0].id).toBe('OBL-015');
  });

  it('lookupRegulation finds by keyword', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData });
    const result = tools.lookupRegulation('Literacy');
    expect(result.found).toBe(true);
    expect(result.obligations[0].id).toBe('OBL-001');
  });

  it('lookupObligation finds by ID', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData });
    const result = tools.lookupObligation('OBL-002');
    expect(result.found).toBe(true);
    expect(result.obligation?.title).toBe('Prohibited Practices');
    expect(result.obligation?.severity).toBe('critical');
  });

  it('lookupObligation returns not found for unknown ID', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData });
    const result = tools.lookupObligation('OBL-999');
    expect(result.found).toBe(false);
  });

  it('getApplicableRules filters by risk level and role', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData });

    const highBoth = tools.getApplicableRules('high', 'both');
    expect(highBoth.count).toBe(2); // OBL-001, OBL-002 (role=both)

    const highProvider = tools.getApplicableRules('high', 'provider');
    expect(highProvider.count).toBe(3); // OBL-001, OBL-002 (both) + OBL-070 (provider)
  });

  it('LRU cache works — second call is cached', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData });

    tools.lookupRegulation('Art. 50');
    const stats1 = tools.getCacheStats();
    expect(stats1.regulation.misses).toBe(1);
    expect(stats1.regulation.hits).toBe(0);

    tools.lookupRegulation('Art. 50');
    const stats2 = tools.getCacheStats();
    expect(stats2.regulation.hits).toBe(1);
    expect(stats2.regulation.size).toBe(1);
  });

  it('clearCache resets stats', () => {
    const tools = createKnowledgeTools({ getRegulationData: () => mockRegulationData });
    tools.lookupRegulation('Art. 50');
    tools.clearCache();
    const stats = tools.getCacheStats();
    expect(stats.regulation.size).toBe(0);
    expect(stats.regulation.hits).toBe(0);
  });
});
