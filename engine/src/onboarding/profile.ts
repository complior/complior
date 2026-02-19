import { z } from 'zod';
import type { AutoDetectResult } from './auto-detect.js';

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
    type: z.enum(['feature', 'standalone', 'platform', 'internal']),
    outputTypes: z.array(z.string()),
  }),
  jurisdiction: z.object({
    primary: z.string(),
    regulations: z.array(z.string()),
  }),
  organization: z.object({
    role: z.enum(['provider', 'deployer', 'both']),
  }),
  business: z.object({
    domain: z.string(),
    companySize: z.enum(['startup', 'sme', 'enterprise']),
  }),
  data: z.object({
    types: z.array(z.string()),
    storage: z.enum(['eu', 'us', 'mixed']),
  }),
  goals: z.object({
    priority: z.string(),
    budget: z.enum(['minimal', 'moderate', 'full']),
  }),
  computed: z.object({
    riskLevel: z.enum(['minimal', 'limited', 'high', 'unacceptable']),
    applicableObligations: z.array(z.string()),
    estimatedScore: z.number(),
  }),
});

export type OnboardingProfile = z.infer<typeof ProjectProfileSchema>;

export type OnboardingAnswers = Record<string, string | string[]>;

const HIGH_RISK_DOMAINS = new Set(['healthcare', 'finance', 'hr', 'education', 'law_enforcement', 'justice']);

const DOMAIN_OBLIGATIONS: Record<string, readonly string[]> = {
  healthcare: ['OBL-070', 'OBL-071', 'OBL-072'],
  finance: ['OBL-073', 'OBL-074', 'OBL-075', 'OBL-076'],
  hr: ['OBL-064', 'OBL-065', 'OBL-066'],
  education: ['OBL-067', 'OBL-068', 'OBL-069'],
  content: ['OBL-089', 'OBL-090'],
  customer_service: ['OBL-091'],
};

const BASE_OBLIGATIONS = [
  'OBL-001', 'OBL-002', 'OBL-003', 'OBL-004', 'OBL-005',
  'OBL-006', 'OBL-007', 'OBL-008', 'OBL-009', 'OBL-010',
  'OBL-011', 'OBL-012', 'OBL-013', 'OBL-014', 'OBL-015',
];

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
    obligations.push('OBL-016', 'OBL-017', 'OBL-018', 'OBL-019', 'OBL-020');
  }
  return obligations;
};

export const buildProfile = (
  autoDetected: AutoDetectResult,
  answers: OnboardingAnswers,
): OnboardingProfile => {
  const domain = (answers['domain'] as string) ?? 'general';
  const dataTypes = (answers['data_types'] as string[]) ?? ['public'];
  const systemType = (answers['system_type'] as string) ?? 'feature';

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
      type: systemType as OnboardingProfile['aiSystem']['type'],
      outputTypes: (answers['output_types'] as string[]) ?? ['text'],
    },
    jurisdiction: {
      primary: (answers['primary_jurisdiction'] as string) ?? 'EU',
      regulations: ['eu-ai-act'],
    },
    organization: {
      role: (answers['org_role'] as string as OnboardingProfile['organization']['role']) ?? 'deployer',
    },
    business: {
      domain,
      companySize: (answers['company_size'] as string as OnboardingProfile['business']['companySize']) ?? 'startup',
    },
    data: {
      types: dataTypes,
      storage: (answers['data_storage'] as string as OnboardingProfile['data']['storage']) ?? 'eu',
    },
    goals: {
      priority: (answers['priority'] as string) ?? 'full',
      budget: (answers['budget'] as string as OnboardingProfile['goals']['budget']) ?? 'moderate',
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
