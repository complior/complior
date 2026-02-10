'use strict';

const { z } = require('zod');

const VALID_INDUSTRIES = [
  'fintech', 'hrtech', 'healthtech', 'edtech', 'ecommerce',
  'manufacturing', 'logistics', 'legal', 'insurance', 'other',
];
const VALID_SIZES = ['micro_1_9', 'small_10_49', 'medium_50_249', 'large_250_plus'];

const WebhookSchema = z.object({
  identity_id: z.string().min(1),
  email: z.string().email(),
  name: z.object({ first: z.string(), last: z.string() }).optional(),
  locale: z.string().optional(),
  event: z.string(),
});

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
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const CatalogIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  VALID_INDUSTRIES,
  VALID_SIZES,
  WebhookSchema,
  UpdateOrganizationSchema,
  AuditQuerySchema,
  CatalogSearchSchema,
  CatalogIdSchema,
};
