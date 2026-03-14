import { describe, it, expect } from 'vitest';
import { importFromA2A } from './a2a-importer.js';

const validCard = {
  schemaVersion: '1.0.0',
  humanReadableId: 'test-agent',
  agentVersion: '2.0.0',
  name: 'Test Agent',
  description: 'A test agent for compliance',
  url: 'https://deploy.example.com/agent',
  provider: { name: 'OpenAI', url: 'https://openai.com' },
  capabilities: {
    a2aVersion: '1.0.0',
    supportedMessageParts: ['text'],
    supportsPushNotifications: false,
  },
  skills: [
    { id: 'skill-1', name: 'file_read', description: 'Tool capability: file_read' },
    { id: 'skill-2', name: 'code_write', description: 'Tool capability: code_write' },
  ],
  tags: ['risk:high', 'autonomy:L3', 'type:autonomous', 'region:eu-west'],
  lastUpdated: '2026-03-01T00:00:00Z',
};

describe('importFromA2A', () => {
  it('maps humanReadableId to name', () => {
    const { passport } = importFromA2A(validCard);
    expect(passport.name).toBe('test-agent');
  });

  it('maps name to display_name', () => {
    const { passport } = importFromA2A(validCard);
    expect(passport.display_name).toBe('Test Agent');
  });

  it('maps description', () => {
    const { passport } = importFromA2A(validCard);
    expect(passport.description).toBe('A test agent for compliance');
  });

  it('maps agentVersion to version', () => {
    const { passport } = importFromA2A(validCard);
    expect(passport.version).toBe('2.0.0');
  });

  it('maps provider to model.provider', () => {
    const { passport } = importFromA2A(validCard);
    expect(passport.model?.provider).toBe('openai');
  });

  it('maps url to model.deployment', () => {
    const { passport } = importFromA2A(validCard);
    expect(passport.model?.deployment).toBe('https://deploy.example.com/agent');
  });

  it('maps skills to permissions.tools', () => {
    const { passport } = importFromA2A(validCard);
    expect(passport.permissions?.tools).toEqual(['file_read', 'code_write']);
  });

  it('parses risk tag to compliance.risk_class', () => {
    const { passport } = importFromA2A(validCard);
    expect(passport.compliance?.eu_ai_act?.risk_class).toBe('high');
  });

  it('parses autonomy tag to autonomy_level', () => {
    const { passport } = importFromA2A(validCard);
    expect(passport.autonomy_level).toBe('L3');
  });

  it('parses type tag', () => {
    const { passport } = importFromA2A(validCard);
    expect(passport.type).toBe('autonomous');
  });

  it('parses region tag to data_residency', () => {
    const { passport } = importFromA2A(validCard);
    expect(passport.model?.data_residency).toBe('eu-west');
  });

  it('sets source.mode to semi-auto', () => {
    const { passport } = importFromA2A(validCard);
    expect(passport.source?.mode).toBe('semi-auto');
  });

  it('sets source.generated_by to complior-a2a-import', () => {
    const { passport } = importFromA2A(validCard);
    expect(passport.source?.generated_by).toBe('complior-a2a-import');
  });

  it('reports fieldsImported', () => {
    const { fieldsImported } = importFromA2A(validCard);
    expect(fieldsImported).toContain('name');
    expect(fieldsImported).toContain('display_name');
    expect(fieldsImported).toContain('description');
    expect(fieldsImported).toContain('permissions');
  });

  it('reports fieldsMissing', () => {
    const { fieldsMissing } = importFromA2A(validCard);
    expect(fieldsMissing).toContain('owner');
    expect(fieldsMissing).toContain('framework');
    expect(fieldsMissing).toContain('logging');
  });

  it('throws on invalid A2A card', () => {
    expect(() => importFromA2A({ invalid: true })).toThrow('Invalid A2A Card');
  });

  it('handles card with no tags', () => {
    const card = { ...validCard, tags: [] };
    const { passport } = importFromA2A(card);
    expect(passport.type).toBe('assistive'); // default
    expect(passport.autonomy_level).toBe('L2'); // default
  });

  it('handles card with no skills', () => {
    const card = { ...validCard, skills: [] };
    const { passport } = importFromA2A(card);
    expect(passport.permissions?.tools).toEqual([]);
  });

  it('handles unknown provider URL', () => {
    const card = { ...validCard, provider: { name: 'Custom', url: 'https://custom.ai' } };
    const { passport } = importFromA2A(card);
    expect(passport.model?.provider).toBe('Custom');
  });

  it('generates unique agent_id with timestamp', () => {
    const { passport: p1 } = importFromA2A(validCard);
    expect(p1.agent_id).toMatch(/^imported-test-agent-\d+$/);
  });
});
