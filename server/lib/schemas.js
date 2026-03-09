'use strict';

const { z } = require('zod');

const VALID_INDUSTRIES = [
  'fintech', 'hrtech', 'healthtech', 'edtech', 'ecommerce',
  'manufacturing', 'logistics', 'legal', 'insurance', 'other',
];
const VALID_SIZES = ['micro_1_9', 'small_10_49', 'medium_50_249', 'large_250_plus'];

const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  industry: z.enum(VALID_INDUSTRIES).optional(),
  size: z.enum(VALID_SIZES).optional(),
  country: z.string().length(2).optional(),
  website: z.string().url().optional().or(z.literal('')),
  vatId: z.string().max(50).optional(),
}).refine((obj) => Object.keys(obj).length > 0, { message: 'No fields to update' });

const AuditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  resource: z.string().optional(),
});

const CatalogSearchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  riskLevel: z.string().optional(),
  domain: z.string().optional(),
  maxRisk: z.enum(['high', 'limited', 'minimal']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const CatalogIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// === AI Tool Inventory Schemas ===

const VALID_DOMAINS = [
  'biometrics', 'critical_infrastructure', 'education', 'employment',
  'essential_services', 'law_enforcement', 'migration', 'justice',
  'customer_service', 'marketing', 'coding', 'analytics', 'other',
];

const VALID_DATA_TYPES = ['personal', 'sensitive', 'biometric', 'health', 'financial'];

const VALID_AFFECTED_PERSONS = ['employees', 'customers', 'applicants', 'patients', 'students', 'public'];

const VALID_AUTONOMY_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'];

const VALID_RISK_LEVELS = ['prohibited', 'high', 'gpai', 'limited', 'minimal'];

const VALID_COMPLIANCE_STATUSES = ['not_started', 'in_progress', 'review', 'compliant', 'non_compliant'];

const ToolStep1Schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  vendorName: z.string().min(1, 'Vendor name is required').max(255),
  vendorCountry: z.string().length(2).optional(),
  vendorUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  catalogEntryId: z.number().int().positive().optional(),
  framework: z.string().max(100).optional(),
  modelProvider: z.string().max(100).optional(),
  modelId: z.string().max(255).optional(),
});

const ToolStep2Schema = z.object({
  purpose: z.string().min(1, 'Purpose is required').max(2000),
  domain: z.enum(VALID_DOMAINS, { message: 'Invalid domain' }),
});

const ToolStep3Schema = z.object({
  dataTypes: z.array(z.enum(VALID_DATA_TYPES)).min(1, 'At least one data type is required'),
  affectedPersons: z.array(z.enum(VALID_AFFECTED_PERSONS)).min(1, 'At least one affected group is required'),
  vulnerableGroups: z.boolean(),
  dataResidency: z.string().optional(),
});

const ToolStep4Schema = z.object({
  autonomyLevel: z.enum(VALID_AUTONOMY_LEVELS, { message: 'Invalid autonomy level' }),
  humanOversight: z.boolean(),
  affectsNaturalPersons: z.boolean(),
});

const ToolCreateSchema = ToolStep1Schema;

const ToolUpdateSchema = z.object({
  step: z.coerce.number().int().min(1).max(4),
}).and(z.union([ToolStep1Schema, ToolStep2Schema, ToolStep3Schema, ToolStep4Schema]));

const VALID_LIFECYCLES = ['active', 'suspended', 'decommissioned'];
const VALID_SOURCES = ['manual', 'cli_scan', 'discovery', 'registry_autofill'];

