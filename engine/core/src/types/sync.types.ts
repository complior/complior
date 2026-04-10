/**
 * Sync Contract — единый источник правды для API между complior CLI и PROJECT SaaS.
 *
 * Принцип: контракт определяется на стороне поставщика данных (complior),
 * не потребителя (PROJECT). PROJECT адаптирует через mergePassport.js,
 * но не диктует формат.
 *
 * Оба проекта валидируют по этим Zod schemas:
 *   - complior CLI: валидирует перед отправкой
 *   - PROJECT SaaS: валидирует при получении (lib/syncHelpers.validateSync)
 *
 * Чтобы использовать в PROJECT:
 *   import { SyncPassportSchema } from '@complior/engine/types/sync.types'
 *   или скопировать schema (PROJECT не имеет TS dependency на engine)
 */
import { z } from 'zod';

// ─── Passport Sync (POST /api/sync/passport) ────────────────────────

/**
 * Full passport sync payload — все 36 полей AgentPassport,
 * сгруппированные для удобства PROJECT-адаптера.
 *
 * GROUP A: Identity (PROJECT → AITool core fields)
 * GROUP B: Tech Stack (CLI wins at merge)
 * GROUP C: Compliance (dual score preserved)
 * GROUP D: Autonomy + Evidence (no data loss)
 * GROUP E: Permissions + Constraints (stored as JSON)
 * GROUP F: Metadata + Signature (syncMetadata blob)
 */
export const SyncPassportSchema = z.object({
  // --- GROUP A: Identity ---
  name: z.string().min(1),
  slug: z.string().optional(),
  display_name: z.string().optional(),
  description: z.string().optional(),
  purpose: z.string().optional(),
  domain: z.string().optional(),
  version: z.string().optional(),

  // --- GROUP B: Tech Stack (CLI wins) ---
  vendorName: z.string().optional(),
  vendorUrl: z.string().url().optional().or(z.literal('')),
  framework: z.string().optional(),
  modelProvider: z.string().optional(),
  modelId: z.string().optional(),
  dataResidency: z.string().optional(),

  // --- GROUP C: Compliance (dual score — NO flattening) ---
  riskLevel: z.enum(['prohibited', 'high', 'gpai', 'limited', 'minimal']).optional(),
  compliorScore: z.number().min(0).max(100).optional(),
  projectScore: z.number().min(0).max(100).optional(),
  lifecycleStatus: z.enum(['draft', 'review', 'active', 'suspended', 'retired']).optional(),
  friaCompleted: z.boolean().optional(),
  friaDate: z.string().optional(),
  workerNotificationSent: z.boolean().optional(),
  policyGenerated: z.boolean().optional(),
  scanSummary: z.object({
    totalChecks: z.number().int().min(0),
    passed: z.number().int().min(0),
    failed: z.number().int().min(0),
    skipped: z.number().int().min(0),
    failedChecks: z.array(z.string()),
    scanDate: z.string(),
  }).optional(),
  multiFramework: z.array(z.object({
    frameworkId: z.string(),
    frameworkName: z.string(),
    score: z.number().min(0).max(100),
    grade: z.string().optional(),
  })).optional(),

  // --- GROUP D: Autonomy + Evidence (no data loss) ---
  autonomyLevel: z.enum(['L1', 'L2', 'L3', 'L4', 'L5']).optional(),
  autonomyEvidence: z.object({
    humanApprovalGates: z.number().int().min(0),
    unsupervisedActions: z.number().int().min(0),
    noLoggingActions: z.number().int().min(0),
    autoRated: z.boolean(),
  }).optional(),
  agentType: z.enum(['autonomous', 'assistive', 'hybrid']).optional(),

  // --- GROUP E: Permissions + Constraints (stored as JSON in PROJECT) ---
  owner: z.object({
    team: z.string(),
    contact: z.string(),
    responsiblePerson: z.string(),
  }).optional(),
  permissions: z.object({
    tools: z.array(z.string()),
    dataAccess: z.object({
      read: z.array(z.string()),
      write: z.array(z.string()),
      delete: z.array(z.string()),
    }),
    denied: z.array(z.string()),
    dataBoundaries: z.object({
      piiHandling: z.enum(['block', 'redact', 'allow']),
      geographicRestrictions: z.array(z.string()).optional(),
      retentionDays: z.number().int().min(0).optional(),
    }).optional(),
  }).optional(),
  constraints: z.object({
    rateLimits: z.object({ maxActionsPerMinute: z.number().int().min(0) }),
    budget: z.object({ maxCostPerSessionUsd: z.number().min(0) }),
    humanApprovalRequired: z.array(z.string()),
    prohibitedActions: z.array(z.string()),
    escalationRules: z.array(z.object({
      condition: z.string(),
      action: z.enum(['require_approval', 'notify', 'block', 'log']),
      description: z.string(),
    })).optional(),
  }).optional(),
  oversight: z.object({
    responsiblePerson: z.string(),
    role: z.string(),
    contact: z.string(),
    overrideMechanism: z.string(),
    escalationProcedure: z.string(),
  }).optional(),
  disclosure: z.object({
    userFacing: z.boolean(),
    disclosureText: z.string(),
    aiMarking: z.object({
      responsesMarked: z.boolean(),
      method: z.string(),
    }),
  }).optional(),
  logging: z.object({
    actionsLogged: z.boolean(),
    retentionDays: z.number().int().min(0),
    includesDecisionRationale: z.boolean(),
  }).optional(),

  // --- GROUP F: Metadata + Signature ---
  manifestVersion: z.string().optional(),
  detectionPatterns: z.array(z.string()).optional(),
  versions: z.record(z.string()).optional(),
  sourceFiles: z.array(z.string()).optional(),
  endpoints: z.array(z.string()).optional(),
  signature: z.object({
    algorithm: z.string(),
    publicKey: z.string(),
    signedAt: z.string(),
    hash: z.string(),
    value: z.string(),
  }).optional(),
});

