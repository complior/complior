/**
 * SyncFriaSchema — canonical contract for POST /api/sync/fria.
 *
 * Winner: SaaS (richer 6-section structure with field-level defaults).
 * CLI's flat `Record<unknown>` sections replaced with typed sections.
 *
 * Top-level: toolSlug, assessmentId, date (SaaS envelope).
 * Sections: general_info, affected_persons, specific_risks,
 *           human_oversight, mitigation_measures, monitoring_plan.
 */
import { z } from 'zod';

// ─── Section sub-schemas ────────────────────────────────────────────

const GeneralInfoSchema = z.object({
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
});

const AffectedPersonsSchema = z.object({
  categories: z.array(z.string()).default([]),
  vulnerableGroups: z.boolean().default(false),
  estimatedCount: z.string().max(100).default(''),
  description: z.string().max(2000).default(''),
});

const SpecificRiskSchema = z.object({
  right: z.string().max(255),
  article: z.string().max(50),
  severity: z.string().max(10).default(''),
  likelihood: z.string().max(10).default(''),
  description: z.string().max(2000).default(''),
  affectedGroups: z.string().max(1000).default(''),
  mitigation: z.string().max(2000).default(''),
});

const SpecificRisksSchema = z.object({
  risks: z.array(SpecificRiskSchema).default([]),
});

const HumanOversightSchema = z.object({
  hasHumanOversight: z.boolean().default(true),
  oversightType: z.string().max(50).default(''),
  mechanism: z.string().max(2000).default(''),
  responsibleRole: z.string().max(255).default(''),
  escalationProcess: z.string().max(2000).default(''),
  reviewFrequency: z.string().max(255).default(''),
});

const MitigationMeasureSchema = z.object({
  risk: z.string().max(500).default(''),
  measure: z.string().max(1000).default(''),
  responsible: z.string().max(255).default(''),
  deadline: z.string().max(50).default(''),
});

const MitigationMeasuresSchema = z.object({
  measures: z.array(MitigationMeasureSchema).default([]),
  incidentResponse: z.string().max(2000).default(''),
  communicationPlan: z.string().max(2000).default(''),
  suspensionCriteria: z.string().max(2000).default(''),
  remediationProcess: z.string().max(2000).default(''),
  internalComplaint: z.string().max(2000).default(''),
  externalComplaint: z.string().max(2000).default(''),
});

const MonitoringPlanSchema = z.object({
  frequency: z.string().max(255).default(''),
  metrics: z.array(z.string()).default([]),
  responsibleTeam: z.string().max(255).default(''),
  reviewProcess: z.string().max(2000).default(''),
  nextReviewDate: z.string().max(50).default(''),
  dpiaReference: z.string().max(500).default(''),
  legalBasis: z.string().max(1000).default(''),
  overallRiskDecision: z.string().max(2000).default(''),
  conditionsForDeployment: z.string().max(2000).default(''),
});

// ─── Main FRIA schema ───────────────────────────────────────────────

export const SyncFriaSchema = z.object({
  toolSlug: z.string().min(1).max(255),
  assessmentId: z.string().max(50),
  date: z.string().max(30),
  sections: z.object({
    general_info: GeneralInfoSchema,
    affected_persons: AffectedPersonsSchema,
    specific_risks: SpecificRisksSchema,
    human_oversight: HumanOversightSchema,
    mitigation_measures: MitigationMeasuresSchema,
    monitoring_plan: MonitoringPlanSchema,
  }),
});

export type SyncFriaPayload = z.infer<typeof SyncFriaSchema>;

// Export sub-schemas for re-use
export {
  GeneralInfoSchema,
  AffectedPersonsSchema,
  SpecificRisksSchema,
  HumanOversightSchema,
  MitigationMeasuresSchema,
  MonitoringPlanSchema,
};
