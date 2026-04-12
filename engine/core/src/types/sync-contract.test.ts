/**
 * Contract tests for Sync API schemas.
 *
 * Validates that:
 * 1. Full AgentPassport can be mapped to SyncPassportPayload without data loss
 * 2. ScanResult can be mapped to SyncScanPayload
 * 3. Schemas accept valid payloads and reject invalid ones
 *
 * These tests are the CONTRACT between complior CLI and PROJECT SaaS.
 * If a test fails, the sync API is broken.
 */
import { describe, it, expect } from 'vitest';
import {
  SyncPassportSchema,
  SyncScanSchema,
  SyncDocumentsSchema,
  SyncFriaSchema,
} from './sync.types.js';

describe('SyncPassportSchema', () => {
  it('accepts minimal payload (name only)', () => {
    const result = SyncPassportSchema.safeParse({ name: 'my-agent' });
    expect(result.success).toBe(true);
  });

  it('accepts full payload with all 36 fields', () => {
    const full = {
      name: 'acme-support-bot',
      slug: 'acme-support-bot',
      display_name: 'ACME Support Bot',
      description: 'Customer support chatbot',
      purpose: 'Handles customer inquiries',
      domain: 'customer_service',
      version: '1.2.0',
      vendorName: 'ACME Corp',
      vendorUrl: 'https://acme.com',
      framework: 'langchain',
      modelProvider: 'openai',
      modelId: 'gpt-4o',
      dataResidency: 'EU',
      riskLevel: 'limited' as const,
      compliorScore: 72,
      projectScore: 68,
      lifecycleStatus: 'active' as const,
      friaCompleted: true,
      friaDate: '2026-03-15',
      workerNotificationSent: true,
      policyGenerated: true,
      scanSummary: {
        totalChecks: 150, passed: 120, failed: 25, skipped: 5,
        failedChecks: ['ai-disclosure', 'logging-check'],
        scanDate: '2026-04-10',
      },
      multiFramework: [
        { frameworkId: 'eu-ai-act', frameworkName: 'EU AI Act', score: 72, grade: 'C' },
        { frameworkId: 'owasp-llm', frameworkName: 'OWASP LLM Top 10', score: 85, grade: 'B' },
      ],
      autonomyLevel: 'L3' as const,
      autonomyEvidence: {
        humanApprovalGates: 2,
        unsupervisedActions: 5,
        noLoggingActions: 0,
        autoRated: true,
      },
      agentType: 'hybrid' as const,
      owner: { team: 'Platform', contact: 'team@acme.com', responsiblePerson: 'Jane Doe' },
      permissions: {
        tools: ['search', 'email'],
        dataAccess: { read: ['crm'], write: ['tickets'], delete: [] },
        denied: ['admin'],
        dataBoundaries: { piiHandling: 'redact' as const },
      },
      constraints: {
        rateLimits: { maxActionsPerMinute: 60 },
        budget: { maxCostPerSessionUsd: 5.0 },
        humanApprovalRequired: ['refund > 100'],
        prohibitedActions: ['delete_account'],
        escalationRules: [
          { condition: 'amount > 1000', action: 'require_approval' as const, description: 'High value' },
        ],
      },
      oversight: {
        responsiblePerson: 'Jane Doe', role: 'AI Officer',
        contact: 'jane@acme.com', overrideMechanism: 'kill switch',
        escalationProcedure: 'Notify manager',
      },
      disclosure: {
        userFacing: true, disclosureText: 'I am an AI assistant.',
        aiMarking: { responsesMarked: true, method: 'prefix' },
      },
      logging: { actionsLogged: true, retentionDays: 90, includesDecisionRationale: true },
      manifestVersion: '1.0.0',
      detectionPatterns: ['openai', 'langchain'],
      versions: { langchain: '0.1.0', openai: '1.0.0' },
      sourceFiles: ['src/bot.ts', 'src/agent.ts'],
      endpoints: ['https://api.acme.com/chat'],
      signature: {
        algorithm: 'ed25519', publicKey: 'abc123',
        signedAt: '2026-04-10T12:00:00Z', hash: 'sha256:deadbeef', value: 'sig_xyz',
      },
    };

    const result = SyncPassportSchema.safeParse(full);
    expect(result.success).toBe(true);
    if (result.success) {
      // Verify no data loss — autonomyEvidence preserved
      expect(result.data.autonomyEvidence?.humanApprovalGates).toBe(2);
      expect(result.data.autonomyEvidence?.unsupervisedActions).toBe(5);
      // Verify dual score preserved
      expect(result.data.compliorScore).toBe(72);
      expect(result.data.projectScore).toBe(68);
      // Verify permissions preserved
      expect(result.data.permissions?.dataBoundaries?.piiHandling).toBe('redact');
      // Verify escalation rules preserved
      expect(result.data.constraints?.escalationRules).toHaveLength(1);
    }
  });

  it('rejects empty name', () => {
    const result = SyncPassportSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid riskLevel', () => {
    const result = SyncPassportSchema.safeParse({ name: 'x', riskLevel: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid autonomyLevel', () => {
    const result = SyncPassportSchema.safeParse({ name: 'x', autonomyLevel: 'L9' });
    expect(result.success).toBe(false);
  });
});

describe('SyncScanSchema', () => {
  it('accepts valid scan payload', () => {
    const result = SyncScanSchema.safeParse({
      projectPath: '/home/user/project',
      score: 72,
      securityScore: 85,
      tier: 2,
      findings: [
        { severity: 'high', message: 'Missing AI disclosure', checkId: 'ai-disclosure' },
        { severity: 'low', message: 'No logging', agentId: 'bot-1', l5Analyzed: true },
      ],
      toolsDetected: [
        { name: 'openai', version: '1.0.0', vendor: 'OpenAI', category: 'llm' },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.findings[1].agentId).toBe('bot-1');
      expect(result.data.findings[1].l5Analyzed).toBe(true);
    }
  });

  it('rejects scan without toolsDetected', () => {
    const result = SyncScanSchema.safeParse({
      projectPath: '/path', findings: [], toolsDetected: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('SyncDocumentsSchema', () => {
  it('accepts valid document payload', () => {
    const result = SyncDocumentsSchema.safeParse({
      documents: [
        { type: 'fria', title: 'FRIA Report', content: '# FRIA\n...' },
        { type: 'usage_policy', title: 'AI Policy', content: '# Policy\n...', toolSlug: 'bot-1' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty documents array', () => {
    const result = SyncDocumentsSchema.safeParse({ documents: [] });
    expect(result.success).toBe(false);
  });
});

describe('SyncFriaSchema', () => {
  it('accepts valid FRIA payload', () => {
    const result = SyncFriaSchema.safeParse({
      generalInfo: {
        toolName: 'ACME Bot',
        vendor: 'ACME',
        purpose: 'Support',
        domain: 'customer_service',
        riskLevel: 'limited',
      },
      affectedPersons: { categories: ['customers', 'employees'] },
    });
    expect(result.success).toBe(true);
  });
});
