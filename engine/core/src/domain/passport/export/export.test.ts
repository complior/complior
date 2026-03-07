import { describe, it, expect } from 'vitest';
import { createMockManifest } from '../../../test-helpers/factories.js';
import { mapToA2A, A2ACardSchema } from './a2a-mapper.js';
import { mapToAIUC1, AIUC1ProfileSchema } from './aiuc1-mapper.js';
import { mapToNIST, NISTProfileSchema } from './nist-mapper.js';
import { exportPassport } from './index.js';
import type { AgentManifest } from '../../../types/passport.types.js';

// --- A2A Tests ---

describe('A2A Mapper', () => {
  it('maps complete passport to valid A2A card', () => {
    const manifest = createMockManifest();
    const card = mapToA2A(manifest);

    expect(card.schemaVersion).toBe('1.0.0');
    expect(card.name).toBe('Test Agent');
    expect(card.humanReadableId).toBe('test-agent');
    expect(card.agentVersion).toBe('1.0.0');
    expect(card.description).toBe('An AI agent for testing compliance');
    expect(card.provider.name).toBe('OpenAI');
    expect(card.provider.url).toBe('https://openai.com');
    expect(card.lastUpdated).toBe('2026-01-01T00:00:00Z');
  });

  it('maps tools to skills array', () => {
    const manifest = createMockManifest({
      permissions: {
        tools: ['search', 'read', 'write'],
        data_access: { read: [], write: [], delete: [] },
        denied: [],
      },
    });
    const card = mapToA2A(manifest);

    expect(card.skills).toHaveLength(3);
    expect(card.skills[0]).toEqual({
      id: 'skill-1',
      name: 'search',
      description: 'Tool capability: search',
    });
    expect(card.skills[1]?.name).toBe('read');
    expect(card.skills[2]?.name).toBe('write');
  });

  it('handles empty optional fields gracefully', () => {
    const manifest = createMockManifest({
      permissions: {
        tools: [],
        data_access: { read: [], write: [], delete: [] },
        denied: [],
      },
    });
    const card = mapToA2A(manifest);

    expect(card.skills).toHaveLength(0);
    expect(card.tags.length).toBeGreaterThan(0);
  });

  it('output validates against A2ACardSchema', () => {
    const manifest = createMockManifest();
    const card = mapToA2A(manifest);

    expect(A2ACardSchema.safeParse(card).success).toBe(true);
  });
});

// --- AIUC-1 Tests ---

describe('AIUC-1 Mapper', () => {
  it('maps complete passport to 6 domains populated', () => {
    const manifest = createMockManifest();
    const profile = mapToAIUC1(manifest);

    expect(profile.framework).toBe('AIUC-1');
    expect(profile.version).toBe('1.0');
    expect(profile.agent.name).toBe('Test Agent');
    expect(profile.domains.a_data_privacy).toBeDefined();
    expect(profile.domains.b_security).toBeDefined();
    expect(profile.domains.c_safety).toBeDefined();
    expect(profile.domains.d_reliability).toBeDefined();
    expect(profile.domains.e_accountability).toBeDefined();
    expect(profile.domains.f_society).toBeDefined();
  });

  it('derives domain status from field completeness', () => {
    const manifest = createMockManifest();
    const profile = mapToAIUC1(manifest);

    for (const domain of Object.values(profile.domains)) {
      expect(['not_assessed', 'partial', 'compliant']).toContain(domain.status);
      expect(domain.coveragePercent).toBeGreaterThanOrEqual(0);
      expect(domain.coveragePercent).toBeLessThanOrEqual(100);
    }
    expect(profile.overallReadiness).toBeGreaterThan(0);
  });

  it('handles incomplete passport with degraded coverage', () => {
    const manifest = createMockManifest({
      disclosure: { user_facing: false, disclosure_text: '', ai_marking: { responses_marked: false, method: '' } },
      logging: { actions_logged: false, retention_days: 0, includes_decision_rationale: false },
      constraints: {
        rate_limits: { max_actions_per_minute: 0 },
        budget: { max_cost_per_session_usd: 0 },
        human_approval_required: [],
        prohibited_actions: [],
      },
    });
    const profile = mapToAIUC1(manifest);

    // Data privacy: 1/5 (data_residency still set) → partial
    expect(profile.domains.a_data_privacy.coveragePercent).toBe(20);
    expect(profile.domains.a_data_privacy.status).toBe('partial');
    // Security: 0/4 checks pass → not_assessed
    expect(profile.domains.b_security.status).toBe('not_assessed');
  });

  it('output validates against AIUC1ProfileSchema', () => {
    const manifest = createMockManifest();
    const profile = mapToAIUC1(manifest);

    expect(AIUC1ProfileSchema.safeParse(profile).success).toBe(true);
  });
});

// --- NIST Tests ---

describe('NIST AI RMF Mapper', () => {
  it('maps complete passport to 4 functions populated', () => {
    const manifest = createMockManifest();
    const profile = mapToNIST(manifest);

    expect(profile.framework).toBe('NIST-AI-RMF');
    expect(profile.version).toBe('1.0');
    expect(profile.agent.name).toBe('Test Agent');
    expect(profile.functions.govern).toBeDefined();
    expect(profile.functions.map).toBeDefined();
    expect(profile.functions.measure).toBeDefined();
    expect(profile.functions.manage).toBeDefined();
  });

  it('derives function status from field presence', () => {
    const manifest = createMockManifest();
    const profile = mapToNIST(manifest);

    for (const fn of Object.values(profile.functions)) {
      expect(['not_started', 'in_progress', 'implemented']).toContain(fn.status);
      expect(fn.categories.length).toBeGreaterThan(0);
      for (const cat of fn.categories) {
        expect(cat.id).toBeTruthy();
        expect(cat.name).toBeTruthy();
      }
    }
    expect(profile.overallMaturity).toBeGreaterThan(0);
  });

  it('handles incomplete passport with not_started status', () => {
    const manifest = createMockManifest({
      owner: { team: '', contact: '', responsible_person: '' },
      constraints: {
        rate_limits: { max_actions_per_minute: 0 },
        budget: { max_cost_per_session_usd: 0 },
        human_approval_required: [],
        prohibited_actions: [],
      },
      compliance: {
        eu_ai_act: {
          risk_class: 'minimal',
          applicable_articles: [],
          deployer_obligations_met: [],
          deployer_obligations_pending: [],
        },
        complior_score: 0,
        last_scan: '',
      },
      logging: { actions_logged: false, retention_days: 0, includes_decision_rationale: false },
      disclosure: { user_facing: false, disclosure_text: '', ai_marking: { responses_marked: false, method: '' } },
    });
    const profile = mapToNIST(manifest);

    // Govern: no owner fields, no constraints → GV-1 not_started
    expect(profile.functions.govern.completionPercent).toBe(0);
  });

  it('output validates against NISTProfileSchema', () => {
    const manifest = createMockManifest();
    const profile = mapToNIST(manifest);

    expect(NISTProfileSchema.safeParse(profile).success).toBe(true);
  });
});

// --- Orchestrator Tests ---

describe('exportPassport orchestrator', () => {
  it('exports to all three formats with valid flag', () => {
    const manifest = createMockManifest();

    for (const format of ['a2a', 'aiuc-1', 'nist'] as const) {
      const result = exportPassport(manifest, format);
      expect(result.format).toBe(format);
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.timestamp).toBeTruthy();
    }
  });
});