export type SyncPassportPayload = z.infer<typeof SyncPassportSchema>;

// ─── Scan Sync (POST /api/sync/scan) ────────────────────────────────

export const SyncToolDetectedSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
  vendor: z.string().optional(),
  category: z.string().optional(),
});

export const SyncFindingSchema = z.object({
  checkId: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  message: z.string(),
  file: z.string().optional(),
  line: z.number().int().optional(),
  obligationId: z.string().optional(),
  articleReference: z.string().optional(),
  fix: z.string().optional(),
  agentId: z.string().optional(),
  docQuality: z.enum(['none', 'scaffold', 'draft', 'reviewed']).optional(),
  l5Analyzed: z.boolean().optional(),
});

export const SyncScanSchema = z.object({
  projectPath: z.string(),
  score: z.number().min(0).max(100).optional(),
  securityScore: z.number().min(0).max(100).optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  findings: z.array(SyncFindingSchema),
  toolsDetected: z.array(SyncToolDetectedSchema).min(1),
});

export type SyncScanPayload = z.infer<typeof SyncScanSchema>;

// ─── Document Sync (POST /api/sync/documents) ───────────────────────

export const SyncDocumentSchema = z.object({
  type: z.enum([
    'fria', 'monitoring_plan', 'usage_policy', 'employee_notification',
    'incident_report', 'risk_assessment', 'transparency_notice', 'qms_template',
  ]),
  title: z.string().min(1),
  content: z.string().min(1),
  obligationId: z.string().optional(),
  toolSlug: z.string().optional(),
});

export const SyncDocumentsSchema = z.object({
  documents: z.array(SyncDocumentSchema).min(1),
});

export type SyncDocumentsPayload = z.infer<typeof SyncDocumentsSchema>;

// ─── FRIA Sync (POST /api/sync/fria) ────────────────────────────────

export const SyncFriaSchema = z.object({
  generalInfo: z.object({
    toolName: z.string(),
    vendor: z.string().optional(),
    purpose: z.string().optional(),
    domain: z.string().optional(),
    riskLevel: z.string().optional(),
    version: z.string().optional(),
    provider: z.string().optional(),
    deploymentContext: z.string().optional(),
    assessorName: z.string().optional(),
    geographicScope: z.string().optional(),
    organisation: z.string().optional(),
  }),
  affectedPersons: z.object({
    categories: z.array(z.string()),
  }).optional(),
  specificRisks: z.record(z.unknown()).optional(),
  humanOversight: z.record(z.unknown()).optional(),
  mitigationMeasures: z.record(z.unknown()).optional(),
  monitoringPlan: z.record(z.unknown()).optional(),
});

export type SyncFriaPayload = z.infer<typeof SyncFriaSchema>;
