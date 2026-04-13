import { z } from 'zod';
import type { AutoDetectResult } from './auto-detect.js';
import riskProfileData from '../../data/onboarding/risk-profile.json' with { type: 'json' };
import obligationsData from '../../data/regulations/eu-ai-act/obligations.json' with { type: 'json' };

// ── Zod validation for obligation IDs from JSON ─────────────
const OblIdSchema = z.string().regex(/^OBL-\d{3}$/);
const validatedRiskProfile = z.object({
  high_risk_domains: z.array(z.string()),
  domain_obligations: z.record(z.array(OblIdSchema)),
  base_obligations: z.array(OblIdSchema),
  high_risk_extra_obligations: z.array(OblIdSchema),
}).parse(riskProfileData);

// ── Validated obligations from regulations JSON ─────────────
const ObligationEntrySchema = z.object({
  obligation_id: z.string(),
  title: z.string(),
  applies_to_role: z.enum(['provider', 'deployer', 'both']),
  applies_to_risk_level: z.array(z.string()),
});
const ObligationsSchema = z.object({
  obligations: z.array(ObligationEntrySchema),
});
const validatedObligations = ObligationsSchema.parse(obligationsData);

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
    gpaiModel: z.boolean().default(false),
    userFacing: z.boolean().default(true),
    autonomousDecisions: z.boolean().default(false),
    biometricData: z.boolean().default(false),
  }).default({ type: 'feature', outputTypes: ['text'], gpaiModel: false, userFacing: true, autonomousDecisions: false, biometricData: false }),
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
    gpaiModel: z.boolean().default(false),
    autonomousDecisions: z.boolean().default(false),
    biometricData: z.boolean().default(false),
    userFacing: z.boolean().default(true),
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

/**
 * @deprecated Use computeApplicableObligationsDynamic() — filters 108 obligations by metadata.
 * Kept for backward compatibility with profiles created before V1-M09.
 */
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

export interface ObligationFilterParams {
  readonly role: 'provider' | 'deployer' | 'both';
  readonly riskLevel: 'minimal' | 'limited' | 'high' | 'unacceptable';
  readonly gpaiModel: boolean;
  readonly domain?: string;
}

/**
 * V1-M09 T-2: Dynamic obligation filtering on 108 obligations metadata.
 *
 * Algorithm:
 * 1. Role match: obl.applies_to_role matches user role (both = all obligations)
 * 2. Risk match: user riskLevel in obl.applies_to_risk_level OR 'all' in array
 * 3. GPAI match: if !gpaiModel → skip obligations where applies_to_risk_level === ['gpai']
 *    if gpaiModel → also include 'gpai' obligations
 *
 * Expected results (verified against 108 obligations):
 * - deployer + limited + no GPAI → 16
 * - deployer + high + GPAI → 46
 * - provider + high + GPAI → 77
 * - both + high + GPAI → 92
 */
export const computeApplicableObligationsDynamic = (
  params: ObligationFilterParams,
): readonly string[] => {
  const { role, riskLevel, gpaiModel } = params;

  return validatedObligations.obligations
    .filter((ob) => {
      // 1. Role match
      if (role === 'both') {
        // User is both provider and deployer → all obligations apply
      } else if (role === 'provider') {
        if (ob.applies_to_role !== 'provider' && ob.applies_to_role !== 'both') return false;
      } else {
        // deployer
        if (ob.applies_to_role !== 'deployer' && ob.applies_to_role !== 'both') return false;
      }

      // 2. GPAI-only filter: skip GPAI obligations if user doesn't use GPAI
      const isGpaiOnly = ob.applies_to_risk_level.length === 1 && ob.applies_to_risk_level[0] === 'gpai';
      if (!gpaiModel && isGpaiOnly) return false;

      // 3. Risk level match
      const riskMatch =
        ob.applies_to_risk_level.includes(riskLevel) ||
        ob.applies_to_risk_level.includes('all') ||
        (gpaiModel && ob.applies_to_risk_level.includes('gpai'));

      return riskMatch;
    })
    .map((ob) => ob.obligation_id);
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
  const role = RoleSchema.catch('deployer').parse(answerStr(answers, 'org_role', 'deployer'));

  // V1-M09: new question answers
  const gpaiAnswer = answerStr(answers, 'gpai_model', 'unknown');
  const gpaiFromAutoDetect = 'gpaiModelDetected' in autoDetected && (autoDetected as AutoDetectResult & { gpaiModelDetected?: boolean }).gpaiModelDetected === true;
  const gpaiModel = gpaiAnswer === 'yes' || (gpaiAnswer === 'unknown' && gpaiFromAutoDetect);
  const userFacing = answerStr(answers, 'user_facing', 'yes') === 'yes';
  const autonomousDecisions = answerStr(answers, 'autonomous_decisions', 'no') === 'yes';
  const biometricData = answerStr(answers, 'biometric_data', 'no') === 'yes' || dataTypes.includes('biometric');

  const riskLevel = computeRiskLevel(domain, dataTypes, systemType);

  // V1-M09: use dynamic obligation filtering on 108 obligations metadata
  const applicableObligations = computeApplicableObligationsDynamic({ role, riskLevel, gpaiModel, domain });
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
      gpaiModel,
      userFacing,
      autonomousDecisions,
      biometricData,
    },
    jurisdiction: {
      primary: answerStr(answers, 'primary_jurisdiction', 'EU'),
      regulations: ['eu-ai-act'],
    },
    organization: {
      role,
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
      gpaiModel,
      autonomousDecisions,
      biometricData,
      userFacing,
    },
  };
};

export const validateProfile = (data: unknown): { valid: boolean; errors?: string[] } => {
  const result = ProjectProfileSchema.safeParse(data);
  if (result.success) return { valid: true };
  return { valid: false, errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`) };
};