const ToolListSchema = z.object({
  q: z.string().optional(),
  riskLevel: z.enum(VALID_RISK_LEVELS).optional(),
  domain: z.enum(VALID_DOMAINS).optional(),
  status: z.enum(VALID_COMPLIANCE_STATUSES).optional(),
  lifecycle: z.enum(VALID_LIFECYCLES).optional(),
  source: z.enum(VALID_SOURCES).optional(),
  autonomyLevel: z.enum(VALID_AUTONOMY_LEVELS).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const ToolLifecycleSchema = z.object({
  lifecycle: z.enum(VALID_LIFECYCLES),
});

const ToolIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const VALID_REQUIREMENT_STATUSES = [
  'not_applicable', 'pending', 'in_progress', 'completed', 'blocked',
];

const RequirementUpdateSchema = z.object({
  status: z.enum(VALID_REQUIREMENT_STATUSES).optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  notes: z.string().max(5000).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().or(z.literal('')),
}).refine((obj) => Object.keys(obj).length > 0, { message: 'No fields to update' });

const VALID_QUICK_CHECK_DOMAINS = [
  'biometrics', 'critical_infrastructure', 'education', 'employment',
  'essential_services', 'law_enforcement', 'migration', 'justice',
  'customer_service', 'marketing', 'coding', 'analytics', 'other',
];

const QuickCheckSchema = z.object({
  answers: z.object({
    deploysAI: z.boolean(),
    aiAffectsPersons: z.boolean(),
    domain: z.enum(VALID_QUICK_CHECK_DOMAINS, { message: 'Invalid domain' }),
    aiMakesDecisions: z.boolean(),
  }),
  email: z.string().email().optional(),
  consent: z.boolean().optional(),
});

// === Platform Admin Schemas ===

const AdminListSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

const AdminSubscriptionSchema = AdminListSchema.extend({
  status: z.string().optional(),
  planName: z.string().optional(),
});

// === Billing / Checkout Schemas ===

const VALID_PAID_PLANS = ['starter', 'growth', 'scale'];
const VALID_BILLING_PERIODS = ['monthly', 'yearly'];

const CheckoutSchema = z.object({
  planName: z.enum(VALID_PAID_PLANS, { message: 'Invalid plan' }),
  period: z.enum(VALID_BILLING_PERIODS, { message: 'Invalid billing period' }),
  returnUrl: z.string().url().optional(),
});

const CheckoutStatusSchema = z.object({
  sessionId: z.string().min(1, 'session_id is required'),
});

const VALID_INVITE_ROLES = ['admin', 'member', 'viewer'];

const InviteCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(VALID_INVITE_ROLES),
});

const InviteTokenSchema = z.object({
  token: z.string().uuid(),
});

const ChangeRoleSchema = z.object({
  role: z.enum(VALID_INVITE_ROLES),
});

// === Registry API Schemas ===

const RegistryToolSearchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  risk: z.string().optional(),
  aiActRole: z.enum(['provider', 'deployer_product', 'hybrid', 'infrastructure', 'ai_feature']).optional(),
  jurisdiction: z.string().optional(),
  hasDetectionPatterns: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  level: z.enum(['classified', 'scanned', 'verified']).optional(),
  sort: z.enum(['name', 'score', 'risk', 'grade']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const RegistryToolIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const ObligationSearchSchema = z.object({
  regulation: z.string().optional(),
  risk: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// === API Key Schemas ===

const ApiKeyCreateSchema = z.object({
  name: z.string().min(1).max(255),
  expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
});

const ApiKeyIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// === Auth (Headless) Schemas ===

const LoginPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

const LoginMagicSchema = z.object({
  email: z.string().email(),
});

const LoginMagicVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
});

const RegisterPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(256),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(256),
});

const VerifyEmailSchema = z.object({
  code: z.string().min(6).max(6),
  pendingAuthenticationToken: z.string().min(1),
});

// === FRIA Schemas ===

const VALID_FRIA_STATUSES = ['draft', 'in_progress', 'review', 'completed'];
const VALID_SECTION_TYPES = [
  'general_info', 'affected_persons', 'specific_risks',
  'human_oversight', 'mitigation_measures', 'monitoring_plan',
];

const FRIACreateSchema = z.object({
  toolId: z.coerce.number().int().positive(),
});

const FRIAIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const FRIASectionUpdateSchema = z.object({
  content: z.record(z.string(), z.any()),
  completed: z.boolean().optional(),
});

const FRIAStatusUpdateSchema = z.object({
  status: z.enum(VALID_FRIA_STATUSES),
});

const FRIAListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// === Compliance Document Schemas ===

const VALID_DOCUMENT_STATUSES = ['draft', 'generating', 'review', 'approved', 'archived'];

const VALID_DOCUMENT_TYPES = [
  'usage_policy', 'qms_template', 'risk_assessment',
  'monitoring_plan', 'employee_notification',
];

const DocumentCreateSchema = z.object({
  toolId: z.coerce.number().int().positive(),
  documentType: z.enum(VALID_DOCUMENT_TYPES),
});

const DocumentIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const DocumentSectionUpdateSchema = z.object({
  content: z.object({ text: z.string() }),
});

