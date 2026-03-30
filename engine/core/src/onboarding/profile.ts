import { z } from 'zod';
import type { AutoDetectResult } from './auto-detect.js';
import riskProfileData from '../../data/onboarding/risk-profile.json' with { type: 'json' };

// ── Zod validation for obligation IDs from JSON ─────────────
const OblIdSchema = z.string().regex(/^OBL-\d{3}$/);
const validatedRiskProfile = z.object({
  high_risk_domains: z.array(z.string()),
  domain_obligations: z.record(z.array(OblIdSchema)),
  base_obligations: z.array(OblIdSchema),
  high_risk_extra_obligations: z.array(OblIdSchema),
}).parse(riskProfileData);

export const ProjectProfileSchema = z.object({
  version: z.literal('1.0'),
  createdAt: z.string(),
  updatedAt: z.string(),
  autoDetected: z.object({
    language: z.string(),
    framework: z.string(),
    cicd: z.string(),
    deployment: z.string(),
    aiLibraries: z.array(z.string()),
    hasDockerCompose: z.boolean(),
    hasEnvExample: z.boolean(),
    detectedModels: z.array(z.string()),
    confidence: z.number(),
  }),
  aiSystem: z.object({
    type: z.enum(['feature', 'standalone', 'platform', 'internal']).default('feature'),
    outputTypes: z.array(z.string()).default(['text']),
  }).default({ type: 'feature', outputTypes: ['text'] }),
  jurisdiction: z.object({
    primary: z.string().default('EU'),
    regulations: z.array(z.string()).default(['eu-ai-act']),
  }).default({ primary: 'EU', regulations: ['eu-ai-act'] }),
  organization: z.object({
    role: z.enum(['provider', 'deployer', 'both']),
  }),
  business: z.object({
    domain: z.string(),
    companySize: z.enum(['startup', 'sme', 'enterprise']).default('startup'),
  }),
  data: z.object({
    types: z.array(z.string()),
    storage: z.enum(['eu', 'us', 'mixed']),
  }),
  goals: z.object({
    priority: z.string().default('full'),
    budget: z.enum(['minimal', 'moderate', 'full']).default('moderate'),
  }).default({ priority: 'full', budget: 'moderate' }),
  computed: z.object({
    riskLevel: z.enum(['minimal', 'limited', 'high', 'unacceptable']),
    applicableObligations: z.array(z.string()),
    estimatedScore: z.number(),
  }),
});

export type OnboardingProfile = z.infer<typeof ProjectProfileSchema>;

export type OnboardingAnswers = Record<string, string | string[]>;

const HIGH_RISK_DOMAINS = new Set(validatedRiskProfile.high_risk_domains);

const DOMAIN_OBLIGATIONS: Record<string, readonly string[]> = validatedRiskProfile.domain_obligations;

const BASE_OBLIGATIONS = validatedRiskProfile.base_obligations;

export const computeRiskLevel = (
  domain: string,
  dataTypes: readonly string[],
  systemType: string,
): 'minimal' | 'limited' | 'high' | 'unacceptable' => {
  if (dataTypes.includes('biometric')) return 'high';
  if (HIGH_RISK_DOMAINS.has(domain)) return 'high';
  if (dataTypes.includes('health') || dataTypes.includes('financial')) return 'high';
  if (systemType === 'platform') return 'limited';
  if (systemType === 'internal' && dataTypes.includes('public')) return 'minimal';
  return 'limited';
};

export const computeApplicableObligations = (
  domain: string,
  riskLevel: string,
): readonly string[] => {
  const obligations = [...BASE_OBLIGATIONS];
  const domainObs = DOMAIN_OBLIGATIONS[domain];
  if (domainObs) obligations.push(...domainObs);
  if (riskLevel === 'high') {
    obligations.push(...validatedRiskProfile.high_risk_extra_obligations);
  }
  return obligations;
};

const answerStr = (answers: OnboardingAnswers, key: string, fallback: string): string => {
  const v = answers[key];
  return typeof v === 'string' ? v : fallback;
};

const answerArr = (answers: OnboardingAnswers, key: string, fallback: string[]): string[] => {
  const v = answers[key];
  return Array.isArray(v) ? v : fallback;
};

const SystemTypeSchema = z.enum(['feature', 'standalone', 'platform', 'internal']);
const RoleSchema = z.enum(['provider', 'deployer', 'both']);
const CompanySizeSchema = z.enum(['startup', 'sme', 'enterprise']);
const StorageSchema = z.enum(['eu', 'us', 'mixed']);
const BudgetSchema = z.enum(['minimal', 'moderate', 'full']);

export const buildProfile = (
  autoDetected: AutoDetectResult,
  answers: OnboardingAnswers,
): OnboardingProfile => {
  const domain = answerStr(answers, 'domain', 'general');
  const dataTypes = answerArr(answers, 'data_types', ['public']);
  const systemType = answerStr(answers, 'system_type', 'feature');

  const riskLevel = computeRiskLevel(domain, dataTypes, systemType);
  const applicableObligations = computeApplicableObligations(domain, riskLevel);
  const estimatedScore = riskLevel === 'high' ? 25 : riskLevel === 'limited' ? 40 : 60;

  const now = new Date().toISOString();

  return {
    version: '1.0',
    createdAt: now,
    updatedAt: now,
    autoDetected: {
      ...autoDetected,
      aiLibraries: [...autoDetected.aiLibraries],
      detectedModels: [...autoDetected.detectedModels],
    },
    aiSystem: {
      type: SystemTypeSchema.catch('feature').parse(systemType),
      outputTypes: answerArr(answers, 'output_types', ['text']),
    },
    jurisdiction: {
      primary: answerStr(answers, 'primary_jurisdiction', 'EU'),
      regulations: ['eu-ai-act'],
    },
    organization: {
      role: RoleSchema.catch('deployer').parse(answerStr(answers, 'org_role', 'deployer')),
    },
    business: {
      domain,
      companySize: CompanySizeSchema.catch('startup').parse(answerStr(answers, 'company_size', 'startup')),
    },
    data: {
      types: dataTypes,
      storage: StorageSchema.catch('eu').parse(answerStr(answers, 'data_storage', 'eu')),
    },
    goals: {
      priority: answerStr(answers, 'priority', 'full'),
      budget: BudgetSchema.catch('moderate').parse(answerStr(answers, 'budget', 'moderate')),
    },
    computed: {
      riskLevel,
      applicableObligations: [...applicableObligations],
      estimatedScore,
    },
  };
};

export const validateProfile = (data: unknown): { valid: boolean; errors?: string[] } => {
  const result = ProjectProfileSchema.safeParse(data);
  if (result.success) return { valid: true };
  return { valid: false, errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`) };
};
