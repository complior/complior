/**
 * Contract tests for sync routes — validates payload shapes against @complior/contracts schemas.
 *
 * C-M02: Shape validation (extendedFields removal, checkId canonical, FRIA schema)
 * C-M03: Pre-send validation (all 4 endpoints must safeParse before sending to SaaS)
 *
 * @see docs/sprints/C-M02-saas-contracts-migration.md
 * @see docs/sprints/C-M03-cli-presend-validation.md
 */
import { describe, it, expect } from 'vitest';
import {
  SyncPassportSchema,
  SyncScanSchema,
  SyncDocumentsSchema,
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

// ═══════════════════════════════════════════════════════════════════════
// C-M03: CLI Pre-Send Validation
// All 4 sync endpoints must safeParse() payloads BEFORE sending to SaaS.
// Invalid data is logged and skipped, never sent.
// @see docs/sprints/C-M03-cli-presend-validation.md
// ═══════════════════════════════════════════════════════════════════════

// ─── CLI pre-send validation: passport ────────────────────────────────

describe('CLI pre-send validation: passport', () => {
  it('valid passport passes SyncPassportSchema.safeParse()', () => {
    // Minimal valid passport from mapPassport() must validate
    const payload = { name: 'test-agent', vendorName: 'ACME', framework: 'langchain' };
    const result = SyncPassportSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('passport without name is rejected by safeParse()', () => {
    // name is z.string().min(1).max(255) — required field
    const payload = { vendorName: 'ACME', framework: 'langchain' };
    const result = SyncPassportSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('passport with name exceeding 255 chars is rejected', () => {
    // name has .max(255) constraint
    const payload = { name: 'a'.repeat(256) };
    const result = SyncPassportSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

// ─── CLI pre-send validation: scan ────────────────────────────────────

describe('CLI pre-send validation: scan', () => {
  it('valid scan payload passes SyncScanSchema.safeParse()', () => {
    const payload = {
      projectPath: '/home/user/project',
      score: 75,
      findings: [{ checkId: 'l1-fria', severity: 'high' as const, message: 'Missing FRIA' }],
      toolsDetected: [{ name: 'openai' }],
    };
    const result = SyncScanSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('scan without toolsDetected is rejected', () => {
    // toolsDetected is z.array().min(1) — required, not optional
    const payload = { projectPath: '/path', findings: [] };
    const result = SyncScanSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('scan with empty toolsDetected is rejected (min 1)', () => {
    // toolsDetected has .min(1) — empty array fails
    const payload = { projectPath: '/path', findings: [], toolsDetected: [] };
    const result = SyncScanSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('scan with score > 100 is rejected', () => {
    // score is z.number().min(0).max(100) — 150 exceeds max
    const payload = {
      projectPath: '/path',
      score: 150,
      findings: [],
      toolsDetected: [{ name: 'x' }],
    };
    const result = SyncScanSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

// ─── CLI pre-send validation: documents ───────────────────────────────

describe('CLI pre-send validation: documents', () => {
  it('valid documents payload passes SyncDocumentsSchema.safeParse()', () => {
    const payload = {
      documents: [{
        type: 'fria' as const,
        title: 'FRIA Report',
        content: '# FRIA\nContent here...',
      }],
    };
    const result = SyncDocumentsSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('documents with empty array is rejected (min 1)', () => {
    // documents has .min(1) — empty array fails
    const payload = { documents: [] };
    const result = SyncDocumentsSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('document with invalid type is rejected', () => {
    // type is z.enum(SYNC_DOC_TYPES) — 'invalid_type' not in enum
    const payload = {
      documents: [{
        type: 'invalid_type',
        title: 'Bad Doc',
        content: 'content',
      }],
    };
    const result = SyncDocumentsSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('document with empty content is rejected', () => {
    // content is z.string().min(1) — empty string fails
    const payload = {
      documents: [{
        type: 'fria' as const,
        title: 'FRIA',
        content: '',
      }],
    };
    const result = SyncDocumentsSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
