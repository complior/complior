/**
 * RED tests for C-M02: sync route MUST send data matching @complior/contracts schemas.
 *
 * These tests validate the SHAPE of payloads sent to SaaS, not SaaS responses.
 * They specify:
 * 1. mapPassport() output has NO extendedFields key — all fields are top-level typed
 * 2. Scan findings use checkId NOT tool field
 * 3. FRIA payloads are validated against SyncFriaSchema before sync
 *
 * @see docs/sprints/C-M02-saas-contracts-migration.md
 */
import { describe, it, expect } from 'vitest';
import {
  SyncPassportSchema,
  SyncScanSchema,
  SyncFriaSchema,
} from '@complior/contracts/sync';

// ─── mapPassport → SyncPassportSchema ──────────────────────────────

describe('mapPassport → SyncPassportSchema', () => {
  it('passport payload has NO extendedFields key', () => {
    // mapPassport() result must NOT contain extendedFields.
    // Instead, owner/permissions/constraints/etc should be top-level typed fields.
    const payload = {
      name: 'test-agent',
      owner: { team: 'ACME', contact: 'ops@acme.com', responsiblePerson: 'J. Doe' },
      permissions: {
        tools: ['search'],
        dataAccess: { read: [], write: [], delete: [] },
        denied: [],
      },
      constraints: {
        rateLimits: { maxActionsPerMinute: 60 },
        budget: { maxCostPerSessionUsd: 10 },
        humanApprovalRequired: [],
        prohibitedActions: [],
      },
      disclosure: {
        userFacing: true,
        disclosureText: 'AI-powered assistant',
        aiMarking: { responsesMarked: true, method: 'tag' },
      },
      logging: { actionsLogged: true, retentionDays: 90, includesDecisionRationale: true },
    };

    // The payload sent to SaaS must validate against SyncPassportSchema
    const result = SyncPassportSchema.safeParse(payload);
    expect(result.success).toBe(true);
    // Must NOT have extendedFields
    expect('extendedFields' in payload).toBe(false);
  });

  it('passport payload includes typed Group D fields', () => {
    const payload = {
      name: 'test-agent',
      autonomyLevel: 'L3' as const,
      autonomyEvidence: {
        humanApprovalGates: 2,
        unsupervisedActions: 5,
        noLoggingActions: 0,
        autoRated: true,
      },
      agentType: 'hybrid' as const,
    };
    const result = SyncPassportSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('passport payload includes Group F metadata fields', () => {
    const payload = {
      name: 'test-agent',
      sourceFiles: ['src/bot.ts', 'src/agent.ts'],
      endpoints: ['https://api.example.com/chat'],
      manifestVersion: '1.0.0',
    };
    const result = SyncPassportSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('passport with oversight validates as top-level field', () => {
    const payload = {
      name: 'test-agent',
      oversight: {
        responsiblePerson: 'Jane Doe',
        role: 'AI Safety Lead',
        contact: 'jane@acme.com',
        overrideMechanism: 'Kill switch via admin panel',
        escalationProcedure: 'Page on-call engineer',
      },
    };
    const result = SyncPassportSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('full passport with all groups validates', () => {
    const payload = {
      // Group A: Identity
      name: 'acme-support-bot',
      slug: 'acme-support-bot',
      description: 'Customer support chatbot',
      purpose: 'Handle customer inquiries',
      domain: 'customer_service',
      version: '2.1.0',
      // Group B: Tech Stack
      vendorName: 'ACME Corp',
      framework: 'langchain',
      modelProvider: 'openai',
      modelId: 'gpt-4o',
      // Group C: Compliance
      riskLevel: 'limited' as const,
      compliorScore: 72,
      projectScore: 68,
      lifecycleStatus: 'active' as const,
      friaCompleted: true,
      friaDate: '2026-04-18',
      scanSummary: {
        totalChecks: 33,
        passed: 24,
        failed: 7,
        skipped: 2,
        failedChecks: ['l1-fria', 'l2-docs-shallow'],
        scanDate: '2026-04-18T10:00:00Z',
      },
      // Group D: Autonomy
      autonomyLevel: 'L3' as const,
      autonomyEvidence: {
        humanApprovalGates: 2,
        unsupervisedActions: 5,
        noLoggingActions: 0,
        autoRated: true,
      },
      agentType: 'hybrid' as const,
      // Group E: Permissions
      owner: { team: 'ACME', contact: 'ops@acme.com', responsiblePerson: 'J. Doe' },
      permissions: {
        tools: ['search', 'email'],
        dataAccess: { read: ['customers'], write: ['tickets'], delete: [] },
        denied: ['admin_panel'],
      },
      constraints: {
        rateLimits: { maxActionsPerMinute: 60 },
        budget: { maxCostPerSessionUsd: 10 },
        humanApprovalRequired: ['delete_account'],
        prohibitedActions: ['send_money'],
      },
      oversight: {
        responsiblePerson: 'Jane Doe',
        role: 'AI Safety Lead',
        contact: 'jane@acme.com',
        overrideMechanism: 'Kill switch',
        escalationProcedure: 'Page on-call',
      },
      disclosure: {
        userFacing: true,
        disclosureText: 'AI-powered assistant',
        aiMarking: { responsesMarked: true, method: 'tag' },
      },
      logging: { actionsLogged: true, retentionDays: 90, includesDecisionRationale: true },
      // Group F: Metadata
      manifestVersion: '1.0.0',
      sourceFiles: ['src/bot.ts'],
      endpoints: ['https://api.acme.com/chat'],
    };

    const result = SyncPassportSchema.safeParse(payload);
    expect(result.success).toBe(true);
    // Verify no extendedFields
    expect(Object.keys(payload)).not.toContain('extendedFields');
  });
});

// ─── scan payload → SyncScanSchema ─────────────────────────────────

describe('scan payload → SyncScanSchema', () => {
  it('findings use checkId NOT tool', () => {
    const payload = {
      projectPath: '/home/user/project',
      score: 75,
      findings: [
        { checkId: 'l1-fria', severity: 'high' as const, message: 'Missing FRIA' },
        { checkId: 'l2-docs-shallow', severity: 'medium' as const, message: 'Shallow docs' },
      ],
      toolsDetected: [{ name: 'openai' }],
    };

    const result = SyncScanSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      // checkId is the canonical field name
      expect(result.data.findings[0].checkId).toBe('l1-fria');
      // `tool` field must NOT exist in schema output
      expect('tool' in result.data.findings[0]).toBe(false);
    }
  });

  it('scan includes securityScore and tier', () => {
    const payload = {
      projectPath: '/path',
      score: 80,
      securityScore: 90,
      tier: 2 as const,
      findings: [],
      toolsDetected: [{ name: 'agent' }],
    };
    const result = SyncScanSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.securityScore).toBe(90);
      expect(result.data.tier).toBe(2);
    }
  });

  it('findings with agentId and l5Analyzed validate', () => {
    const payload = {
      projectPath: '/path',
      findings: [
        {
          checkId: 'l5-deep-analysis',
          severity: 'low' as const,
          message: 'Deep analysis result',
          agentId: 'bot-1',
          l5Analyzed: true,
        },
      ],
      toolsDetected: [{ name: 'custom-bot' }],
    };
    const result = SyncScanSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.findings[0].agentId).toBe('bot-1');
      expect(result.data.findings[0].l5Analyzed).toBe(true);
    }
  });
});

// ─── FRIA payload validation ────────────────────────────────────────

describe('FRIA payload validation', () => {
  it('valid FRIA passes SyncFriaSchema', () => {
    const payload = {
      toolSlug: 'test-bot',
      assessmentId: 'FRIA-001',
      date: '2026-04-18',
      sections: {
        general_info: { toolName: 'Test Bot' },
        affected_persons: {},
        specific_risks: {},
        human_oversight: {},
        mitigation_measures: {},
        monitoring_plan: {},
      },
    };
    const result = SyncFriaSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('invalid FRIA is rejected (missing toolSlug)', () => {
    const payload = {
      assessmentId: 'FRIA-001',
      date: '2026-04-18',
      sections: {
        general_info: {},
        affected_persons: {},
        specific_risks: {},
        human_oversight: {},
        mitigation_measures: {},
        monitoring_plan: {},
      },
    };
    const result = SyncFriaSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('FRIA with all 6 sections fully populated validates', () => {
    const payload = {
      toolSlug: 'acme-bot',
      assessmentId: 'FRIA-2026-001',
      date: '2026-04-18',
      sections: {
        general_info: {
          toolName: 'ACME Bot',
          vendor: 'ACME Corp',
          purpose: 'Customer support',
          domain: 'customer_service',
          riskLevel: 'limited',
        },
        affected_persons: {
          categories: ['customers', 'employees'],
          vulnerableGroups: true,
          estimatedCount: '50000',
          description: 'End users of the support chatbot',
        },
        specific_risks: {
          risks: [
            {
              right: 'Right to non-discrimination',
              article: 'Art. 10',
              severity: 'medium',
              likelihood: 'low',
              description: 'Potential bias in responses',
              affectedGroups: 'All users',
              mitigation: 'Regular bias auditing',
            },
          ],
        },
        human_oversight: {
          hasHumanOversight: true,
          oversightType: 'human-in-the-loop',
          mechanism: 'Escalation to human agent',
          responsibleRole: 'Support Lead',
        },
        mitigation_measures: {
          measures: [
            {
              description: 'Bias detection system',
              implementationDate: '2026-03-01',
              responsiblePerson: 'AI Safety Lead',
              status: 'implemented',
            },
          ],
          incidentResponse: 'Page on-call engineer within 15 minutes',
        },
        monitoring_plan: {
          frequency: 'daily',
          metrics: ['accuracy', 'bias_score', 'response_time'],
          responsibleTeam: 'AI Safety',
          nextReviewDate: '2026-07-01',
        },
      },
    };
    const result = SyncFriaSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