const DocumentListSchema = z.object({
  toolId: z.coerce.number().int().positive().optional(),
  status: z.enum(VALID_DOCUMENT_STATUSES).optional(),
  documentType: z.enum(VALID_DOCUMENT_TYPES).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const DocumentSectionParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  sectionCode: z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/, 'Invalid section code format'),
});

// === Gap Analysis Schemas ===

const GapAnalysisToolIdSchema = z.object({
  toolId: z.coerce.number().int().positive(),
});

// === Device Flow (CLI Auth) Schemas ===

const DeviceTokenSchema = z.object({
  deviceCode: z.string().min(1),
});

const DeviceConfirmSchema = z.object({
  userCode: z.string().min(6).max(6),
});

// === Audit Package Schemas ===

const AuditPackageIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const AuditPackageHistorySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// === CLI Sync Schemas ===

const SyncPassportSchema = z.object({
  name: z.string().min(1).max(255),
  vendorName: z.string().max(255).optional(),
  vendorUrl: z.string().url().optional().or(z.literal('')),
  slug: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  purpose: z.string().max(2000).optional(),
  domain: z.string().optional(),
  riskLevel: z.enum(['prohibited', 'high', 'gpai', 'limited', 'minimal']).optional(),
  detectionPatterns: z.array(z.string()).optional(),
  versions: z.record(z.string(), z.string()).optional(),
  autonomyLevel: z.enum(['L1', 'L2', 'L3', 'L4', 'L5']).optional(),
  framework: z.string().max(100).optional(),
  modelProvider: z.string().max(100).optional(),
  modelId: z.string().max(255).optional(),
  dataResidency: z.string().max(50).optional(),
  lifecycleStatus: z.enum(['draft', 'review', 'active', 'suspended', 'retired']).optional(),
  compliorScore: z.number().min(0).max(100).optional(),
  manifestVersion: z.string().optional(),
  signature: z.record(z.string(), z.unknown()).optional(),
  extendedFields: z.record(z.string(), z.unknown()).optional(),
});

const SyncScanSchema = z.object({
  projectPath: z.string().min(1).max(1000),
  score: z.number().min(0).max(100).optional(),
  findings: z.array(z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    message: z.string(),
    tool: z.string().optional(),
  })).optional(),
  toolsDetected: z.array(z.object({
    name: z.string().min(1),
    version: z.string().optional(),
    vendor: z.string().optional(),
    category: z.string().optional(),
  })).min(1),
});

// === CLI Document Sync Schemas ===

const VALID_SYNC_DOCUMENT_TYPES = [
  'fria', 'monitoring_plan', 'usage_policy', 'employee_notification',
  'incident_report', 'risk_assessment', 'transparency_notice', 'qms_template',
];

const SyncDocumentsSchema = z.object({
  documents: z.array(z.object({
    type: z.enum(VALID_SYNC_DOCUMENT_TYPES),
    title: z.string().max(500),
    content: z.string(),
    obligationId: z.string().optional(),
    toolSlug: z.string().optional(),
  })).min(1).max(20),
});

// === CLI FRIA Sync Schema ===

