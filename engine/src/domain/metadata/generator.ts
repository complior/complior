import { z } from 'zod';

// --- Zod schema for .well-known/ai-compliance.json ---

export const AiSystemSchema = z.object({
  name: z.string(),
  provider: z.string(),
  risk_level: z.string().optional(),
  compliance_score: z.number().min(0).max(100),
});

export const ComplianceMetadataSchema = z.object({
  version: z.string(),
  scanner: z.string(),
  scannedAt: z.string(),
  organization: z.string(),
  ai_systems: z.array(AiSystemSchema),
  jurisdiction: z.string(),
  regulation: z.string(),
  score: z.number().min(0).max(100).optional(),
});

export type ComplianceMetadata = z.infer<typeof ComplianceMetadataSchema>;

// --- Generators ---

export interface MetadataInput {
  readonly organization: string;
  readonly aiSystems: readonly { name: string; provider: string; riskLevel?: string }[];
  readonly score: number;
  readonly scannerVersion: string;
}

export const generateWellKnown = (input: MetadataInput): ComplianceMetadata => ({
  version: '1.0',
  scanner: `complior/${input.scannerVersion}`,
  scannedAt: new Date().toISOString(),
  organization: input.organization,
  ai_systems: input.aiSystems.map((s) => ({
    name: s.name,
    provider: s.provider,
    risk_level: s.riskLevel,
    compliance_score: input.score,
  })),
  jurisdiction: 'EU',
  regulation: 'EU AI Act (Regulation (EU) 2024/1689)',
  score: input.score,
});

export const generateHtmlMeta = (input: MetadataInput): string => {
  const tags = [
    `<meta name="ai-compliance-score" content="${input.score}">`,
    `<meta name="ai-compliance-scanner" content="complior/${input.scannerVersion}">`,
    `<meta name="ai-compliance-regulation" content="EU AI Act">`,
    `<meta name="ai-compliance-organization" content="${input.organization}">`,
    `<meta name="ai-compliance-scanned" content="${new Date().toISOString()}">`,
  ];
  return tags.join('\n');
};

export const generateHttpHeaders = (input: MetadataInput): Record<string, string> => ({
  'X-AI-Compliance-Score': String(input.score),
  'X-AI-Compliance-Scanner': `complior/${input.scannerVersion}`,
  'X-AI-Compliance-Regulation': 'EU AI Act',
  'X-AI-Compliance-Organization': input.organization,
});

export const generateJsObject = (input: MetadataInput): string => {
  const obj = {
    score: input.score,
    scanner: `complior/${input.scannerVersion}`,
    regulation: 'EU AI Act',
    organization: input.organization,
    scannedAt: new Date().toISOString(),
  };
  return `window.__AI_COMPLIANCE__ = ${JSON.stringify(obj, null, 2)};`;
};

export const validateMetadata = (data: unknown): { valid: boolean; errors?: string[] } => {
  const result = ComplianceMetadataSchema.safeParse(data);
  if (result.success) return { valid: true };
  return {
    valid: false,
    errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  };
};
