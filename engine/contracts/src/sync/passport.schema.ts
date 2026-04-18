/**
 * SyncPassportSchema — canonical contract for POST /api/sync/passport.
 *
 * Winner: CLI (expanded 36 fields, Groups A-F).
 * Added: SaaS field length limits (.max()) for database compatibility.
 * Removed: SaaS `extendedFields` catch-all (all fields are now typed).
 *
 * Both repos validate against this schema.
 */
import { z } from 'zod';
import {
  RISK_LEVELS,
  AUTONOMY_LEVELS,
  LIFECYCLE_STATUSES,
  AGENT_TYPES,
  PII_HANDLING_MODES,
  ESCALATION_ACTIONS,
} from '../shared/enums.js';

export const SyncPassportSchema = z.object({
  // --- GROUP A: Identity ---
  name: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  display_name: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  purpose: z.string().max(2000).optional(),
  domain: z.string().max(100).optional(),
  version: z.string().max(50).optional(),

  // --- GROUP B: Tech Stack (CLI wins) ---
  vendorName: z.string().max(255).optional(),
  vendorUrl: z.string().url().optional().or(z.literal('')),
  framework: z.string().max(100).optional(),
  modelProvider: z.string().max(100).optional(),
  modelId: z.string().max(255).optional(),
  dataResidency: z.string().max(50).optional(),

  // --- GROUP C: Compliance (dual score — NO flattening) ---
  riskLevel: z.enum(RISK_LEVELS).optional(),
  compliorScore: z.number().min(0).max(100).optional(),
  projectScore: z.number().min(0).max(100).optional(),
  lifecycleStatus: z.enum(LIFECYCLE_STATUSES).optional(),
  friaCompleted: z.boolean().optional(),
  friaDate: z.string().max(30).optional(),
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
  autonomyLevel: z.enum(AUTONOMY_LEVELS).optional(),
  autonomyEvidence: z.object({
    humanApprovalGates: z.number().int().min(0),
    unsupervisedActions: z.number().int().min(0),
    noLoggingActions: z.number().int().min(0),
    autoRated: z.boolean(),
  }).optional(),
  agentType: z.enum(AGENT_TYPES).optional(),

  // --- GROUP E: Permissions + Constraints (stored as JSON in PROJECT) ---
  owner: z.object({
    team: z.string().max(255),
    contact: z.string().max(255),
    responsiblePerson: z.string().max(255),
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
      piiHandling: z.enum(PII_HANDLING_MODES),
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
      action: z.enum(ESCALATION_ACTIONS),
      description: z.string(),
    })).optional(),
  }).optional(),
  oversight: z.object({
    responsiblePerson: z.string().max(255),
    role: z.string().max(255),
    contact: z.string().max(255),
    overrideMechanism: z.string().max(2000),
    escalationProcedure: z.string().max(2000),
  }).optional(),
  disclosure: z.object({
    userFacing: z.boolean(),
    disclosureText: z.string().max(5000),
    aiMarking: z.object({
      responsesMarked: z.boolean(),
      method: z.string().max(255),
    }),
  }).optional(),
  logging: z.object({
    actionsLogged: z.boolean(),
    retentionDays: z.number().int().min(0),
    includesDecisionRationale: z.boolean(),
  }).optional(),

  // --- GROUP F: Metadata + Signature ---
  manifestVersion: z.string().max(50).optional(),
  detectionPatterns: z.array(z.string()).optional(),
  versions: z.record(z.string(), z.string()).optional(),
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
