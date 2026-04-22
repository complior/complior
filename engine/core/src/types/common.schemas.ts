import { z } from 'zod';
import type { ScanResult, EvidenceChain } from './common.types.js';

// --- Sub-schemas ---

const EvidenceSchema = z.object({
  findingId: z.string(),
  layer: z.string(),
  timestamp: z.string(),
  source: z.string(),
  snippet: z.string().optional(),
  file: z.string().optional(),
  line: z.number().optional(),
});

const CodeContextLineSchema = z.object({
  num: z.number(),
  content: z.string(),
});

const CodeContextSchema = z.object({
  lines: z.array(CodeContextLineSchema),
  startLine: z.number(),
  highlightLine: z.number().optional(),
});

const FixDiffSchema = z.object({
  before: z.array(z.string()),
  after: z.array(z.string()),
  startLine: z.number(),
  filePath: z.string(),
  importLine: z.string().optional(),
});

const FindingExplanationSchema = z.object({
  article: z.string(),
  penalty: z.string(),
  deadline: z.string(),
  business_impact: z.string(),
});

const FindingSchema = z.object({
  checkId: z.string(),
  type: z.enum(['pass', 'fail', 'skip', 'info']),
  message: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  file: z.string().optional(),
  line: z.number().optional(),
  obligationId: z.string().optional(),
  articleReference: z.string().optional(),
  fix: z.string().optional(),
  priority: z.number().optional(),
  confidence: z.number().optional(),
  confidenceLevel: z.string().optional(),
  evidence: z.array(EvidenceSchema).optional(),
  codeContext: CodeContextSchema.optional(),
  fixDiff: FixDiffSchema.optional(),
  explanation: FindingExplanationSchema.optional(),
});

// --- Score schemas ---

const CategoryScoreSchema = z.object({
  category: z.string(),
  weight: z.number(),
  score: z.number(),
  obligationCount: z.number(),
  passedCount: z.number(),
});

const ConfidenceSummarySchema = z.object({
  pass: z.number(),
  likelyPass: z.number(),
  uncertain: z.number(),
  likelyFail: z.number(),
  fail: z.number(),
  total: z.number(),
});

const ScoreBreakdownSchema = z.object({
  totalScore: z.number(),
  zone: z.enum(['red', 'yellow', 'green']),
  categoryScores: z.array(CategoryScoreSchema),
  criticalCapApplied: z.boolean(),
  totalChecks: z.number(),
  passedChecks: z.number(),
  failedChecks: z.number(),
  skippedChecks: z.number(),
  confidenceSummary: ConfidenceSummarySchema.optional(),
});

const RegulationVersionSchema = z.object({
  regulation: z.string(),
  version: z.string(),
  rulesVersion: z.string(),
  checkCount: z.number(),
  lastUpdated: z.string(),
});

// --- Filter context schema (V1-M08) ---

const ScanFilterContextSchema = z.object({
  role: z.enum(['provider', 'deployer', 'both']),
  riskLevel: z.string().nullable(),
  domain: z.string().nullable(),
  profileFound: z.boolean(),
  totalObligations: z.number(),
  applicableObligations: z.number(),
  skippedByRole: z.number(),
  skippedByRiskLevel: z.number(),
  skippedByDomain: z.number(),
});

// --- Top-level I/O schemas ---

const ScanResultSchema = z.object({
  score: ScoreBreakdownSchema,
  findings: z.array(FindingSchema),
  projectPath: z.string(),
  scannedAt: z.string(),
  duration: z.number(),
  filesScanned: z.number(),
  deepAnalysis: z.boolean().optional(),
  l5Cost: z.number().optional(),
  regulationVersion: RegulationVersionSchema.optional(),
  filterContext: ScanFilterContextSchema.optional(),
});

const EvidenceEntrySchema = z.object({
  evidence: EvidenceSchema,
  scanId: z.string(),
  chainPrev: z.string().nullable(),
  hash: z.string(),
  signature: z.string(),
});

const EvidenceChainSchema = z.object({
  version: z.literal('1.0.0'),
  projectPath: z.string(),
  entries: z.array(EvidenceEntrySchema),
  lastHash: z.string(),
});

// --- Eval Filter Context schemas (V1-M12) ---

export const EvalFilterContextSchema = z.object({
  role: z.enum(['provider', 'deployer', 'both']),
  riskLevel: z.string().nullable(),
  domain: z.string().nullable(),
  profileFound: z.boolean(),
  totalTests: z.number(),
  applicableTests: z.number(),
  skippedByRole: z.number(),
  skippedByRiskLevel: z.number(),
  skippedByDomain: z.number(),
});

export const EvalDisclaimerSchema = z.object({
  summary: z.string(),
  profileUsed: z.boolean(),
  testsRun: z.number(),
  testsSkipped: z.number(),
  severityWeighted: z.boolean(),
  limitations: z.array(z.string()),
});

// --- Fix Filter Context schemas (V1-M19) ---

export const FixFilterContextSchema = z.object({
  role: z.enum(['provider', 'deployer', 'both']),
  riskLevel: z.string().nullable(),
  domain: z.string().nullable(),
  profileFound: z.boolean(),
  totalPlans: z.number(),
  applicablePlans: z.number(),
  excludedBySkip: z.number(),
  excludedByDomain: z.number(),
});

// --- Score Transparency schemas (V1-M10) ---

export const ScoreDisclaimerSchema = z.object({
  summary: z.string(),
  coveredObligations: z.number(),
  totalApplicableObligations: z.number(),
  coveragePercent: z.number(),
  uncoveredCount: z.number(),
  limitations: z.array(z.string()),
  criticalCapExplanation: z.string().nullable(),
});

export const CategoryBreakdownSchema = z.object({
  category: z.string(),
  score: z.number(),
  weight: z.number(),
  passed: z.number(),
  failed: z.number(),
  impact: z.enum(['high', 'medium', 'low']),
  topFailures: z.array(z.string()),
  explanation: z.string(),
});

export const CompliancePostureSchema = z.object({
  score: ScoreBreakdownSchema,
  disclaimer: ScoreDisclaimerSchema,
  categories: z.array(CategoryBreakdownSchema),
  topActions: z.array(z.object({
    rank: z.number(),
    source: z.string(),
    id: z.string(),
    title: z.string(),
    severity: z.string(),
    fixAvailable: z.boolean(),
    command: z.string(),
    priorityScore: z.number(),
  }).passthrough()),
  profile: ScanFilterContextSchema.nullable(),
  lastScanAt: z.string().nullable(),
  passportCount: z.number(),
  documentCount: z.number(),
  evidenceVerified: z.boolean().nullable(),
});

// --- Parse functions (never throw) ---

export const parseScanResult = (json: string): ScanResult | null => {
  try {
    const result = ScanResultSchema.safeParse(JSON.parse(json));
    return result.success ? (result.data as ScanResult) : null;
  } catch {
    return null;
  }
};

export const parseEvidenceChain = (json: string): EvidenceChain | null => {
  try {
    const result = EvidenceChainSchema.safeParse(JSON.parse(json));
    return result.success ? (result.data as EvidenceChain) : null;
  } catch {
    return null;
  }
};
