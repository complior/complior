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

const VALID_AUTONOMY_LEVELS = ['advisory', 'semi_autonomous', 'autonomous'];

const VALID_RISK_LEVELS = ['prohibited', 'high', 'gpai', 'limited', 'minimal'];

const VALID_COMPLIANCE_STATUSES = ['not_started', 'in_progress', 'review', 'compliant', 'non_compliant'];

const ToolStep1Schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  vendorName: z.string().min(1, 'Vendor name is required').max(255),
  vendorCountry: z.string().length(2).optional(),
  vendorUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  catalogEntryId: z.number().int().positive().optional(),
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

const ToolListSchema = z.object({
  q: z.string().optional(),
  riskLevel: z.enum(VALID_RISK_LEVELS).optional(),
  domain: z.enum(VALID_DOMAINS).optional(),
  status: z.enum(VALID_COMPLIANCE_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
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
  jurisdiction: z.string().optional(),
  hasDetectionPatterns: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
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
};