const SyncFriaSchema = z.object({
  toolSlug: z.string().min(1).max(255),
  assessmentId: z.string().max(50),
  date: z.string().max(30),
  sections: z.object({
    general_info: z.object({
      toolName: z.string().max(255).default(''),
      vendor: z.string().max(255).default(''),
      purpose: z.string().max(2000).default(''),
      domain: z.string().max(100).default(''),
      riskLevel: z.string().max(50).default(''),
      version: z.string().max(50).default(''),
      provider: z.string().max(100).default(''),
      deploymentContext: z.string().max(2000).default(''),
      assessorName: z.string().max(255).default(''),
      assessorTitle: z.string().max(255).default(''),
      geographicScope: z.string().max(500).default(''),
      organisation: z.string().max(255).default(''),
      organisationType: z.string().max(255).default(''),
    }),
    affected_persons: z.object({
      categories: z.array(z.string()).default([]),
      vulnerableGroups: z.boolean().default(false),
      estimatedCount: z.string().max(100).default(''),
      description: z.string().max(2000).default(''),
    }),
    specific_risks: z.object({
      risks: z.array(z.object({
        right: z.string().max(255),
        article: z.string().max(50),
        severity: z.string().max(10).default(''),
        likelihood: z.string().max(10).default(''),
        description: z.string().max(2000).default(''),
        affectedGroups: z.string().max(1000).default(''),
        mitigation: z.string().max(2000).default(''),
      })).default([]),
    }),
    human_oversight: z.object({
      hasHumanOversight: z.boolean().default(true),
      oversightType: z.string().max(50).default(''),
      mechanism: z.string().max(2000).default(''),
      responsibleRole: z.string().max(255).default(''),
      escalationProcess: z.string().max(2000).default(''),
      reviewFrequency: z.string().max(255).default(''),
    }),
    mitigation_measures: z.object({
      measures: z.array(z.object({
        risk: z.string().max(500).default(''),
        measure: z.string().max(1000).default(''),
        responsible: z.string().max(255).default(''),
        deadline: z.string().max(50).default(''),
      })).default([]),
      incidentResponse: z.string().max(2000).default(''),
      communicationPlan: z.string().max(2000).default(''),
      suspensionCriteria: z.string().max(2000).default(''),
      remediationProcess: z.string().max(2000).default(''),
      internalComplaint: z.string().max(2000).default(''),
      externalComplaint: z.string().max(2000).default(''),
    }),
    monitoring_plan: z.object({
      frequency: z.string().max(255).default(''),
      metrics: z.array(z.string()).default([]),
      responsibleTeam: z.string().max(255).default(''),
      reviewProcess: z.string().max(2000).default(''),
      nextReviewDate: z.string().max(50).default(''),
      dpiaReference: z.string().max(500).default(''),
      legalBasis: z.string().max(1000).default(''),
      overallRiskDecision: z.string().max(2000).default(''),
      conditionsForDeployment: z.string().max(2000).default(''),
    }),
  }),
});

// === GDPR Schemas ===

const AccountDeleteSchema = z.object({
  confirm: z.literal(true, { message: 'Confirmation required' }),
});

module.exports = {
  VALID_INDUSTRIES,
  VALID_SIZES,
  VALID_DOMAINS,
  VALID_DATA_TYPES,
  VALID_AFFECTED_PERSONS,
  VALID_AUTONOMY_LEVELS,
  VALID_LIFECYCLES,
  VALID_SOURCES,
  VALID_RISK_LEVELS,
  VALID_COMPLIANCE_STATUSES,
  VALID_REQUIREMENT_STATUSES,
  VALID_INVITE_ROLES,
  VALID_QUICK_CHECK_DOMAINS,
  RequirementUpdateSchema,
  UpdateOrganizationSchema,
  AuditQuerySchema,
  CatalogSearchSchema,
  CatalogIdSchema,
  ToolStep1Schema,
  ToolStep2Schema,
  ToolStep3Schema,
  ToolStep4Schema,
  ToolCreateSchema,
  ToolUpdateSchema,
  ToolListSchema,
  ToolLifecycleSchema,
  ToolIdSchema,
  InviteCreateSchema,
  InviteTokenSchema,
  ChangeRoleSchema,
  QuickCheckSchema,
  CheckoutSchema,
  CheckoutStatusSchema,
  AccountDeleteSchema,
  AdminListSchema,
  AdminSubscriptionSchema,
  RegistryToolSearchSchema,
  RegistryToolIdSchema,
  ObligationSearchSchema,
  ApiKeyCreateSchema,
  ApiKeyIdSchema,
  LoginPasswordSchema,
  LoginMagicSchema,
  LoginMagicVerifySchema,
  RegisterPasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  VALID_PAID_PLANS,
  VALID_BILLING_PERIODS,
  VALID_FRIA_STATUSES,
  VALID_SECTION_TYPES,
  FRIACreateSchema,
  FRIAIdSchema,
  FRIASectionUpdateSchema,
  FRIAStatusUpdateSchema,
  FRIAListSchema,
  VALID_DOCUMENT_STATUSES,
  VALID_DOCUMENT_TYPES,
  DocumentCreateSchema,
  DocumentIdSchema,
  DocumentSectionUpdateSchema,
  DocumentSectionParamsSchema,
  DocumentListSchema,
  GapAnalysisToolIdSchema,
  DeviceTokenSchema,
  DeviceConfirmSchema,
  AuditPackageIdSchema,
  AuditPackageHistorySchema,
  SyncPassportSchema,
  SyncScanSchema,
  VALID_SYNC_DOCUMENT_TYPES,
  SyncDocumentsSchema,
  SyncFriaSchema,
};
